from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth.models import User

class BuildingProfile(models.Model):
    """
    Foundational thermodynamic digital twin attributes
    extracted from the UCI Energy Efficiency dataset layout.
    """
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="buildings",
        null=True,
        blank=True
    )
    # Allow multiple BuildingProfile rows per user (owner); remove unique constraint
    user_email = models.EmailField()
    postcode = models.CharField(max_length=8)
    grid_zone_id = models.CharField(max_length=15, blank=True, null=True)

    # Structural Input Vector Parameters (UCI Feature Maps)
    relative_compactness = models.FloatField(
        validators=[MinValueValidator(0)]
    )

    surface_area = models.FloatField(
        validators=[MinValueValidator(0)]
    )

    wall_area = models.FloatField(
        validators=[MinValueValidator(0)]
    )

    roof_area = models.FloatField(
        validators=[MinValueValidator(0)]
    )

    overall_height = models.FloatField(
        validators=[MinValueValidator(0)]
    )

    orientation = models.IntegerField()

    glazing_area = models.FloatField(
        validators=[MinValueValidator(0)]
    )

    glazing_area_distribution = models.IntegerField()

    calculated_base_load_kw = models.FloatField(
        blank=True,
        null=True
    )

    thermal_inertia_coefficient = models.FloatField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    predicted_heating_load = models.FloatField(null=True, blank=True, default=0.0)
    predicted_cooling_load = models.FloatField(null=True, blank=True, default=0.0)

class FlexibleAsset(models.Model):
    """
    Tracks electrical operational hardware units targeted for dynamic 
    load modulation routines. Bound tightly via a ForeignKey constraint.
    """
    CRITICALITY_CHOICES = [
        ('CRITICAL', 'Critical'),
        ('FLEXIBLE', 'Flexible'),
        ('SHEDDABLE', 'Sheddable'),
    ]

    building = models.ForeignKey(
        BuildingProfile, 
        on_delete=models.CASCADE, 
        related_name='flexible_assets'
    )
    name = models.CharField(max_length=100)
    electrical_capacity_kw = models.FloatField()
    criticality_classification = models.CharField(
        max_length=20, 
        choices=CRITICALITY_CHOICES
    )
    is_modulated_active = models.BooleanField(default=False)
    registered_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} [{self.criticality_classification}]"
    
class OperationalSchedule(models.Model):
    building = models.ForeignKey(
        BuildingProfile,
        on_delete=models.CASCADE,
        related_name="schedules"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    # 24-hour carbon-aware schedule (simple MVP representation)
    schedule_json = models.JSONField()

    recommendation_text = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Schedule for {self.building.user_email}"
    

class CarbonForecast(models.Model):
    """
    Chronological 24-hour regional carbon-intensity forecasts indexed by region and timestamp.
    """
    region_id = models.CharField(max_length=16, db_index=True)
    forecast_time = models.DateTimeField(db_index=True)
    fetched_at = models.DateTimeField(auto_now=True, db_index=True)
    source = models.CharField(max_length=64, default="national_grid_eso")
    intensity_forecast = models.FloatField()
    generation_mix = models.JSONField(default=list, blank=True)
    raw_payload = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["region_id", "forecast_time"],
                name="unique_region_forecast_timestamp",
            )
        ]
        indexes = [
            models.Index(fields=["region_id", "forecast_time"], name="idx_region_forecast_time"),
        ]
        ordering = ["region_id", "forecast_time"]

    def __str__(self):
        return f"Region {self.region_id} @ {self.forecast_time.isoformat()} ({self.intensity_forecast})"


class CarbonPreference(models.Model):
    building = models.OneToOneField(
        "BuildingProfile",
        on_delete=models.CASCADE,
        related_name="carbon_preference"
    )

    carbon_intensity_threshold = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(1000)]
    )

    daily_carbon_budget_kg = models.FloatField(
        validators=[MinValueValidator(0)]
    )

    automation_enabled = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return (
            f"{self.building.postcode} "
            f"(Threshold: {self.carbon_intensity_threshold})"
        )


class NotificationEvent(models.Model):
    """
    Records notification attempts and outcomes for audit and troubleshooting.
    """
    EVENT_TYPES = [
        ("CARBON_SPIKE", "Carbon Intensity Spike"),
        ("SCHEDULE_READY", "Schedule Ready"),
    ]

    building = models.ForeignKey(
        BuildingProfile,
        on_delete=models.CASCADE,
        related_name="notification_events",
    )
    event_type = models.CharField(max_length=32, choices=EVENT_TYPES)
    triggered_at = models.DateTimeField(auto_now_add=True)

    # Forecast window (inclusive)
    forecast_window_start = models.DateTimeField(null=True, blank=True)
    forecast_window_end = models.DateTimeField(null=True, blank=True)

    threshold_value = models.FloatField(null=True, blank=True)
    forecast_peak_value = models.FloatField(null=True, blank=True)

    message = models.TextField(blank=True, null=True)
    recipient = models.EmailField(blank=True, null=True)

    delivered = models.BooleanField(default=False)
    delivery_reason = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Notification {self.event_type} for {self.building.postcode} at {self.triggered_at.isoformat()}"


