from typing import Dict, Any
from ..models import BuildingProfile, OperationalSchedule
from .ml_inference import run_thermodynamic_inference, generate_mock_schedule
import datetime


def generate_schedule_for_building(building: BuildingProfile) -> Dict[str, Any]:
    """Generate a simple 24-hour schedule by merging ML predictions and a mock carbon-aware window.

    This is an MVP function that returns a dict suitable for storing in OperationalSchedule.schedule_json.
    """
    # Get ML-predicted loads
    heating, cooling = run_thermodynamic_inference(building)

    # Mock schedule windows (reuse existing helper)
    windows = generate_mock_schedule()

    now = datetime.datetime.utcnow().isoformat() + "Z"

    schedule = {
        "generated_at": now,
        "building_id": building.id,
        "predicted_heating_load": heating,
        "predicted_cooling_load": cooling,
        "windows": windows,
    }

    # Persist or update OperationalSchedule
    obj, created = OperationalSchedule.objects.update_or_create(
        building=building,
        defaults={
            "schedule_json": schedule,
            "recommendation_text": "Auto-generated schedule (MVP)",
        },
    )

    return schedule
