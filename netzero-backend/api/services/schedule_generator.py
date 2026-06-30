from __future__ import annotations

from datetime import timedelta
from typing import Dict, Any, List

from django.utils import timezone

from ..models import BuildingProfile, CarbonForecast, OperationalSchedule
from .ml_inference import run_thermodynamic_inference, generate_mock_schedule


def _normalize_weights(
    carbon_weight: float,
    cost_weight: float,
    comfort_weight: float,
) -> Dict[str, float]:
    total = max(carbon_weight + cost_weight + comfort_weight, 0.001)
    return {
        "carbon_weight": carbon_weight / total,
        "cost_weight": cost_weight / total,
        "comfort_weight": comfort_weight / total,
    }


def _demand_factor_for_hour(hour_value: int) -> float:
    if 6 <= hour_value <= 9:
        return 1.2
    if 17 <= hour_value <= 21:
        return 1.15
    if 0 <= hour_value <= 5:
        return 0.75
    return 1.0


def _band_for_score(score: float) -> str:
    if score < 0.34:
        return "LOW"
    if score < 0.67:
        return "MEDIUM"
    return "HIGH"


def generate_schedule_for_building(
    building: BuildingProfile,
    carbon_weight: float = 0.5,
    cost_weight: float = 0.3,
    comfort_weight: float = 0.2,
) -> Dict[str, Any]:
    """
    Generate a 24-hour optimized schedule using:
    - Forecast-based pre-scheduling (CarbonForecast)
    - ML demand prediction (heating + cooling inference)
    - Cost vs carbon tradeoff optimization
    - User preference weighting (carbon/cost/comfort)
    """
    heating, cooling = run_thermodynamic_inference(building)
    base_demand_kw = max(float(heating) + float(cooling), 0.1)
    now = timezone.now()

    forecasts = list(
        CarbonForecast.objects.filter(
            region_id=building.grid_zone_id,
            forecast_time__gte=now,
            forecast_time__lte=now + timedelta(hours=24),
        ).order_by("forecast_time")
    ) if building.grid_zone_id else []

    if not forecasts:
        windows = generate_mock_schedule()
        schedule = {
            "generated_at": now.isoformat(),
            "building_id": building.id,
            "predicted_heating_load": heating,
            "predicted_cooling_load": cooling,
            "weights": _normalize_weights(carbon_weight, cost_weight, comfort_weight),
            "optimization_mode": "fallback_mock_windows",
            "windows": windows,
            "hourly_plan": [],
        }
        OperationalSchedule.objects.update_or_create(
            building=building,
            defaults={
                "schedule_json": schedule,
                "recommendation_text": "Auto-generated schedule (fallback mock windows)",
            },
        )
        return schedule

    intensities = [float(f.intensity_forecast) for f in forecasts]
    min_intensity = min(intensities)
    max_intensity = max(intensities)
    span_intensity = max(max_intensity - min_intensity, 1.0)
    weights = _normalize_weights(carbon_weight, cost_weight, comfort_weight)
    comfort_penalty_scale = 0.2

    hourly_plan: List[Dict[str, Any]] = []
    window_buckets = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}

    for f in forecasts:
        hour_value = f.forecast_time.hour
        demand_factor = _demand_factor_for_hour(hour_value)
        predicted_demand_kw = round(base_demand_kw * demand_factor, 3)

        normalized_carbon = (float(f.intensity_forecast) - min_intensity) / span_intensity
        normalized_cost = normalized_carbon  # proxy when tariff feed is unavailable
        comfort_penalty = max(demand_factor - 1.0, 0.0) * comfort_penalty_scale

        score = (
            weights["carbon_weight"] * normalized_carbon
            + weights["cost_weight"] * normalized_cost
            + weights["comfort_weight"] * comfort_penalty
        )
        level = _band_for_score(score)
        window_buckets[level] += 1

        hourly_plan.append(
            {
                "timestamp": f.forecast_time.isoformat(),
                "forecast_intensity": round(float(f.intensity_forecast), 2),
                "predicted_demand_kw": predicted_demand_kw,
                "score": round(score, 4),
                "window_level": level,
                "recommended_action": (
                    "DEFER_FLEXIBLE_LOADS" if level == "HIGH"
                    else "RUN_FLEXIBLE_LOADS" if level == "LOW"
                    else "NORMAL_OPERATION"
                ),
            }
        )

    schedule = {
        "generated_at": now.isoformat(),
        "building_id": building.id,
        "predicted_heating_load": heating,
        "predicted_cooling_load": cooling,
        "predicted_total_demand_kw": round(base_demand_kw, 3),
        "weights": weights,
        "optimization_mode": "forecast_ml_tradeoff",
        "summary": {
            "low_hours": window_buckets["LOW"],
            "medium_hours": window_buckets["MEDIUM"],
            "high_hours": window_buckets["HIGH"],
        },
        "windows": {
            "00:00-08:00": "LOW" if window_buckets["LOW"] >= 3 else "MEDIUM",
            "08:00-18:00": "HIGH" if window_buckets["HIGH"] >= 4 else "MEDIUM",
            "18:00-24:00": "LOW" if window_buckets["LOW"] >= 2 else "MEDIUM",
        },
        "hourly_plan": hourly_plan,
    }

    OperationalSchedule.objects.update_or_create(
        building=building,
        defaults={
            "schedule_json": schedule,
            "recommendation_text": "Auto-generated schedule (forecast + ML + weighted optimization)",
        },
    )

    return schedule
