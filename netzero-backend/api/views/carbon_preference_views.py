from rest_framework import generics
from api.models import CarbonPreference
from api.serializers.carbon_preference_serializer import (
    CarbonPreferenceSerializer
)


class CarbonPreferenceListCreateView(
    generics.ListCreateAPIView
):
    queryset = CarbonPreference.objects.all()
    serializer_class = CarbonPreferenceSerializer


class CarbonPreferenceDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    queryset = CarbonPreference.objects.all()
    serializer_class = CarbonPreferenceSerializer