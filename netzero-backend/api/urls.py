# api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BuildingProfileViewSet, FlexibleAssetViewSet

router = DefaultRouter()
router.register(r'buildings', BuildingProfileViewSet, basename='building')
router.register(r'assets', FlexibleAssetViewSet, basename='asset')

urlpatterns = [
    path('', include(router.urls)),
]