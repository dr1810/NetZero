#!/usr/bin/env python
"""
Simplified Backend Testing Script for Phase 1
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from api.models import BuildingProfile, FlexibleAsset, CarbonPreference, CarbonForecast, ModulationEvent
from api.services.asset_scheduler import run_carbon_aware_scheduler

User = get_user_model()

print("="*60)
print("🧪 PHASE 1 BACKEND TESTING - SIMPLIFIED")
print("="*60)

# Clean up
print("\n🧹 Cleaning up...")
ModulationEvent.objects.filter(building__postcode="TEST123").delete()
FlexibleAsset.objects.filter(building__postcode="TEST123").delete()
CarbonPreference.objects.filter(building__postcode="TEST123").delete()
BuildingProfile.objects.filter(postcode="TEST123").delete()
CarbonForecast.objects.filter(region_id="999").delete()

# Create user
user, _ = User.objects.get_or_create(
    username="testuser",
    defaults={"email": "test@example.com", "is_active": True}
)

# Create building with minimal fields
print("\n🏢 Creating test building...")
building = BuildingProfile.objects.create(
    owner=user,
    postcode="TEST123",
    user_email="test@example.com",
    grid_zone_id="999"
)
print(f"✅ Building ID: {building.id}")

# Create carbon preference
print("\n⚙️ Creating carbon preference...")
preference = CarbonPreference.objects.create(
    building=building,
    carbon_intensity_threshold=300.0,
    daily_carbon_budget_kg=50.0,
    automation_enabled=True
)
print(f"✅ Threshold: {preference.carbon_intensity_threshold} gCO2/kWh")

# Create assets
print("\n⚡ Creating assets...")
assets_data = [
    ("EV Charger", 7.0, "FLEXIBLE"),
    ("HVAC System", 15.0, "FLEXIBLE"),
    ("Server Room", 20.0, "CRITICAL"),
    ("Lobby Lighting", 3.0, "SHEDDABLE")
]

for name, capacity, criticality in assets_data:
    asset = FlexibleAsset.objects.create(
        building=building,
        name=name,
        electrical_capacity_kw=capacity,
        criticality_classification=criticality,
        is_modulated_active=False
    )
    print(f"  ✅ {name} ({capacity} kW, {criticality})")

# Create high carbon forecast
print("\n📊 Creating test carbon forecasts (HIGH)...")
now = timezone.now()
for i in range(24):
    forecast_time = now + timedelta(hours=i)
    CarbonForecast.objects.update_or_create(
        region_id="999",
        forecast_time=forecast_time,
        defaults={
            "intensity_forecast": 450.0 + (i * 5.0),
            "source": "test"
        }
    )
print("✅ Created 24-hour forecast at ~450 gCO2/kWh")

# Test scheduler - DRY RUN
print("\n🎯 Testing scheduler (DRY RUN)...")
result = run_carbon_aware_scheduler(building.id, dry_run=True)
print(f"  Status: {result['status']}")
if result['status'] == 'dry_run':
    print(f"  ✅ Found {len(result['decisions'])} decisions:")
    for d in result['decisions']:
        print(f"    - {d['asset_name']}: {d['action']}")
        if d.get('estimated_carbon_saved'):
            print(f"      Saved: {d['estimated_carbon_saved']} kg CO₂")

# Test scheduler - LIVE
print("\n🚀 Testing scheduler (LIVE)...")
result = run_carbon_aware_scheduler(building.id, dry_run=False)
print(f"  Status: {result['status']}")
print(f"  Applied: {result.get('applied_count', 0)} modulations")

# Check asset states
print("\n  Asset states after modulation:")
for asset in FlexibleAsset.objects.filter(building=building):
    state = "MODULATED" if asset.is_modulated_active else "NORMAL"
    print(f"    - {asset.name}: {state}")

# Check events
events = ModulationEvent.objects.filter(building=building).order_by('-triggered_at')
print(f"\n  Modulation events: {events.count()}")
for event in events[:5]:
    print(f"    - {event.asset.name}: {event.action_type}")
    print(f"      Carbon: {event.carbon_intensity_at_time} > {event.carbon_threshold}")
    if event.estimated_carbon_saved_kg:
        print(f"      Saved: {event.estimated_carbon_saved_kg} kg CO₂")

# Test restoration (low carbon)
print("\n↩️  Testing restoration (LOW carbon)...")
for i in range(24):
    forecast_time = now + timedelta(hours=i)
    CarbonForecast.objects.update_or_create(
        region_id="999",
        forecast_time=forecast_time,
        defaults={
            "intensity_forecast": 180.0,
            "source": "test"
        }
    )

result = run_carbon_aware_scheduler(building.id, dry_run=False)
print(f"  Status: {result['status']}")
print(f"  Applied: {result.get('applied_count', 0)} restorations")

# Check if restored
modulated_count = FlexibleAsset.objects.filter(building=building, is_modulated_active=True).count()
if modulated_count == 0:
    print("  ✅ All assets restored to normal")
else:
    print(f"  ⚠️ {modulated_count} assets still modulated")

# Summary
print("\n" + "="*60)
print("📊 SUMMARY")
print("="*60)
print(f"  Buildings: {BuildingProfile.objects.count()}")
print(f"  Assets: {FlexibleAsset.objects.count()}")
print(f"  Modulation Events: {ModulationEvent.objects.count()}")

recent = ModulationEvent.objects.order_by('-triggered_at')[:5]
if recent:
    print("\n  Recent events:")
    for e in recent:
        print(f"    - {e.action_type}: {e.asset.name}")

print("\n✅ Backend testing complete!")
print("\n💡 Ready to build frontend dashboard")
