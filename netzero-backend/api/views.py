# api/views.py

import os
import random
import requests

from django.db import models
from django.core.validators import MinValueValidator
from ml.predictor import predict_loads

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    BuildingProfile,
    FlexibleAsset,
    OperationalSchedule,
    CarbonPreference,
)

from .serializers import (
    BuildingProfileSerializer,
    FlexibleAssetSerializer,
    OperationalScheduleSerializer,
    CarbonPreferenceSerializer,
    RetrofitSimulationSerializer,
)
class CarbonPreferenceViewSet(viewsets.ModelViewSet):
    queryset = CarbonPreference.objects.all()
    serializer_class = CarbonPreferenceSerializer

# -------------------------------------------------------------------------
# LOCAL PYTORCH THERMODYNAMIC INFERENCE ENGINE
# -------------------------------------------------------------------------
def run_thermodynamic_inference(profile: BuildingProfile):
    """
    Uses the trained PyTorch model to predict
    heating and cooling loads from building features.
    """

    try:
        features = [
            profile.relative_compactness,
            profile.surface_area,
            profile.wall_area,
            profile.roof_area,
            profile.overall_height,
            float(profile.orientation),
            profile.glazing_area,
            float(profile.glazing_area_distribution),
        ]

        predictions = predict_loads(features)

        heating_load = predictions["heating_load"]
        cooling_load = predictions["cooling_load"]

        return round(heating_load, 2), round(cooling_load, 2)

    except Exception as e:
        print("ML inference error:", e)

        return 0.0, 0.0

# -------------------------------------------------------------------------
# REST VIEWSETS INTERFACES
# -------------------------------------------------------------------------
def send_sustainability_report(email, report_text):
    api_key = os.environ.get("RESEND_API_KEY")

    response = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "from": "NetZero <onboarding@resend.dev>",
            "to": [email],
            "subject": "NetZero Sustainability Report",
            "text": report_text,
        },
        timeout=10,
    )

    # IMPORTANT FIX: accept 200 OR 202
    return response.status_code in [200, 202]

