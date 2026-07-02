from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, time
from math import ceil
from statistics import median
from typing import Any, Dict, List, Optional

from django.core.exceptions import ValidationError
from django.utils import timezone
import logging

from api.models import BuildingProfile, CarbonForecast
from api.services.forecast_ingestion import ingest_region_forecast


logger = logging.getLogger(__name__)


DEVICE_POWER_KW: Dict[str, float] = {
    "ev_charger": 7.2,
    "washing_machine": 0.9,
    "dishwasher": 1.2,
    "hvac": 3.5,
    "water_heater": 2.5,
    "flexible_load": 1.5,
}

DEVICE_KEYWORDS: Dict[str, List[str]] = {
    "ev_charger": ["ev", "charger"],
    "washing_machine": ["washing", "washer", "laundry"],
    "dishwasher": ["dishwasher", "dish washer"],
    "hvac": ["hvac", "air", "chiller", "heat pump", "ahu", "ventilation"],
    "water_heater": ["water heater", "boiler", "geyser", "immersion"],
    "flexible_load": [],
}

FLEXIBILITY_WEIGHT: Dict[str, float] = {
    "low": 0.9,
    "medium": 1.0,
    "high": 1.1,
}


@dataclass
class CandidateWindow:
    start_time: datetime
    end_time: datetime
    avg_intensity: float
    slot_count: int
    score: float


def _resolve_building_for_user(user, building_id: Optional[int]) -> BuildingProfile:
    queryset = BuildingProfile.objects.filter(owner=user).order_by("id")
    if building_id is not None:
        building = queryset.filter(id=building_id).first()
        if building is None:
            raise ValidationError("Selected building was not found for this user.")
        return building

    building = queryset.first()
    if building is None:
        raise ValidationError("At least one building is required to generate an energy plan.")
    return building


def _target_day_window(now_local: datetime, earliest_start: time, latest_finish: time) -> tuple[datetime, datetime]:
    start_dt = now_local.replace(
        hour=earliest_start.hour,
        minute=earliest_start.minute,
        second=0,
        microsecond=0,
    )
    end_dt = now_local.replace(
        hour=latest_finish.hour,
        minute=latest_finish.minute,
        second=0,
        microsecond=0,
    )

    # If today's selected window has already elapsed, plan against the next day.
    if end_dt <= now_local:
        start_dt = start_dt + timedelta(days=1)
        end_dt = end_dt + timedelta(days=1)

    return start_dt, end_dt


def _interval_hours(forecasts: List[CarbonForecast]) -> float:
    if len(forecasts) < 2:
        return 0.5
    deltas = []
    for left, right in zip(forecasts, forecasts[1:]):
        delta_hours = (right.forecast_time - left.forecast_time).total_seconds() / 3600.0
        if delta_hours > 0:
            deltas.append(delta_hours)
    return median(deltas) if deltas else 0.5


def _window_band(avg_intensity: float) -> str:
    if avg_intensity < 100:
        return "green"
    if avg_intensity < 220:
        return "yellow"
    return "red"


def _format_time(dt: datetime) -> str:
    return dt.astimezone(timezone.get_current_timezone()).strftime("%H:%M")


def _compute_savings(power_kw: float, duration_hours: float, baseline_intensity: float, planned_intensity: float) -> float:
    delta = max(baseline_intensity - planned_intensity, 0.0)
    return round((power_kw * duration_hours * delta) / 1000.0, 3)


def device_matches_name(device_type: str, asset_name: str) -> bool:
    keywords = DEVICE_KEYWORDS.get(device_type, [])
    if not keywords:
        return True
    normalized = (asset_name or "").lower()
    return any(keyword in normalized for keyword in keywords)


