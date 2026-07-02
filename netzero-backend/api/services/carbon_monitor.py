"""
Carbon Intensity Monitoring Service

Fetches real-time and forecasted carbon intensity data from National Grid ESO API.
Provides caching and fallback mechanisms for reliability.
"""
import logging
import os
from datetime import timedelta
from typing import Optional, Dict, Any, List
import requests
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.core.cache import cache
from api.services.postcode_region import normalize_postcode, extract_outward_code

logger = logging.getLogger(__name__)

ESO_BASE_URL = "https://api.carbonintensity.org.uk"
CACHE_TIMEOUT = 300  # 5 minutes


def _carbon_debug_enabled() -> bool:
    return os.getenv("NETZERO_CARBON_DEBUG", "false").strip().lower() in {"1", "true", "yes", "on"}


def _carbon_debug(message: str, *args: Any) -> None:
    if _carbon_debug_enabled():
        logger.info(message, *args)


def _normalize_postcode_compact(postcode: str) -> str:
    normalized = normalize_postcode(postcode)
    return normalized.replace(" ", "")


def _postcode_candidates(postcode: str) -> List[str]:
    full = _normalize_postcode_compact(postcode)
    outward = extract_outward_code(postcode).replace(" ", "")
    candidates = [full]
    if outward and outward not in candidates:
        candidates.append(outward)
    return [candidate for candidate in candidates if candidate]


