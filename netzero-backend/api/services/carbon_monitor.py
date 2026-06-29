"""
Carbon Intensity Monitoring Service

Fetches real-time and forecasted carbon intensity data from National Grid ESO API.
Provides caching and fallback mechanisms for reliability.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import requests
from django.utils import timezone
from django.core.cache import cache

logger = logging.getLogger(__name__)

ESO_BASE_URL = "https://api.carbonintensity.org.uk"
CACHE_TIMEOUT = 300  # 5 minutes


def get_current_carbon_intensity(region_id: str) -> Optional[Dict[str, Any]]:
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
    cache_key = f"carbon_intensity_current_{region_id}"
    cached = cache.get(cache_key)
    if cached:
        logger.info(f"Cache hit for current carbon intensity: {region_id}")
        return cached
    
    try:
        url = f"{ESO_BASE_URL}/regional/intensity/regionid/{region_id}"
        logger.info(f"Fetching current carbon intensity: {url}")
        
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if not data.get("data"):
            logger.warning(f"No data returned for region {region_id}")
            return _fallback_to_stored_forecast(region_id)
        
        region_data = data["data"][0]
        intensity_data = region_data["data"][0]["intensity"]
        
        result = {
            "intensity": float(intensity_data["forecast"]),
            "timestamp": timezone.now(),
            "index": intensity_data["index"],
            "region_id": region_id,
            "source": "eso_realtime"
        }
        
        cache.set(cache_key, result, CACHE_TIMEOUT)
        logger.info(f"Current carbon intensity for {region_id}: {result['intensity']} gCO2/kWh")
        return result
        
    except requests.RequestException as e:
        logger.error(f"API request failed for region {region_id}: {e}")
        return _fallback_to_stored_forecast(region_id)
    except (KeyError, ValueError, IndexError) as e:
        logger.error(f"Failed to parse API response for region {region_id}: {e}")
        return _fallback_to_stored_forecast(region_id)


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
                "source": "stored_forecast"
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
        
        if not building.grid_zone_id:
            logger.warning(f"Building {building_id} has no grid_zone_id")
            return False, None
        
        current = get_current_carbon_intensity(building.grid_zone_id)
        if not current:
            logger.warning(f"Could not get carbon intensity for building {building_id}")
            return False, None
        
        threshold = building.carbon_preference.carbon_intensity_threshold
        should_modulate = current["intensity"] > threshold
        
        carbon_data = {
            "current_intensity": current["intensity"],
            "threshold": threshold,
            "index": current["index"],
            "region_id": current["region_id"],
            "timestamp": current["timestamp"],
            "source": current["source"]
        }
        
        logger.info(
            f"Building {building_id}: intensity={current['intensity']:.1f}, "
            f"threshold={threshold:.1f}, should_modulate={should_modulate}"
        )
        
        return should_modulate, carbon_data
        
    except Exception as e:
        logger.error(f"Failed to check modulation trigger for building {building_id}: {e}")
        return False, None
