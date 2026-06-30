import os
from pathlib import Path
import dj_database_url
from celery.schedules import crontab

BASE_DIR = Path(__file__).resolve().parent.parent

# ------------------------------------------------------------------
# SECURITY
# ------------------------------------------------------------------

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-)mqs@@s-i+9()o#poz-chh%c48asuvzzkmp18xw8-ohcoa83&5"
)

# Local development: True
# Production: set DEBUG=False in Render environment variables
DEBUG = os.environ.get("DJANGO_DEBUG", "True") == "True"

ALLOWED_HOSTS = [
    ".onrender.com",
    "127.0.0.1",
    "localhost",
]

# ------------------------------------------------------------------
# APPLICATIONS
# ------------------------------------------------------------------

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "corsheaders",
    "rest_framework",

    # Local apps
    "api",
]

# ------------------------------------------------------------------
# MIDDLEWARE
# ------------------------------------------------------------------

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",

    # CORS should be near the top
    "corsheaders.middleware.CorsMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# ------------------------------------------------------------------
# CORS CONFIGURATION
# ------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # Production Vercel deployment
    "https://net-zero-hi5f7xjpt-dr1810s-projects.vercel.app",
    # Legacy / alternate deployment names
    "https://net-zero-black.vercel.app",
]

# Allow all Vercel preview deployments (covers any future deployment URL)
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://net-zero[a-zA-Z0-9\-]*\.vercel\.app$",
    r"^https://.*-dr1810s-projects\.vercel\.app$",
]

# Needed so browsers send Authorization headers cross-origin
CORS_ALLOW_CREDENTIALS = True

# Ensure Authorization and Content-Type are allowed
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

# ------------------------------------------------------------------
# CSRF CONFIGURATION
# ------------------------------------------------------------------

CSRF_TRUSTED_ORIGINS = [
    "https://net-zero-hi5f7xjpt-dr1810s-projects.vercel.app",
    "https://net-zero-black.vercel.app",
    "https://*.vercel.app",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ------------------------------------------------------------------
# DATABASE
# ------------------------------------------------------------------

DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
    )
}

# ------------------------------------------------------------------
# INTERNATIONALIZATION
# ------------------------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"

USE_I18N = True
USE_TZ = True

# ------------------------------------------------------------------
# STATIC FILES
# ------------------------------------------------------------------

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

STATICFILES_STORAGE = (
    "whitenoise.storage.CompressedManifestStaticFilesStorage"
)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ------------------------------------------------------------------
# DRF AUTHENTICATION
# ------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
}

# ------------------------------------------------------------------
# EMAIL (Gmail SMTP — set EMAIL_HOST_USER and EMAIL_HOST_PASSWORD
# in Render environment variables)
# Generate an App Password at: https://myaccount.google.com/apppasswords
# ------------------------------------------------------------------

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.environ.get(
    "DEFAULT_FROM_EMAIL",
    f"NetZero <{EMAIL_HOST_USER}>" if EMAIL_HOST_USER else "NetZero <noreply@example.com>",
)

# Fall back to console backend locally when no credentials are set
if not EMAIL_HOST_USER:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

_frontend_url_default = "http://localhost:3000"
FRONTEND_BASE_URL = os.environ.get("FRONTEND_BASE_URL", _frontend_url_default)

# Warn loudly in production when FRONTEND_BASE_URL has not been overridden.
if not DEBUG and FRONTEND_BASE_URL == _frontend_url_default:
    import warnings
    warnings.warn(
        "FRONTEND_BASE_URL is not set — email links will point to localhost:3000. "
        "Set the FRONTEND_BASE_URL environment variable to your Vercel deployment URL.",
        RuntimeWarning,
        stacklevel=1,
    )

# ------------------------------------------------------------------
# CELERY
# ------------------------------------------------------------------
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", CELERY_BROKER_URL)
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULE = {
    "ingest-hourly-carbon-forecasts": {
        "task": "api.tasks.ingest_hourly_carbon_forecasts_task",
        "schedule": crontab(minute=0),
    },
    "run-carbon-aware-modulation": {
        "task": "api.tasks.run_carbon_aware_modulation_task",
        "schedule": crontab(minute='*/15'),  # Every 15 minutes
    },
}