def _candidate_windows(
    forecasts: List[CarbonForecast],
    slot_count: int,
    interval_hours: float,
    flexibility_level: str,
) -> List[CandidateWindow]:
    windows: List[CandidateWindow] = []
    now = timezone.now()
    total_points = len(forecasts)
    for index in range(0, total_points - slot_count + 1):
        slice_points = forecasts[index:index + slot_count]
        expected_end = slice_points[0].forecast_time + timedelta(hours=interval_hours * slot_count)
        actual_end = slice_points[-1].forecast_time + timedelta(hours=interval_hours)
        if actual_end < expected_end - timedelta(minutes=5):
            continue

        avg_intensity = sum(float(point.intensity_forecast) for point in slice_points) / slot_count
        lead_hours = max((slice_points[0].forecast_time - now).total_seconds() / 3600.0, 0.0)
        flexibility_multiplier = FLEXIBILITY_WEIGHT.get(flexibility_level, 1.0)
        score = avg_intensity - (lead_hours * 3.0 * flexibility_multiplier)
        windows.append(
            CandidateWindow(
                start_time=slice_points[0].forecast_time,
                end_time=actual_end,
                avg_intensity=round(avg_intensity, 2),
                slot_count=slot_count,
                score=round(score, 3),
            )
        )
    return windows


def _load_forecasts_for_window(building: BuildingProfile, window_start: datetime, window_end: datetime) -> List[CarbonForecast]:
    forecasts = list(
        CarbonForecast.objects.filter(
            region_id=building.grid_zone_id,
            forecast_time__gte=window_start,
            forecast_time__lte=window_end,
        ).order_by("forecast_time")
    )
    if forecasts:
        return forecasts

    logger.info(
        "Energy planner found no cached forecasts for building=%s region=%s window=%s..%s. Triggering on-demand ingestion.",
        building.id,
        building.grid_zone_id,
        window_start,
        window_end,
    )
    ingestion_result = ingest_region_forecast(str(building.grid_zone_id))
    logger.info(
        "Energy planner on-demand ingestion result for region=%s stored_points=%s used_fallback=%s error=%s",
        ingestion_result.region_id,
        ingestion_result.stored_points,
        ingestion_result.used_fallback,
        ingestion_result.error,
    )

    return list(
        CarbonForecast.objects.filter(
            region_id=building.grid_zone_id,
            forecast_time__gte=window_start,
            forecast_time__lte=window_end,
        ).order_by("forecast_time")
    )


def plan_green_energy_window(
    *,
    user,
    device_type: str,
    duration_hours: float,
    earliest_start: time,
    latest_finish: time,
    flexibility_level: str = "medium",
    building_id: Optional[int] = None,
) -> Dict[str, Any]:
    building = _resolve_building_for_user(user, building_id)
    if not building.grid_zone_id:
        raise ValidationError("Selected building has no mapped grid region.")

    now = timezone.localtime()
    window_start, window_end = _target_day_window(now, earliest_start, latest_finish)
    if window_end <= window_start:
        raise ValidationError("latest_finish must be after earliest_start.")

    forecasts = _load_forecasts_for_window(building, window_start, window_end)
    if not forecasts:
        raise ValidationError("No carbon forecast data available for the selected building and time window.")

    interval_hours = _interval_hours(forecasts)
    slot_count = max(1, ceil(duration_hours / interval_hours))
    candidates = _candidate_windows(
        forecasts=forecasts,
        slot_count=slot_count,
        interval_hours=interval_hours,
        flexibility_level=flexibility_level,
    )
    if not candidates:
        raise ValidationError("No valid forecast window can satisfy the requested duration and timing constraints.")

    sorted_by_score = sorted(candidates, key=lambda item: (item.score, item.start_time))
    best = sorted_by_score[0]
    baseline_window = min(candidates, key=lambda item: item.start_time)
    power_kw = DEVICE_POWER_KW.get(device_type, DEVICE_POWER_KW["flexible_load"])
    estimated_savings = _compute_savings(power_kw, duration_hours, baseline_window.avg_intensity, best.avg_intensity)

    alternatives = []
    for candidate in sorted_by_score[:4]:
        alternatives.append(
            {
                "start": _format_time(candidate.start_time),
                "end": _format_time(candidate.end_time),
                "carbon_intensity": candidate.avg_intensity,
                "band": _window_band(candidate.avg_intensity),
                "estimated_savings_kg": _compute_savings(
                    power_kw,
                    duration_hours,
                    baseline_window.avg_intensity,
                    candidate.avg_intensity,
                ),
            }
        )

    return {
        "building_id": building.id,
        "building_postcode": building.postcode,
        "device_type": device_type,
        "recommended_start": _format_time(best.start_time),
        "recommended_end": _format_time(best.end_time),
        "carbon_intensity": best.avg_intensity,
        "estimated_savings_kg": estimated_savings,
        "flexibility_level": flexibility_level,
        "alternatives": alternatives,
    }