class BuildingProfileViewSet(viewsets.ModelViewSet):
    """
    Handles thermodynamic twin onboarding validations, National Grid regional lookups,
    and automated execution of localized PyTorch inferences.
    """
    queryset = BuildingProfile.objects.all()
    serializer_class = BuildingProfileSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Instantiate in-memory database record state
        profile_instance = serializer.save()
        
        # --- Epic 2 Workflow: Clean and Parse UK Postcode Structure ---
        raw_pc = profile_instance.postcode.strip().upper()
        
        # Extract the outward code component (e.g., "E1" from "E1 6AN" or "E16AN")
        if " " in raw_pc:
            outward_code = raw_pc.split(" ")[0]
        else:
            # Fallback if they type it without a space: take everything except the last 3 characters
            outward_code = raw_pc[:-3] if len(raw_pc) > 3 else raw_pc

        eso_endpoint = f"https://api.carbonintensity.org.uk/regional/postcode/{outward_code}"
        
        try:
            api_response = requests.get(eso_endpoint, timeout=5.0)
            if api_response.status_code == 200:
                json_data = api_response.json()
                if "data" in json_data and len(json_data["data"]) > 0:
                    extracted_payload = json_data["data"][0]
                    zone_id = extracted_payload.get("regionid") or extracted_payload.get("regionId")
                    if zone_id:
                        profile_instance.grid_zone_id = str(zone_id)
                    else:
                        profile_instance.grid_zone_id = "ZONE_NOT_FOUND"
                else:
                    profile_instance.grid_zone_id = "DATA_EMPTY"
            else:
                # If the outward code fails, let's try the raw string with a space as a resilient fallback
                fallback_pc = raw_pc if " " in raw_pc else f"{raw_pc[:-3]} {raw_pc[-3:]}"
                fallback_endpoint = f"https://api.carbonintensity.org.uk/regional/postcode/{fallback_pc}"
                fallback_res = requests.get(fallback_endpoint, timeout=4.0)
                
                if fallback_res.status_code == 200:
                    extracted_payload = fallback_res.json().get('data', [{}])[0]
                    profile_instance.grid_zone_id = str(extracted_payload.get('regionid', 'UNKNOWN'))
                else:
                    profile_instance.grid_zone_id = f"API_ERR_{api_response.status_code}"
        except Exception:
            profile_instance.grid_zone_id = "TIMEOUT_FALLBACK"

        # --- Epic 3 Workflow: Run Local PyTorch Multi-Layer Inference Engine ---
        heating_load, cooling_load = run_thermodynamic_inference(
            profile_instance
        )

        profile_instance.predicted_heating_load = heating_load
        profile_instance.predicted_cooling_load = cooling_load
        
        # Commit completely compiled analytics data entity rows to storage layer
        profile_instance.save()
        
        return Response(
            {
                "status": "DIGITAL_TWIN_INITIALIZED",
                "building_profile_id": profile_instance.id,
                "predicted_heating_load": heating_load,
                "predicted_cooling_load": cooling_load,
                "mapped_grid_zone": profile_instance.grid_zone_id
            },
            status=status.HTTP_201_CREATED
        )
    @action(detail=True, methods=["post"])
    def email_report(self, request, pk=None):
        building = self.get_object()

        report = f"""
    NETZERO SUSTAINABILITY REPORT

    ========================================
    BUILDING INFORMATION
    ========================================

    Email:
    {building.user_email}

    Postcode:
    {building.postcode}

    Grid Zone:
    {building.grid_zone_id}

    ========================================
    THERMAL LOAD PREDICTIONS
    ========================================

    Predicted Heating Load:
    {(building.predicted_heating_load or 0):.2f} kWh

    Predicted Cooling Load:
    {(building.predicted_cooling_load or 0):.2f} kWh

    ========================================
    STRUCTURAL PROFILE
    ========================================

    Relative Compactness:
    {building.relative_compactness}

    Surface Area:
    {building.surface_area} m²

    Wall Area:
    {building.wall_area} m²

    Roof Area:
    {building.roof_area} m²

    Overall Height:
    {building.overall_height} m

    Orientation:
    {building.orientation}

    Glazing Area:
    {building.glazing_area}

    Glazing Distribution:
    {building.glazing_area_distribution}

    ========================================
    SUSTAINABILITY RECOMMENDATION
    ========================================

    NetZero recommends shifting flexible
    electrical loads toward lower-carbon
    operating windows whenever regional
    carbon intensity decreases.

    This report was generated automatically
    by the NetZero Carbon-Aware Optimization
    Platform.
    """

        success = send_sustainability_report(
            building.user_email,
            report
        )

        if success:
            return Response(
                {
                    "status": "REPORT_SENT",
                    "recipient": building.user_email,
                    "building_profile_id": building.id
                },
                status=status.HTTP_200_OK
            )

        return Response(
            {"status": "EMAIL_FAILED"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    @action(
        detail=True,
        methods=["post"]
    )
    def simulate(self, request, pk=None):

        building = self.get_object()

        serializer = RetrofitSimulationSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        simulation_data = {
            "relative_compactness":
                building.relative_compactness,
            "surface_area":
                building.surface_area,
            "wall_area":
                building.wall_area,
            "roof_area":
                building.roof_area,
            "overall_height":
                building.overall_height,
            "orientation":
                building.orientation,
            "glazing_area":
                building.glazing_area,
            "glazing_area_distribution":
                building.glazing_area_distribution,
        }

        simulation_data.update(
            serializer.validated_data
        )

        features = [
            simulation_data["relative_compactness"],
            simulation_data["surface_area"],
            simulation_data["wall_area"],
            simulation_data["roof_area"],
            simulation_data["overall_height"],
            float(simulation_data["orientation"]),
            simulation_data["glazing_area"],
            float(simulation_data["glazing_area_distribution"]),
        ]

        predictions = predict_loads(features)

        simulated_heating = predictions["heating_load"]
        simulated_cooling = predictions["cooling_load"]

        baseline_heating = building.predicted_heating_load
        baseline_cooling = building.predicted_cooling_load
        return Response(
            {
                "baseline_heating_load": baseline_heating,
                "baseline_cooling_load": baseline_cooling,

                "simulated_heating_load": simulated_heating,
                "simulated_cooling_load": simulated_cooling,

                "heating_difference": simulated_heating - baseline_heating,
                "cooling_difference": simulated_cooling - baseline_cooling,

                # REQUIRED FIELDS FOR TESTS
                "surface_area": simulation_data["surface_area"],
                "wall_area": simulation_data["wall_area"],
                "roof_area": simulation_data["roof_area"],
                "overall_height": simulation_data["overall_height"],
                "relative_compactness": simulation_data["relative_compactness"],
                "orientation": simulation_data["orientation"],
                "glazing_area": simulation_data["glazing_area"],
                "glazing_area_distribution": simulation_data["glazing_area_distribution"],
            },
            status=status.HTTP_200_OK
        )

class FlexibleAssetViewSet(viewsets.ModelViewSet):
    """
    Provides full CRUD interface endpoints for managing flexible electrical hardware items.
    """
    queryset = FlexibleAsset.objects.all()
    serializer_class = FlexibleAssetSerializer



def generate_mock_schedule():
    """
    MVP carbon-aware schedule generator (placeholder for ML model B integration)
    """
    return {
        "00:00-06:00": "LOW",
        "06:00-10:00": "MEDIUM",
        "10:00-16:00": "HIGH",
        "16:00-20:00": "MEDIUM",
        "20:00-24:00": "LOW"
    }


class OperationalScheduleViewSet(viewsets.ModelViewSet):
    queryset = OperationalSchedule.objects.all()
    serializer_class = OperationalScheduleSerializer

    def create(self, request, *args, **kwargs):
        building_id = request.data.get("building")

        if not BuildingProfile.objects.filter(id=building_id).exists():
            return Response(
                {"error": "Invalid building"},
                status=status.HTTP_400_BAD_REQUEST
            )

        schedule = generate_mock_schedule()

        obj = OperationalSchedule.objects.create(
            building_id=building_id,
            schedule_json=schedule,
            recommendation_text=(
                "Shift flexible loads to LOW carbon windows. "
                "Avoid peak emissions periods (10:00–16:00)."
            )
        )

        return Response(
            OperationalScheduleSerializer(obj).data,
            status=status.HTTP_201_CREATED
        )
    
