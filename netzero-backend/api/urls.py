from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    BuildingProfileViewSet,
    FlexibleAssetViewSet,
    CarbonPreferenceViewSet,
    OperationalScheduleViewSet,
    CarbonMonitoringViewSet,
    EnergyPlannerView,
)

router = DefaultRouter()

router.register(r'buildings', BuildingProfileViewSet)
router.register(r'assets', FlexibleAssetViewSet)

router.register(r'preferences', CarbonPreferenceViewSet)

router.register(r'schedules', OperationalScheduleViewSet)

# Register carbon monitoring endpoints under buildings
# e.g., /api/buildings/{id}/carbon-intensity/
router.register(r'buildings', CarbonMonitoringViewSet, basename='carbon-monitoring')


urlpatterns = [
    path('energy-planner/', EnergyPlannerView.as_view(), name='energy-planner'),
    path('', include(router.urls)),
]