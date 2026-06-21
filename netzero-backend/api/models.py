from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
class BuildingProfile(models.Model):
    """
    Foundational thermodynamic digital twin attributes
    extracted from the UCI Energy Efficiency dataset layout.
    """

    user_email = models.EmailField(unique=True)
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