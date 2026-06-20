from api.models import CarbonPreference


class CarbonThresholdEvaluator:

    @staticmethod
    def evaluate_all(current_carbon_intensity: float):

        triggered_buildings = []

        preferences = CarbonPreference.objects.filter(
            automation_enabled=True
        )

        for pref in preferences:

            if (
                current_carbon_intensity >
                pref.carbon_intensity_threshold
            ):
                triggered_buildings.append(pref.building)

        return triggered_buildings