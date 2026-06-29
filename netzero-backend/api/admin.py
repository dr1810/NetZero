from django.contrib import admin
from .models import (
	BuildingProfile,
	FlexibleAsset,
	OperationalSchedule,
	CarbonForecast,
	CarbonPreference,
	NotificationEvent,
)


@admin.register(BuildingProfile)
class BuildingProfileAdmin(admin.ModelAdmin):
	list_display = ("id", "postcode", "user_email", "grid_zone_id", "created_at")
	search_fields = ("postcode", "user_email")


@admin.register(FlexibleAsset)
class FlexibleAssetAdmin(admin.ModelAdmin):
	list_display = ("id", "name", "building", "electrical_capacity_kw", "criticality_classification")


@admin.register(OperationalSchedule)
class OperationalScheduleAdmin(admin.ModelAdmin):
	list_display = ("id", "building", "created_at")


@admin.register(CarbonForecast)
class CarbonForecastAdmin(admin.ModelAdmin):
	list_display = ("id", "region_id", "forecast_time", "intensity_forecast", "source", "fetched_at")
	list_filter = ("region_id", "source")
	search_fields = ("region_id",)


@admin.register(CarbonPreference)
class CarbonPreferenceAdmin(admin.ModelAdmin):
	list_display = ("id", "building", "carbon_intensity_threshold", "daily_carbon_budget_kg", "automation_enabled")


@admin.register(NotificationEvent)
class NotificationEventAdmin(admin.ModelAdmin):
	list_display = ("id", "building", "event_type", "triggered_at", "delivered")
	list_filter = ("event_type", "delivered")
	search_fields = ("building__postcode", "recipient", "message")
