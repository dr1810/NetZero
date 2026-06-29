# Phase 1 Test Scripts

These are standalone verification scripts for Phase 1 carbon-aware load shifting functionality. They are **not** Django unit tests and should be run manually.

## Scripts

### `demo_phase1.py`
**Purpose:** Comprehensive demo of Phase 1 features using an existing building.

**Usage:**
```bash
cd netzero-backend
source venv/bin/activate
python scripts/demo_phase1.py
```

**What it does:**
- Uses first available building in database
- Creates carbon preference if needed
- Creates test assets if building has none
- Runs high carbon scenario (450 gCO₂/kWh)
- Tests dry-run and live modulation
- Runs low carbon scenario (180 gCO₂/kWh)
- Verifies restoration
- Shows summary of events and carbon saved

**Output:**
```
🧪 PHASE 1 BACKEND TESTING
══════════════════════════
🏢 Using building: ID=3, Postcode=EH11RE
✅ Threshold: 300.0 gCO2/kWh
⚡ Found 2 existing assets
🎯 Testing scheduler (DRY RUN)...
  ✅ Found 2 decisions
🚀 Testing scheduler (LIVE)...
  Applied: 2 modulations
📊 FINAL SUMMARY
  Total Carbon Saved: 2.250 kg CO₂
```

---

### `verify_phase1.py`
**Purpose:** Original comprehensive test suite with mocked API.

**Usage:**
```bash
python scripts/verify_phase1.py
```

**What it does:**
- Mocks National Grid ESO API
- Creates test building with full profile
- Tests forecast ingestion
- Tests carbon monitoring
- Tests asset scheduling

---

### `validate_phase1.py`
**Purpose:** Simplified validation with minimal database setup.

**Usage:**
```bash
python scripts/validate_phase1.py
```

**What it does:**
- Creates minimal test building
- Creates test assets
- Validates core modulation logic
- Quick sanity check

---

## Why These Are Not Django Tests

These scripts:
1. **Query the database at import time** - Django's test runner creates a fresh test database, so tables don't exist when these scripts import
2. **Are meant for manual verification** - They require an existing database with data
3. **Produce user-friendly output** - They're demos, not unit tests
4. **Take manual input** - Some scripts might need user interaction

For **automated testing** in CI, use:
```bash
python manage.py test
```

This runs the actual Django unit tests in:
- `api/tests/test_forecast_ingestion.py`
- `api/tests/test_postcode_region_mapping.py`
- `api/tests/test_auth_email_verification.py`

---

## CI Pipeline

The CI pipeline runs `python manage.py test`, which:
✅ Discovers tests in `api/tests/` directory
✅ Creates fresh test database
✅ Runs all `TestCase` subclasses
❌ Does NOT run these manual scripts

If you name a file `test_*.py` in the project root, Django's test discovery will try to import it as a test module, causing failures. That's why these are in `scripts/` with non-test names.

---

## Quick Reference

**Want to test Phase 1?**
```bash
# Backend ready? Run demo
python scripts/demo_phase1.py

# CI tests passing?
python manage.py test

# Frontend working?
npm run build
```

**Debugging CI failures?**
1. Check `python manage.py test` passes locally
2. Make sure no `test_*.py` files in project root
3. Check migrations are committed
4. Verify all imports work without database access at top level