def _extract_regional_points(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract regional data points from postcode/regional Carbon Intensity payloads."""
    raw_data = payload.get("data")

    if isinstance(raw_data, dict):
        points = raw_data.get("data")
        return [p for p in points if isinstance(p, dict)] if isinstance(points, list) else []

    if isinstance(raw_data, list) and raw_data:
        first = raw_data[0]
        if isinstance(first, dict):
            nested = first.get("data")
            if isinstance(nested, list):
                return [p for p in nested if isinstance(p, dict)]
        return [p for p in raw_data if isinstance(p, dict)]

    return []


def _extract_national_points(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    raw_data = payload.get("data")
    if not isinstance(raw_data, list):
        return []
    return [p for p in raw_data if isinstance(p, dict)]


def _request_json(url: str, timeout: float = 10.0) -> Optional[Dict[str, Any]]:
    _carbon_debug("Carbon API request URL: %s", url)
    try:
        response = requests.get(url, timeout=timeout)
        status_code = getattr(response, "status_code", None)
        if isinstance(status_code, int) and status_code >= 400:
            logger.warning(
                "Carbon API non-2xx response url=%s status=%s body=%s",
                url,
                status_code,
                (response.text or "")[:2000],
            )
            response.raise_for_status()
        payload = response.json() or {}
        _carbon_debug("Carbon API raw payload url=%s payload=%s", url, str(payload)[:2000])
        return payload
    except requests.RequestException as exc:
        body = ""
        status_code = "unknown"
        if getattr(exc, "response", None) is not None:
            status_code = getattr(exc.response, "status_code", "unknown")
            body = (getattr(exc.response, "text", "") or "")[:2000]
        logger.warning(
            "Carbon API request failed url=%s status=%s error=%s body=%s",
            url,
            status_code,
            exc,
            body,
        )
        return None
    except (TypeError, ValueError) as exc:
        logger.warning("Carbon API response parsing failed url=%s error=%s", url, exc)
        return None


def _extract_intensity_fields(point: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    intensity = point.get("intensity") or {}
    actual = intensity.get("actual")
    forecast = intensity.get("forecast")
    value = actual if actual is not None else forecast
    if value is None:
        return None

    parsed_timestamp = parse_datetime(str(point.get("from") or ""))
    if parsed_timestamp is None:
        parsed_timestamp = timezone.now()
    elif timezone.is_naive(parsed_timestamp):
        parsed_timestamp = timezone.make_aware(parsed_timestamp, timezone.get_current_timezone())

    return {
        "intensity": float(value),
        "index": intensity.get("index") or _classify_intensity(float(value)),
        "timestamp": parsed_timestamp,
    }


def _get_current_generation_mix(postcode: str) -> List[Dict[str, Any]]:
    postcode_key = _normalize_postcode_compact(postcode)
    cache_key = f"carbon_intensity_generation_mix_postcode_{postcode_key}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    for postcode_candidate in _postcode_candidates(postcode):
        regional_url = f"{ESO_BASE_URL}/regional/postcode/{postcode_candidate}"
        payload = _request_json(regional_url)
        points = _extract_regional_points(payload or {})
        if points:
            regional_mix = _normalize_generation_mix(points[0].get("generationmix") or [])
            if regional_mix:
                cache.set(cache_key, regional_mix, CACHE_TIMEOUT)
                return regional_mix

    # Fallback endpoint explicitly requested by user.
    national_generation_url = f"{ESO_BASE_URL}/generation"
    national_payload = _request_json(national_generation_url)
    national_points = _extract_national_points(national_payload or {})
    if not national_points:
        return []
    national_mix = _normalize_generation_mix(national_points[0].get("generationmix") or [])
    cache.set(cache_key, national_mix, CACHE_TIMEOUT)
    return national_mix


def _normalize_generation_mix(generation_mix: Any) -> List[Dict[str, Any]]:
    if not isinstance(generation_mix, list):
        return []
    normalized: List[Dict[str, Any]] = []
    for item in generation_mix:
        if not isinstance(item, dict):
            continue
        fuel = str(item.get("fuel") or "").strip().lower()
        perc = item.get("perc")
        try:
            perc_value = float(perc)
        except (TypeError, ValueError):
            continue
        if not fuel:
            continue
        normalized.append({"fuel": fuel, "perc": perc_value})
    return normalized


def _compute_generation_summary(generation_mix: List[Dict[str, Any]]) -> Dict[str, Any]:
    fuel_pct = {entry["fuel"]: float(entry["perc"]) for entry in generation_mix}
    renewable_fuels = {
        "wind",
        "solar",
        "hydro",
        "biomass",
        "other",
    }
    fossil_fuels = {
        "coal",
        "gas",
        "oil",
    }
    renewable_share = sum(fuel_pct.get(fuel, 0.0) for fuel in renewable_fuels)
    fossil_share = sum(fuel_pct.get(fuel, 0.0) for fuel in fossil_fuels)
    green_score = min(max(round(renewable_share), 0), 100)
    if green_score >= 80:
        green_band = "excellent"
    elif green_score >= 60:
        green_band = "good"
    elif green_score >= 40:
        green_band = "moderate"
    else:
        green_band = "poor"

    return {
        "generation_mix": generation_mix,
        "fuel_percentages": fuel_pct,
        "renewable_share": round(renewable_share, 2),
        "fossil_share": round(fossil_share, 2),
        "green_score": green_score,
        "green_score_band": green_band,
    }


def get_current_carbon_intensity(region_id: Optional[str] = None, postcode: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Fetch current carbon intensity for a given region.
    
    Returns dict with keys:
        - intensity: float (gCO2/kWh)
        - timestamp: datetime
        - index: str (very low/low/moderate/high/very high)
        - region_id: str
        - source: str
    
    Returns None on failure.
    """
    normalized_postcode = _normalize_postcode_compact(postcode) if postcode else ""
    cache_key = (
        f"carbon_intensity_current_postcode_{normalized_postcode}"
        if normalized_postcode
        else f"carbon_intensity_current_region_{region_id or 'unknown'}"
    )
    cached = cache.get(cache_key)
    if cached is not None:
        _carbon_debug("Carbon intensity cache hit key=%s value=%s", cache_key, cached)
        return cached
    
    try:
        if normalized_postcode:
            for postcode_candidate in _postcode_candidates(normalized_postcode):
                regional_url = f"{ESO_BASE_URL}/regional/postcode/{postcode_candidate}"
                payload = _request_json(regional_url)
                if payload:
                    points = _extract_regional_points(payload)
                    if points:
                        parsed = _extract_intensity_fields(points[0])
                        if parsed is not None:
                            data_container = payload.get("data")
                            resolved_region = str(region_id or "")
                            if isinstance(data_container, list) and data_container and isinstance(data_container[0], dict):
                                resolved_region = str(data_container[0].get("regionid") or data_container[0].get("regionId") or resolved_region)

                            generation_mix = _normalize_generation_mix(points[0].get("generationmix") or [])
                            if not generation_mix:
                                generation_mix = _get_current_generation_mix(normalized_postcode)

                            result = {
                                "intensity": parsed["intensity"],
                                "timestamp": parsed["timestamp"],
                                "index": parsed["index"],
                                "region_id": resolved_region or "UNKNOWN",
                                "source": "eso_regional_postcode",
                            }
                            result.update(_compute_generation_summary(generation_mix))
                            _carbon_debug(
                                "Parsed postcode carbon intensity postcode=%s candidate=%s region=%s intensity=%s",
                                normalized_postcode,
                                postcode_candidate,
                                result["region_id"],
                                result["intensity"],
                            )
                            cache.set(cache_key, result, CACHE_TIMEOUT)
                            return result

        # Explicit fallback endpoint requested by user.
        national_url = f"{ESO_BASE_URL}/intensity"
        national_payload = _request_json(national_url)
        if national_payload:
            national_points = _extract_national_points(national_payload)
            if national_points:
                parsed_national = _extract_intensity_fields(national_points[0])
                if parsed_national is not None:
                    generation_mix = _get_current_generation_mix(normalized_postcode) if normalized_postcode else []
                    result = {
                        "intensity": parsed_national["intensity"],
                        "timestamp": parsed_national["timestamp"],
                        "index": parsed_national["index"],
                        "region_id": str(region_id or "NATIONAL"),
                        "source": "eso_national",
                    }
                    result.update(_compute_generation_summary(generation_mix))
                    cache.set(cache_key, result, CACHE_TIMEOUT)
                    _carbon_debug("Parsed national carbon intensity fallback intensity=%s", result["intensity"])
                    return result

        if region_id:
            logger.warning("No live API payload available for postcode=%s region=%s. Falling back to stored forecast.", normalized_postcode, region_id)
            return _fallback_to_stored_forecast(region_id)
        logger.warning("No live API payload and no region fallback available for postcode=%s", normalized_postcode)
        return None
        
    except requests.RequestException as e:
        logger.error(f"API request failed for postcode={normalized_postcode} region={region_id}: {e}")
        return _fallback_to_stored_forecast(region_id) if region_id else None
    except (KeyError, ValueError, IndexError) as e:
        logger.error(f"Failed to parse API response for postcode={normalized_postcode} region={region_id}: {e}")
        return _fallback_to_stored_forecast(region_id) if region_id else None


def _fallback_to_stored_forecast(region_id: str) -> Optional[Dict[str, Any]]:
    """
    Fallback: use most recent CarbonForecast entry for this region.
    """
    from api.models import CarbonForecast
    
    try:
        now = timezone.now()
        
        # Find closest forecast to current time
        forecast = CarbonForecast.objects.filter(
            region_id=region_id,
            forecast_time__gte=now - timedelta(hours=1),
            forecast_time__lte=now + timedelta(hours=1)
        ).order_by('forecast_time').first()
        
        if not forecast:
            # Try getting most recent forecast
            forecast = CarbonForecast.objects.filter(
                region_id=region_id
            ).order_by('-forecast_time').first()
        
        if forecast:
            logger.info(f"Using stored forecast as fallback for {region_id}")
            return {
                "intensity": forecast.intensity_forecast,
                "timestamp": forecast.forecast_time,
                "index": _classify_intensity(forecast.intensity_forecast),
                "region_id": region_id,
                "source": "stored_forecast",
                **_compute_generation_summary(_normalize_generation_mix(forecast.generation_mix)),
            }
        
        logger.warning(f"No stored forecast available for region {region_id}")
        return None
        
    except Exception as e:
        logger.error(f"Fallback failed for region {region_id}: {e}")
        return None


def _classify_intensity(intensity: float) -> str:
    """
    Classify carbon intensity into index bands.
    Based on National Grid ESO classifications.
    """
    if intensity < 100:
        return "very low"
    elif intensity < 200:
        return "low"
    elif intensity < 300:
        return "moderate"
    elif intensity < 400:
        return "high"
    else:
        return "very high"


def get_forecast_for_building(building_id: int, hours_ahead: int = 24) -> List[Dict[str, Any]]:
    """
    Get carbon intensity forecast for a building's region.
    
    Args:
        building_id: BuildingProfile ID
        hours_ahead: Number of hours to forecast (default 24)
    
    Returns:
        List of forecast dicts with intensity, timestamp, region_id
    """
    from api.models import BuildingProfile, CarbonForecast
    
    try:
        building = BuildingProfile.objects.get(id=building_id)
        if not building.grid_zone_id:
            logger.warning(f"Building {building_id} has no grid_zone_id")
            return []
        
        now = timezone.now()
        end_time = now + timedelta(hours=hours_ahead)
        
        forecasts = CarbonForecast.objects.filter(
            region_id=building.grid_zone_id,
            forecast_time__gte=now,
            forecast_time__lte=end_time
        ).order_by('forecast_time')
        
        return [
            {
                "intensity": f.intensity_forecast,
                "timestamp": f.forecast_time,
                "region_id": f.region_id,
                "source": f.source
            }
            for f in forecasts
        ]
        
    except Exception as e:
        logger.error(f"Failed to get forecast for building {building_id}: {e}")
        return []


def should_trigger_modulation(building_id: int) -> tuple[bool, Optional[Dict[str, Any]]]:
    """
    Check if a building should trigger carbon-aware modulation.
    
    Returns:
        (should_modulate, carbon_data)
        - should_modulate: bool
        - carbon_data: dict with current intensity and threshold info, or None
    """
    from api.models import BuildingProfile
    
    try:
        building = BuildingProfile.objects.select_related('carbon_preference').get(id=building_id)
        
        if not hasattr(building, 'carbon_preference'):
            logger.debug(f"Building {building_id} has no carbon preference configured")
            return False, None
        
        if not building.carbon_preference.automation_enabled:
            logger.debug(f"Building {building_id} has automation disabled")
            return False, None
        
        if not building.postcode:
            logger.warning(f"Building {building_id} has no postcode")
            return False, None
        
        current = get_current_carbon_intensity(region_id=building.grid_zone_id, postcode=building.postcode)
        _carbon_debug(
            "Carbon service output for building %s (postcode=%s region=%s): %s",
            building_id,
            building.postcode,
            building.grid_zone_id,
            current,
        )
        if not current:
            logger.warning(f"Could not get carbon intensity for building {building_id}")
            return False, None
        
        raw_threshold = float(building.carbon_preference.carbon_intensity_threshold)
        threshold = min(max(raw_threshold, 50.0), 500.0)
        should_modulate = current["intensity"] > threshold
        
        carbon_data = {
            "current_intensity": current["intensity"],
            "threshold": threshold,
            "index": current["index"],
            "region_id": current["region_id"],
            "timestamp": current["timestamp"],
            "source": current["source"],
            "generation_mix": current.get("generation_mix", []),
            "fuel_percentages": current.get("fuel_percentages", {}),
            "renewable_share": current.get("renewable_share", 0.0),
            "fossil_share": current.get("fossil_share", 0.0),
            "green_score": current.get("green_score", 0),
            "green_score_band": current.get("green_score_band", "poor"),
        }
        
        logger.info(
            f"Building {building_id}: intensity={current['intensity']:.1f}, "
            f"threshold={threshold:.1f}, should_modulate={should_modulate}"
        )
        
        return should_modulate, carbon_data
        
    except Exception as e:
        logger.error(f"Failed to check modulation trigger for building {building_id}: {e}")
        return False, None
