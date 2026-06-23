from django.core.management.base import BaseCommand
from api.models import BuildingProfile
from api.services.notification_service import analyze_forecast_and_notify
from django.utils import timezone
import random


def _generate_simulated_forecast(start_dt, hours=24, base=100.0, spike_hours=None):
    points = []
    for h in range(hours):
        ts = (start_dt + timezone.timedelta(hours=h)).isoformat()
        ci = base + (random.random() * 20.0)
        if spike_hours and h in spike_hours:
            ci += 150.0
        points.append({"timestamp": ts, "carbon_intensity": ci})
    return points


class Command(BaseCommand):
    help = "Runs forecast analysis for all buildings and triggers notifications. Use --simulate to run synthetic forecasts."

    def add_arguments(self, parser):
        parser.add_argument("--simulate", action="store_true", help="Use simulated forecasts instead of live API calls")
        parser.add_argument("--send", action="store_true", help="Actually send emails (otherwise delivery is recorded as attempted but dispatcher may no-op if no API key)")

    def handle(self, *args, **options):
        simulate = options.get("simulate")
        send = options.get("send")

        buildings = BuildingProfile.objects.all()
        if not buildings.exists():
            self.stdout.write("No buildings found.")
            return

        now = timezone.now()
        total_events = 0
        for b in buildings:
            self.stdout.write(f"Analyzing building {b.id} ({b.postcode})...")
            if simulate:
                # pick a deterministic spike window per building id for testing
                spike_hours = [6, 7, 8] if (b.id % 2 == 0) else [14, 15]
                forecast = _generate_simulated_forecast(now, hours=24, base=100.0, spike_hours=spike_hours)
                events = analyze_forecast_and_notify(b, forecast, send_email=send)
                total_events += len(events)
                self.stdout.write(f"  Created {len(events)} notification events (simulated).")
            else:
                # Live integration not implemented: instruct user how to extend.
                self.stdout.write("  Live forecast ingestion not implemented; use --simulate for testing.")

        self.stdout.write(f"Completed. Total events created: {total_events}")
