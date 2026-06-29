#!/usr/bin/env python
"""
Phase 1 Backend Testing - Using Existing Building
"""
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.utils import timezone
from datetime import timedelta
from api.models import BuildingProfile, FlexibleAsset, CarbonPreference, CarbonForecast, ModulationEvent
from api.services.asset_scheduler import run_carbon_aware_scheduler

print("="*60)
print("🧪 PHASE 1 BACKEND TESTING")
print("="*60)

# Get first building or show instructions
building = BuildingProfile.objects.first()
if not building:
    print("\n❌ No buildings found!")
    print("\n💡 Please create a building via:")
    print("   1. Frontend (http://localhost:3000)")
    print("   2. Django admin (http://localhost:8000/admin)")
    print("   3. API endpoint (POST /api/buildings/)")
    sys.exit(1)

print(f"\n🏢 Using building: ID={building.id}, Postcode={building.postcode}")

# Ensure carbon preference exists
preference, created = CarbonPreference.objects.get_or_create(
    building=building,
    defaults={
        "carbon_intensity_threshold": 300.0,
        "daily_carbon_budget_kg": 50.0,
        "automation_enabled": True
    }
)
if created:
    print(f"✅ Created carbon preference: Threshold={preference.carbon_intensity_threshold} gCO2/kWh")
else:
    print(f"✅ Using existing preference: Threshold={preference.carbon_intensity_threshold} gCO2/kWh")

# Check/create assets
assets = FlexibleAsset.objects.filter(building=building)
if not assets.exists():
    print("\n⚡ Creating test assets...")
    for name, capacity, criticality in [
        ("EV Charger", 7.0, "FLEXIBLE"),
        ("HVAC System", 15.0, "FLEXIBLE"),
        ("Server Room", 20.0, "CRITICAL"),
        ("Lobby Lighting", 3.0, "SHEDDABLE")
    ]:
        FlexibleAsset.objects.create(
            building=building,
            name=name,
            electrical_capacity_kw=capacity,
            criticality_classification=criticality,
            is_modulated_active=False
        )
        print(f"  ✅ {name} ({capacity} kW, {criticality})")
    assets = FlexibleAsset.objects.filter(building=building)
else:
    print(f"\n⚡ Found {assets.count()} existing assets:")
    for asset in assets:
        print(f"  - {asset.name} ({asset.electrical_capacity_kw} kW, {asset.criticality_classification})")

# Create HIGH carbon forecast
print("\n📊 Creating HIGH carbon intensity forecast...")
now = timezone.now()
region = building.grid_zone_id or "10"  # Default to region 10 if none set
for i in range(24):
    CarbonForecast.objects.update_or_create(
        region_id=region,
        forecast_time=now + timedelta(hours=i),
        defaults={"intensity_forecast": 450.0, "source": "test"}
    )
print(f"✅ Created forecast at 450 gCO2/kWh for region {region}")

# Test DRY RUN
print("\n🎯 Testing scheduler (DRY RUN)...")
result = run_carbon_aware_scheduler(building.id, dry_run=True)
if result['status'] == 'dry_run':
    print(f"  ✅ Found {len(result['decisions'])} decisions:")
    for d in result['decisions']:
        print(f"    - {d['asset_name']}: {d['action']}")
        if d.get('estimated_carbon_saved'):
            print(f"      Saved: {d['estimated_carbon_saved']:.3f} kg CO₂")
elif result['status'] == 'error':
    print(f"  ❌ Error: {result.get('message')}")

# Test LIVE
print("\n🚀 Testing scheduler (LIVE - HIGH carbon)...")
result = run_carbon_aware_scheduler(building.id, dry_run=False)
print(f"  Status: {result['status']}")
print(f"  Applied: {result.get('applied_count', 0)} modulations")

# Check states
print("\n  Asset states:")
for asset in FlexibleAsset.objects.filter(building=building):
    state = "⚠️ MODULATED" if asset.is_modulated_active else "✅ NORMAL"
    print(f"    {asset.name}: {state}")

# Check events
events = ModulationEvent.objects.filter(building=building).order_by('-triggered_at')[:5]
print(f"\n  Modulation events: {events.count()}")
for e in events:
    print(f"    - {e.action_type}: {e.asset.name}")
    print(f"      {e.carbon_intensity_at_time:.1f} > {e.carbon_threshold:.1f} gCO2/kWh")
    if e.estimated_carbon_saved_kg:
        print(f"      Saved: {e.estimated_carbon_saved_kg:.3f} kg CO₂")

# Test RESTORATION
print("\n↩️  Testing RESTORATION (LOW carbon)...")
for i in range(24):
    CarbonForecast.objects.update_or_create(
        region_id=region,
        forecast_time=now + timedelta(hours=i),
        defaults={"intensity_forecast": 180.0, "source": "test"}
    )
print("✅ Created forecast at 180 gCO2/kWh")

result = run_carbon_aware_scheduler(building.id, dry_run=False)
print(f"  Applied: {result.get('applied_count', 0)} restorations")

# Check if restored
modulated = FlexibleAsset.objects.filter(building=building, is_modulated_active=True).count()
if modulated == 0:
    print("  ✅ All assets restored to normal")
else:
    print(f"  ⚠️ {modulated} assets still modulated")

# Final summary
print("\n" + "="*60)
print("📊 FINAL SUMMARY")
print("="*60)
total_events = ModulationEvent.objects.filter(building=building).count()
total_carbon_saved = sum(
    e.estimated_carbon_saved_kg or 0
    for e in ModulationEvent.objects.filter(building=building)
)
print(f"  Building ID: {building.id}")
print(f"  Total Events: {total_events}")
print(f"  Total Carbon Saved: {total_carbon_saved:.3f} kg CO₂")

print("\n✅ Backend testing complete!")
print("\n💡 Next: Build frontend dashboard to visualize this data")
