# NetZero Notification Runner

This document shows how to run the notification analysis job periodically.

Cron example (runs daily at 00:05):

```bash
# Edit the path to your project
5 0 * * * /Users/you/Desktop/NetZero/netzero-backend/scripts/run_notification_cron.sh >> /tmp/netzero_notifications.log 2>&1
```

To attempt real email delivery (requires `RESEND_API_KEY` in environment):

```bash
cd /path/to/netzero-backend
./venv/bin/python manage.py run_notification_analysis --simulate --send
```

Optional: Celery integration

1. Install `celery` and a broker (e.g., Redis).
2. Create a Celery app and task that calls the management command or `analyze_forecast_and_notify()` directly.
3. Use `celery beat` to schedule periodic execution.
If you want, I scaffolded a minimal Celery app and task in the project.

Quick start (example using Redis as broker):

1. Install dependencies:

```bash
pip install celery redis
```

2. Configure broker in your Django `settings.py`:

```py
# example
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
```

3. Start a worker and beat scheduler in separate terminals:

```bash
# start worker
./venv/bin/celery -A config worker --loglevel=info

# start scheduler (periodic tasks)
./venv/bin/celery -A config beat --loglevel=info
```

4. The provided task `run_notification_analysis_task` lives at `api.tasks` and supports `simulate` and `send` flags.

To trigger from Django shell:

```py
from api.tasks import run_notification_analysis_task
run_notification_analysis_task.delay(simulate=True, send=False)
```

