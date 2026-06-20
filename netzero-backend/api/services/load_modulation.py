from api.models import FlexibleAsset


class LoadModulationService:

    @staticmethod
    def modulate_building_assets(building):

        affected_assets = []

        assets = FlexibleAsset.objects.filter(
            building=building
        ).exclude(
            criticality_classification="CRITICAL"
        )

        for asset in assets:
            asset.is_modulated_active = True
            asset.save()

            affected_assets.append(asset.name)

        return affected_assets