from __future__ import annotations
from celery import shared_task
from django.utils import timezone
from api.models import BuildingProfile
from api.services.notification_service import analyze_forecast_and_notify
from api.services.forecast_ingestion import ingest_forecasts_for_active_regions
import random


@shared_task
def run_notification_analysis_task(simulate: bool = True, send: bool = False) -> dict:
    """Celery task that runs notification analysis across all buildings.

    - `simulate`: if True, generates deterministic synthetic forecast spikes for testing.
    - `send`: if True, attempts to send emails via configured dispatcher (requires API key).
    Returns a summary dict with number of events created.
    """
    now = timezone.now()
    total_created = 0

    for b in BuildingProfile.objects.all():
        if simulate:
            spike_hours = [6, 7, 8] if (b.id % 2 == 0) else [14, 15]
            forecast = []
            for h in range(24):
                ts = (now + timezone.timedelta(hours=h)).isoformat()
                ci = 100.0 + (random.random() * 20.0)
                if h in spike_hours:
                    ci += 150.0
                forecast.append({"timestamp": ts, "carbon_intensity": ci})
            events = analyze_forecast_and_notify(b, forecast, send_email=send)
            total_created += len(events)
        else:
            # Live ingestion path: integrate with forecast provider here.
            continue

    return {"created": total_created}


@shared_task
def ingest_hourly_carbon_forecasts_task() -> dict:
    """
    Hourly ESO forecast ingestion across active regions.
    Includes API-failure fallback to latest cached data.
    """
    return ingest_forecasts_for_active_regions()