class ModulationEvent(models.Model):
    """
    Logs carbon-aware asset modulation events for audit trail and analytics.
    Tracks when assets are modulated, why, and the carbon context.
    """
    ACTION_TYPES = [
        ('DELAYED', 'Delayed'),
        ('REDUCED', 'Reduced Capacity'),
        ('SHUTDOWN', 'Temporarily Shutdown'),
        ('RESTORED', 'Restored to Normal'),
    ]
    
    TRIGGER_TYPES = [
        ('AUTOMATIC', 'Automatic (Carbon Threshold)'),
        ('MANUAL', 'Manual User Override'),
        ('SCHEDULED', 'Pre-scheduled'),
    ]
    
    asset = models.ForeignKey(
        FlexibleAsset,
        on_delete=models.CASCADE,
        related_name='modulation_events'
    )
    
    building = models.ForeignKey(
        BuildingProfile,
        on_delete=models.CASCADE,
        related_name='modulation_events'
    )
    
    action_type = models.CharField(max_length=20, choices=ACTION_TYPES)
    trigger_type = models.CharField(max_length=20, choices=TRIGGER_TYPES, default='AUTOMATIC')
    
    # Carbon context at time of modulation
    carbon_intensity_at_time = models.FloatField(help_text="gCO2/kWh")
    carbon_threshold = models.FloatField(help_text="Threshold that triggered action")
    
    # Asset state changes
    previous_state = models.BooleanField(help_text="Previous is_modulated_active state")
    new_state = models.BooleanField(help_text="New is_modulated_active state")
    
    # Context and reasoning
    reason = models.TextField(help_text="Human-readable reason for modulation")
    estimated_carbon_saved_kg = models.FloatField(null=True, blank=True)
    
    # Timing
    triggered_at = models.DateTimeField(auto_now_add=True, db_index=True)
    duration_minutes = models.IntegerField(
        null=True, 
        blank=True,
        help_text="How long the modulation lasted (filled when restored)"
    )
    
    # Metadata
    initiated_by = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="User email if manual, 'system' if automatic"
    )
    
    class Meta:
        ordering = ['-triggered_at']
        indexes = [
            models.Index(fields=['building', '-triggered_at'], name='idx_building_modulation'),
            models.Index(fields=['asset', '-triggered_at'], name='idx_asset_modulation'),
        ]
    
    def __str__(self):
        return f"{self.asset.name} {self.action_type} @ {self.triggered_at.isoformat()}"


class PlannerRecommendation(models.Model):
    ACTION_TYPES = [
        ("SAVE_ONLY", "Save Only"),
        ("SCHEDULE_MODULATION", "Schedule Modulation"),
    ]

    STATUS_TYPES = [
        ("SAVED", "Saved"),
        ("PENDING", "Pending Execution"),
        ("EXECUTED", "Executed"),
        ("FAILED", "Failed"),
    ]

    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="planner_recommendations",
    )
    building = models.ForeignKey(
        BuildingProfile,
        on_delete=models.CASCADE,
        related_name="planner_recommendations",
    )
    device_type = models.CharField(max_length=32)
    flexibility_level = models.CharField(max_length=16, default="medium")
    duration_hours = models.FloatField(validators=[MinValueValidator(0.5)])
    earliest_start = models.TimeField()
    latest_finish = models.TimeField()
    recommended_start_at = models.DateTimeField()
    recommended_end_at = models.DateTimeField()
    carbon_intensity = models.FloatField()
    estimated_savings_kg = models.FloatField(default=0.0)
    alternatives = models.JSONField(default=list, blank=True)
    action_type = models.CharField(max_length=24, choices=ACTION_TYPES, default="SAVE_ONLY")
    status = models.CharField(max_length=16, choices=STATUS_TYPES, default="SAVED")
    scheduled_for = models.DateTimeField(null=True, blank=True)
    executed_at = models.DateTimeField(null=True, blank=True)
    execution_result = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "scheduled_for"], name="idx_planner_status_schedule"),
            models.Index(fields=["building", "created_at"], name="idx_planner_building_created"),
        ]

    def __str__(self):
        return f"PlannerRecommendation({self.device_type}, {self.building.postcode}, {self.action_type})"