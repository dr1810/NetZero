import logging
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional

import requests
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from api.models import BuildingProfile, CarbonForecast

logger = logging.getLogger(__name__)


@dataclass
class RegionIngestionResult:
    region_id: str
    stored_points: int
    used_fallback: bool
    error: Optional[str] = None


def _fetch_region_forecast_payload(
    region_id: str,
    timeout: float = 8.0,
    http_client=requests,
) -> List[dict]:
    from_ts = timezone.now().replace(minute=0, second=0, microsecond=0).strftime("%Y-%m-%dT%H:%MZ")
    endpoint = f"https://api.carbonintensity.org.uk/regional/intensity/{from_ts}/fw24h/regionid/{region_id}"

    response = http_client.get(endpoint, timeout=timeout)
    response.raise_for_status()
    payload = response.json()

    data = payload.get("data") or []
    if not data:
        return []
    return data[0].get("data") or []


def _store_forecast_points(region_id: str, points: Iterable[dict], source: str) -> int:
    stored = 0
    for point in points:
        forecast_time = parse_datetime(point.get("from"))
        if forecast_time is None:
            continue
        if timezone.is_naive(forecast_time):
            forecast_time = timezone.make_aware(forecast_time, timezone.get_current_timezone())

        intensity = (point.get("intensity") or {}).get("forecast")
        if intensity is None:
            continue

        CarbonForecast.objects.update_or_create(
            region_id=str(region_id),
            forecast_time=forecast_time,
            defaults={
                "intensity_forecast": float(intensity),
                "generation_mix": point.get("generationmix") or [],
                "source": source,
                "fetched_at": timezone.now(),
                "raw_payload": point,
            },
        )
        stored += 1
    return stored


def _fallback_from_cached_forecast(region_id: str) -> int:
    cached = list(
        CarbonForecast.objects.filter(region_id=str(region_id))
        .order_by("-forecast_time")[:24]
    )
    if not cached:
        return 0

    now = timezone.now()
    for row in cached:
        CarbonForecast.objects.update_or_create(
            region_id=row.region_id,
            forecast_time=row.forecast_time,
            defaults={
                "intensity_forecast": row.intensity_forecast,
                "generation_mix": row.generation_mix,
                "source": "fallback_cache",
                "fetched_at": now,
                "raw_payload": row.raw_payload,
            },
        )
    return len(cached)


def ingest_region_forecast(region_id: str, timeout: float = 8.0, http_client=requests) -> RegionIngestionResult:
    try:
        points = _fetch_region_forecast_payload(region_id=region_id, timeout=timeout, http_client=http_client)
        stored = _store_forecast_points(region_id=region_id, points=points, source="national_grid_eso")
        return RegionIngestionResult(region_id=str(region_id), stored_points=stored, used_fallback=False)
    except requests.RequestException as exc:
        logger.exception("Forecast API request failed for region_id=%s", region_id)
        fallback_rows = _fallback_from_cached_forecast(region_id)
        return RegionIngestionResult(
            region_id=str(region_id),
            stored_points=fallback_rows,
            used_fallback=True,
            error=str(exc),
        )
    except (TypeError, ValueError, KeyError) as exc:
        logger.exception("Forecast API payload parse failed for region_id=%s", region_id)
        fallback_rows = _fallback_from_cached_forecast(region_id)
        return RegionIngestionResult(
            region_id=str(region_id),
            stored_points=fallback_rows,
            used_fallback=True,
            error=str(exc),
        )


def _resolve_target_region_ids() -> List[str]:
    assigned = (
        BuildingProfile.objects.exclude(grid_zone_id__isnull=True)
        .exclude(grid_zone_id__exact="")
        .values_list("grid_zone_id", flat=True)
        .distinct()
    )
    region_ids = [str(region_id) for region_id in assigned if str(region_id).isdigit()]
    if region_ids:
        return region_ids
    return [str(i) for i in range(1, 15)]


def ingest_forecasts_for_active_regions() -> Dict[str, object]:
    region_ids = _resolve_target_region_ids()
    results = [ingest_region_forecast(region_id=region_id) for region_id in region_ids]
    return {
        "regions": region_ids,
        "successful_regions": len([r for r in results if not r.error]),
        "fallback_regions": len([r for r in results if r.used_fallback]),
        "stored_points": sum(r.stored_points for r in results),
        "errors": {r.region_id: r.error for r in results if r.error},
    }
