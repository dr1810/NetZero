from rest_framework import serializers
from api.models import CarbonPreference


class CarbonPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarbonPreference
        fields = [
            "id",
            "building",
            "carbon_intensity_threshold",
            "daily_carbon_budget_kg",
            "automation_enabled",
        ]