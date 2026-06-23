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

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["owner", "postcode"], name="unique_owner_postcode")
        ]

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