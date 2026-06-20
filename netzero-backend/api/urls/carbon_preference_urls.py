from django.urls import path

from api.views.carbon_preference_views import (
    CarbonPreferenceListCreateView,
    CarbonPreferenceDetailView,
)

urlpatterns = [
    path(
        "",
        CarbonPreferenceListCreateView.as_view(),
        name="carbon-preference-list",
    ),
    path(
        "<int:pk>/",
        CarbonPreferenceDetailView.as_view(),
        name="carbon-preference-detail",
    ),
]