from api.models import CarbonPreference


class CarbonThresholdEvaluator:

    @staticmethod
    def should_trigger_modulation(
        current_carbon_intensity: float,
        threshold: float
    ) -> bool:
        return current_carbon_intensity > threshold

    @staticmethod
    def evaluate_all(current_carbon_intensity: float):

        triggered_buildings = []

        preferences = CarbonPreference.objects.filter(
            automation_enabled=True
        )

        for pref in preferences:
            if CarbonThresholdEvaluator.should_trigger_modulation(
                current_carbon_intensity,
                pref.carbon_intensity_threshold
            ):
                triggered_buildings.append(pref.building)

        return triggered_buildings