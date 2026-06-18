# api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BuildingProfileViewSet, FlexibleAssetViewSet
from .views import CarbonPreferenceViewSet, OperationalScheduleViewSet

router = DefaultRouter()
router.register(r'buildings', BuildingProfileViewSet)
router.register(r'assets', FlexibleAssetViewSet)
router.register(r'preferences', CarbonPreferenceViewSet)
router.register(r'schedules', OperationalScheduleViewSet)

urlpatterns = [
    path('', include(router.urls)),
]