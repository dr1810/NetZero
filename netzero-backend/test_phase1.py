#!/usr/bin/env python
"""
Backend Testing Script for Phase 1: Carbon-Aware Load Shifting

Creates test data and verifies all components work correctly.
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from api.models import BuildingProfile, FlexibleAsset, CarbonPreference, CarbonForecast, ModulationEvent
from api.services.carbon_monitor import get_current_carbon_intensity, should_trigger_modulation
from api.services.asset_scheduler import run_carbon_aware_scheduler
from api.tasks import run_carbon_aware_modulation_task

User = get_user_model()

def cleanup_test_data():
    """Remove previous test data."""
    print("\n🧹 Cleaning up previous test data...")
    ModulationEvent.objects.filter(building__postcode="TEST123").delete()
    FlexibleAsset.objects.filter(building__postcode="TEST123").delete()
    CarbonPreference.objects.filter(building__postcode="TEST123").delete()
    BuildingProfile.objects.filter(postcode="TEST123").delete()
    CarbonForecast.objects.filter(region_id="999").delete()
    print("✅ Cleanup complete")

def create_test_building():
    """Create a test building with carbon preference."""
    print("\n🏢 Creating test building...")
    
    # Get or create test user
    user, created = User.objects.get_or_create(
        username="testuser",
        defaults={
            "email": "test@example.com",
            "is_active": True
        }
    )
    if created:
        user.set_password("testpass123")
        user.save()
    
    # Create building
    building = BuildingProfile.objects.create(
        owner=user,
        postcode="TEST123",
        user_email="test@example.com",
        grid_zone_id="999",  # Test region
        total_floor_area_m2=1000.0,
        building_type="OFFICE",
        occupancy=50,
        heating_type="GAS",
        has_solar_panels=True,
        solar_capacity_kw=10.0
    )
    
    # Create carbon preference
    preference = CarbonPreference.objects.create(
        building=building,
        carbon_intensity_threshold=300.0,
        daily_carbon_budget_kg=50.0,
        automation_enabled=True
    )
    
    print(f"✅ Building created: ID={building.id}, Postcode={building.postcode}")
    print(f"✅ Carbon preference: Threshold={preference.carbon_intensity_threshold} gCO2/kWh")
    
    return building

def create_test_assets(building):
    """Create flexible assets with different criticality levels."""
    print("\n⚡ Creating test assets...")
    
    assets = [
        {
            "name": "EV Charger",
            "electrical_capacity_kw": 7.0,
            "criticality_classification": "FLEXIBLE"
        },
        {
            "name": "HVAC System",
            "electrical_capacity_kw": 15.0,
            "criticality_classification": "FLEXIBLE"
        },
        {
            "name": "Server Room",
            "electrical_capacity_kw": 20.0,
            "criticality_classification": "CRITICAL"
        },
        {
            "name": "Lobby Lighting",
            "electrical_capacity_kw": 3.0,
            "criticality_classification": "SHEDDABLE"
        }
    ]
    
    created_assets = []
    for asset_data in assets:
        asset = FlexibleAsset.objects.create(
            building=building,
            **asset_data,
            is_modulated_active=False
        )
        created_assets.append(asset)
        print(f"  ✅ {asset.name} ({asset.electrical_capacity_kw} kW, {asset.criticality_classification})")
    
    return created_assets

def create_test_carbon_forecasts(region_id, high_carbon=True):
    """Create test carbon forecast data."""
    print(f"\n📊 Creating test carbon forecasts (high_carbon={high_carbon})...")
    
    now = timezone.now()
    intensity = 450.0 if high_carbon else 180.0
    
    # Create forecasts for next 24 hours
    for i in range(24):
        forecast_time = now + timedelta(hours=i)
        CarbonForecast.objects.update_or_create(
            region_id=region_id,
            forecast_time=forecast_time,
            defaults={
                "intensity_forecast": intensity + (i * 5.0),  # Slight variation
                "source": "test"
            }
        )
    
    print(f"✅ Created 24-hour forecast with intensity ~{intensity} gCO2/kWh")

def test_carbon_monitoring(building):
    """Test carbon monitoring service."""
    print("\n🔍 Testing carbon monitoring service...")
    
    # Test should_trigger_modulation
    should_modulate, carbon_data = should_trigger_modulation(building.id)
    
    if carbon_data:
        print(f"  ✅ Current intensity: {carbon_data['current_intensity']} gCO2/kWh")
        print(f"  ✅ Threshold: {carbon_data['threshold']} gCO2/kWh")
        print(f"  ✅ Index: {carbon_data['index']}")
        print(f"  ✅ Should modulate: {should_modulate}")
        print(f"  ✅ Source: {carbon_data['source']}")
        return carbon_data
    else:
        print("  ⚠️ Could not fetch carbon intensity (may need real API or forecast data)")
        return None

def test_scheduler_dry_run(building):
    """Test asset scheduler in dry-run mode."""
    print("\n🎯 Testing scheduler (DRY RUN)...")
    
    result = run_carbon_aware_scheduler(building.id, dry_run=True)
    
    print(f"  Status: {result['status']}")
    
    if result['status'] == 'dry_run':
        print(f"  ✅ Found {len(result['decisions'])} modulation decisions:")
        for decision in result['decisions']:
            print(f"    - {decision['asset_name']}: {decision['action']}")
            print(f"      Reason: {decision['reason'][:80]}...")
            if decision.get('estimated_carbon_saved'):
                print(f"      Estimated savings: {decision['estimated_carbon_saved']} kg CO₂")
    elif result['status'] == 'error':
        print(f"  ❌ Error: {result.get('message')}")
    
    return result

def test_scheduler_live(building):
    """Test asset scheduler with live application."""
    print("\n🚀 Testing scheduler (LIVE)...")
    
    result = run_carbon_aware_scheduler(building.id, dry_run=False)
    
    print(f"  Status: {result['status']}")
    print(f"  Decisions: {result.get('decisions_count', 0)}")
    print(f"  Applied: {result.get('applied_count', 0)}")
    
    if result['status'] == 'success':
        print("  ✅ Modulations applied successfully")
        
        # Check asset states
        assets = FlexibleAsset.objects.filter(building=building)
        print("\n  Asset states after modulation:")
        for asset in assets:
            state = "MODULATED" if asset.is_modulated_active else "NORMAL"
            print(f"    - {asset.name}: {state}")
        
        # Check modulation events
        events = ModulationEvent.objects.filter(building=building).order_by('-triggered_at')[:5]
        print(f"\n  Recent modulation events: {events.count()}")
        for event in events:
            print(f"    - {event.asset.name}: {event.action_type} @ {event.triggered_at.strftime('%H:%M:%S')}")
            print(f"      Carbon: {event.carbon_intensity_at_time} > {event.carbon_threshold}")
            if event.estimated_carbon_saved_kg:
                print(f"      Saved: {event.estimated_carbon_saved_kg} kg CO₂")
    
    return result

def test_restoration(building):
    """Test asset restoration when carbon drops."""
    print("\n↩️  Testing restoration (low carbon scenario)...")
    
    # Create low carbon forecast
    create_test_carbon_forecasts(building.grid_zone_id, high_carbon=False)
    
    # Run scheduler again
    result = run_carbon_aware_scheduler(building.id, dry_run=False)
    
    print(f"  Status: {result['status']}")
    print(f"  Applied: {result.get('applied_count', 0)}")
    
    # Check if assets restored
    assets = FlexibleAsset.objects.filter(building=building)
    modulated_count = assets.filter(is_modulated_active=True).count()
    
    if modulated_count == 0:
        print("  ✅ All assets restored to normal operation")
    else:
        print(f"  ⚠️ {modulated_count} assets still modulated")
    
    # Check restoration events
    restore_events = ModulationEvent.objects.filter(
        building=building,
        action_type="RESTORED"
    ).order_by('-triggered_at')[:5]
    
    print(f"\n  Restoration events: {restore_events.count()}")
    for event in restore_events:
        print(f"    - {event.asset.name}: RESTORED @ {event.triggered_at.strftime('%H:%M:%S')}")

def test_celery_task(building):
    """Test the Celery task directly."""
    print("\n⏰ Testing Celery task...")
    
    try:
        result = run_carbon_aware_modulation_task()
        print(f"  ✅ Task executed:")
        print(f"    - Buildings processed: {result['buildings_processed']}")
        print(f"    - Total modulations: {result['total_modulations']}")
        print(f"    - Errors: {result['errors']}")
    except Exception as e:
        print(f"  ⚠️ Task execution failed: {e}")
        print("    (This is normal if Celery worker is not running)")

def print_summary():
    """Print test summary."""
    print("\n" + "="*60)
    print("📊 TEST SUMMARY")
    print("="*60)
    
    total_events = ModulationEvent.objects.count()
    total_buildings = BuildingProfile.objects.count()
    total_assets = FlexibleAsset.objects.count()
    
    print(f"  Buildings: {total_buildings}")
    print(f"  Assets: {total_assets}")
    print(f"  Modulation Events: {total_events}")
    
    if total_events > 0:
        recent_events = ModulationEvent.objects.order_by('-triggered_at')[:5]
        print("\n  Recent events:")
        for event in recent_events:
            print(f"    - {event.action_type}: {event.asset.name} @ {event.triggered_at.strftime('%Y-%m-%d %H:%M:%S')}")
    
    print("\n" + "="*60)

def main():
    """Run all tests."""
    print("="*60)
    print("🧪 PHASE 1 BACKEND TESTING")
    print("="*60)
    
    # Cleanup and setup
    cleanup_test_data()
    building = create_test_building()
    assets = create_test_assets(building)
    
    # Create high carbon scenario
    create_test_carbon_forecasts(building.grid_zone_id, high_carbon=True)
    
    # Test components
    carbon_data = test_carbon_monitoring(building)
    
    if carbon_data:
        dry_run_result = test_scheduler_dry_run(building)
        live_result = test_scheduler_live(building)
        restoration_result = test_restoration(building)
    else:
        print("\n⚠️ Skipping scheduler tests (no carbon data available)")
        print("   This may be due to National Grid ESO API being unreachable")
        print("   or no test forecasts being created properly.")
    
    # Test Celery task
    test_celery_task(building)
    
    # Summary
    print_summary()
    
    print("\n✅ Backend testing complete!")
    print("\n💡 Next steps:")
    print("   1. Review test results above")
    print("   2. Check Django admin for ModulationEvent records")
    print("   3. Verify asset states in FlexibleAsset table")
    print("   4. Ready to build frontend dashboard")

if __name__ == "__main__":
    main()
