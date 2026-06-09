from django.db import models

class BuildingProfile(models.Model):
    """
    Foundational thermodynamic digital twin attributes 
    extracted from the UCI Energy Efficiency dataset layout.
    """
    user_email = models.EmailField(unique=True)
    postcode = models.CharField(max_length=8)
    grid_zone_id = models.CharField(max_length=15, blank=True, null=True)
    
    # Structural Input Vector Parameters (UCI Feature Maps)
    relative_compactness = models.FloatField()
    surface_area = models.FloatField()
    wall_area = models.FloatField()
    roof_area = models.FloatField()
    overall_height = models.FloatField()
    orientation = models.IntegerField()  # 2: North, 3: East, 4: South, 5: West
    glazing_area = models.FloatField()
    glazing_area_distribution = models.IntegerField()
    
    # Extracted Model Insights Derived via PyTorch Local Calculations
    calculated_base_load_kw = models.FloatField(blank=True, null=True)
    thermal_inertia_coefficient = models.FloatField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Profile: {self.user_email} ({self.postcode})"


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