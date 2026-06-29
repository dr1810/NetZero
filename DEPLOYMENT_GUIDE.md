# Deployment Guide for Phase 1

## 🚨 IMPORTANT: Migrations Required

Phase 1 adds new database tables that **must be applied** before the code will work:

### New Tables
- `api_modulationevent` - Logs all modulation actions
- Updates to `api_carbonpreference` (if any)

## Render.com Deployment Steps

### 1. Push Changes to GitHub
```bash
cd ~/Desktop/NetZero
git push origin main
```

### 2. Trigger Render Deploy
Render should auto-deploy when you push to `main`. If not, manually trigger from dashboard.

### 3. Run Migrations on Render

**Option A: Via Render Dashboard**
1. Go to your Render service dashboard
2. Click "Shell" tab
3. Run:
   ```bash
   python manage.py migrate
   ```

**Option B: Via Build Command**
Update your Render build command to:
```bash
pip install -r requirements.txt && python manage.py migrate
```

**Option C: Via Manual SSH (if available)**
```bash
render ssh your-service-name
cd /app
python manage.py migrate
```

### 4. Verify Migration Success

Check Render logs for:
```
Running migrations:
  Applying api.0012_add_modulation_event... OK
```

### 5. Create Carbon Preferences

For each building that should use carbon-aware load shifting:

**Via Django Admin:**
1. Go to `https://your-app.onrender.com/admin/`
2. Add CarbonPreference for each building:
   - Building: Select building
   - Carbon Intensity Threshold: 300.0 (or your preferred threshold)
   - Daily Carbon Budget: 50.0 kg
   - Automation Enabled: ✓ Check this

**Via API:**
```bash
curl -X POST https://your-app.onrender.com/api/carbon-preferences/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "building": 7,
    "carbon_intensity_threshold": 300.0,
    "daily_carbon_budget_kg": 50.0,
    "automation_enabled": true
  }'
```

### 6. Test the Endpoint

```bash
# Should return 200 OK with carbon intensity data
curl https://your-app.onrender.com/api/buildings/7/carbon-intensity/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### 503 Errors on `/carbon-intensity/`

**Cause:** Migration not applied or CarbonPreference missing

**Fix:**
1. Check Render logs: `Settings → Logs`
2. Look for errors like:
   - `no such table: api_modulationevent`
   - `Building has no carbon preference`
3. Run migration: `python manage.py migrate`
4. Create CarbonPreference via admin

### "Building has no carbon preference"

**Cause:** CarbonPreference not created for building

**Fix:**
Create via Django admin or API (see step 5 above)

### National Grid API Timeout

**Expected behavior:** The system falls back to stored CarbonForecast data

**Check logs for:**
```
API request failed for region {id}
Using fallback to stored forecast
```

This is normal and the system should still work.

### Celery Not Running (Automated Tasks)

**Issue:** 15-minute automated modulation checks aren't running

**Fix:** You need to run Celery worker and beat on Render:

1. **Add Celery Worker service:**
   - Service type: Background Worker
   - Build command: `pip install -r requirements.txt`
   - Start command: `celery -A config worker -l info`

2. **Add Celery Beat service:**
   - Service type: Background Worker
   - Build command: `pip install -r requirements.txt`
   - Start command: `celery -A config beat -l info`

3. **Add Redis service** (if not already added):
   - Render → New → Redis
   - Link to your Django service via environment variable:
     ```
     CELERY_BROKER_URL=redis://your-redis-url:6379/0
     ```

## Environment Variables

Required for Render:
```
# Django
SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=your-app.onrender.com

# Database (auto-provided by Render)
DATABASE_URL=postgresql://...

# Celery (optional, for automated tasks)
CELERY_BROKER_URL=redis://...

# Email (optional, for verification)
RESEND_API_KEY=your-resend-key
```

## Deployment Checklist

Before pushing Phase 1 to production:

- [ ] Migrations committed to git
- [ ] Code pushed to GitHub
- [ ] Render auto-deployed
- [ ] Migrations run on Render
- [ ] CarbonPreferences created for buildings
- [ ] Test `/carbon-intensity/` endpoint
- [ ] Test frontend `/dashboard/carbon` page
- [ ] (Optional) Celery worker running
- [ ] (Optional) Celery beat running
- [ ] (Optional) Redis connected

## Quick Fix for Current 503 Errors

```bash
# SSH into Render shell (from dashboard)
python manage.py migrate

# Verify migration applied
python manage.py showmigrations api

# Should show:
# [X] 0012_add_modulation_event

# Create carbon preference for building 7
python manage.py shell
>>> from api.models import BuildingProfile, CarbonPreference
>>> building = BuildingProfile.objects.get(id=7)
>>> CarbonPreference.objects.create(
...     building=building,
...     carbon_intensity_threshold=300.0,
...     daily_carbon_budget_kg=50.0,
...     automation_enabled=True
... )
>>> exit()
```

## Monitoring

After deployment, check:

1. **Render Logs** - Look for errors
2. **Django Admin** - Check ModulationEvent records
3. **Frontend Dashboard** - Visit `/dashboard/carbon`
4. **API Responses** - Test all endpoints

## Rollback

If Phase 1 causes issues:

```bash
# Revert to previous commit
git revert HEAD~2  # Reverts last 2 commits
git push origin main

# Wait for Render to redeploy
```

Or use Render's "Rollback" feature in dashboard.
