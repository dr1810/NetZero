# api/serializers.py
from rest_framework import serializers
from .models import BuildingProfile, FlexibleAsset
from .models import OperationalSchedule
from rest_framework import serializers
from .models import CarbonPreference, NotificationEvent

class CarbonPreferenceSerializer(serializers.ModelSerializer):

    class Meta:
        model = CarbonPreference
        fields = [
            "id",
            "building",
            "carbon_intensity_threshold",
            "daily_carbon_budget_kg",
            "automation_enabled"
        ]

    def validate_carbon_intensity_threshold(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Carbon intensity threshold cannot be negative."
            )
        return value

    def validate_daily_carbon_budget_kg(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Daily carbon budget cannot be negative."
            )
        return value

    # Optional: object-level validation (future-proof)
    def validate(self, data):
        if (
            data.get("carbon_intensity_threshold", 0) < 0 or
            data.get("daily_carbon_budget_kg", 0) < 0
        ):
            raise serializers.ValidationError("Invalid carbon constraints.")
        return data
    
class BuildingProfileSerializer(serializers.ModelSerializer):
    predicted_heating_load = serializers.FloatField(read_only=True, default=0.0)
    predicted_cooling_load = serializers.FloatField(read_only=True, default=0.0)
    class Meta:
        model = BuildingProfile
        fields = '__all__'
    def validate_postcode(self, value):
        """
        Cleanses and validates UK postcodes to ensure reliable grid zone mapping.
        """
        clean_pc = value.replace(" ", "").upper()
        if len(clean_pc) < 5 or len(clean_pc) > 8:
            raise serializers.ValidationError("Postcode format must adhere to standard UK grid constraints.")
        return clean_pc
    def to_internal_value(self, data):
        # Coerce common numeric fields when frontend sends them as strings
        coerced = dict(data)
        float_fields = [
            'relative_compactness',
            'surface_area',
            'wall_area',
            'roof_area',
            'overall_height',
            'glazing_area',
        ]
        int_fields = [
            'orientation',
            'glazing_area_distribution',
        ]

        for f in float_fields:
            if f in coerced and isinstance(coerced[f], str):
                val = coerced[f].strip()
                try:
                    coerced[f] = float(val) if val != '' else None
                except Exception:
                    raise serializers.ValidationError({f: ['A valid number is required.']})

        for f in int_fields:
            if f in coerced and isinstance(coerced[f], str):
                val = coerced[f].strip()
                try:
                    coerced[f] = int(val) if val != '' else None
                except Exception:
                    raise serializers.ValidationError({f: ['A valid integer is required.']})

        return super().to_internal_value(coerced)


class FlexibleAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlexibleAsset
        fields = '__all__'


class OperationalScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = OperationalSchedule
        fields = "__all__"


class NotificationEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationEvent
        fields = "__all__"

class RetrofitSimulationSerializer(serializers.Serializer):
    relative_compactness = serializers.FloatField(required=False)
    surface_area = serializers.FloatField(required=False)
    wall_area = serializers.FloatField(required=False)
    roof_area = serializers.FloatField(required=False)
    overall_height = serializers.FloatField(required=False)
    orientation = serializers.IntegerField(required=False)
    glazing_area = serializers.FloatField(required=False)
    glazing_area_distribution = serializers.IntegerField(required=False)