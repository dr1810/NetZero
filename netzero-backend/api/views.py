# api/views.py

import os
import random
import requests
from rest_framework.decorators import action
from django.http import HttpResponse
import csv
from django.db import models
from django.db import IntegrityError
from django.core.validators import MinValueValidator
from ml.predictor import predict_loads
from rest_framework.permissions import IsAuthenticated

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
import logging

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
from .services.ml_inference import run_thermodynamic_inference, generate_mock_schedule
from .services.schedule_generator import generate_schedule_for_building
from .services.email_dispatcher import send_sustainability_report
from .services.notification_service import analyze_forecast_and_notify
class CarbonPreferenceViewSet(viewsets.ModelViewSet):
    queryset = CarbonPreference.objects.all()
    serializer_class = CarbonPreferenceSerializer

# ML inference helpers moved to api/services/ml_inference.py

# -------------------------------------------------------------------------
# REST VIEWSETS INTERFACES
# -------------------------------------------------------------------------
# email dispatch moved to api/services/email_dispatcher.py

class BuildingProfileViewSet(viewsets.ModelViewSet):
    """
    Handles thermodynamic twin onboarding validations, National Grid regional lookups,
    and automated execution of localized PyTorch inferences.
    """
    queryset = BuildingProfile.objects.all()
    serializer_class = BuildingProfileSerializer
    permission_classes = [IsAuthenticated]
    logger = logging.getLogger(__name__)
    def get_queryset(self):
        if self.request.user.is_authenticated:
            return BuildingProfile.objects.filter(
                owner=self.request.user
            )
        return BuildingProfile.objects.none()
    
    def list(self, request, *args, **kwargs):
        """Override list to provide extra diagnostics for debugging 400 responses."""
        try:
            # Log user, auth, and a small subset of headers for debugging
            hdrs = {k: v for k, v in request.headers.items() if k.lower() in ["host", "authorization", "content-type"]}
            self.logger.info("BuildingProfile list called by user=%s auth=%s headers=%s", request.user, request.auth, hdrs)
            return super().list(request, *args, **kwargs)
        except Exception as e:
            # Log full traceback server-side and return a helpful payload
            self.logger.exception("Error while listing BuildingProfile objects")
            return Response({"detail": "Server error while listing buildings", "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def create(self, request, *args, **kwargs):
        # Log incoming payload for diagnostics
        try:
            self.logger.info("BuildingProfile create called by user=%s payload=%s", request.user, request.data)
        except Exception:
            pass

        # Copy and normalize incoming data so we can override sensitive or unique fields
        try:
            data = request.data.copy()
        except Exception:
            data = dict(request.data)

        # Ensure the building is tied to the authenticated user's email when client omitted it
        if request.user and not data.get('user_email'):
            user_email_value = getattr(request.user, 'email', None)
            if user_email_value:
                data['user_email'] = user_email_value

        # Allow multiple building profiles per user; do not block creation by user_email.

        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            # Log validation errors server-side and return detailed payload to the client
            try:
                self.logger.warning("BuildingProfile validation failed: %s", serializer.errors)
            except Exception:
                pass
            detailed = {
                "errors": serializer.errors,
                "raw_payload": data,
            }
            return Response(detailed, status=status.HTTP_400_BAD_REQUEST)

        # Instantiate in-memory database record state
        try:
            profile_instance = serializer.save(
                owner=request.user
            )
        except IntegrityError as e:
            try:
                self.logger.warning("IntegrityError while creating BuildingProfile for user=%s: %s", request.user, str(e))
            except Exception:
                pass
            return Response({"detail": "Building already exists for this owner and postcode."}, status=status.HTTP_400_BAD_REQUEST)
        
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
    @action(detail=True, methods=["get"])
    def generate_report(self, request, pk=None):

        building = self.get_object()

        response = HttpResponse(
            content_type="text/csv"
        )

        response[
            "Content-Disposition"
        ] = f'attachment; filename="esg_report_{building.id}.csv"'

        writer = csv.writer(response)

        writer.writerow(["NetZero ESG Compliance Report"])
        writer.writerow([])

        writer.writerow(["Email", building.user_email])
        writer.writerow(["Postcode", building.postcode])
        writer.writerow(["Grid Zone", building.grid_zone_id])

        writer.writerow([])

        writer.writerow([
            "Predicted Heating Load",
            building.predicted_heating_load
        ])

        writer.writerow([
            "Predicted Cooling Load",
            building.predicted_cooling_load
        ])

        return response

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def schedule(self, request, pk=None):
        """Generate or retrieve a schedule for the building and return it as JSON."""
        building = self.get_object()

        try:
            schedule = generate_schedule_for_building(building)
            return Response(schedule, status=status.HTTP_200_OK)
        except Exception as e:
            self.logger.exception("Error generating schedule for building %s", building.id)
            return Response({"detail": "Schedule generation failed", "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
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

        success, reason = send_sustainability_report(
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

        # Log the failure reason and return a helpful error payload so frontend can surface it
        try:
            self.logger.warning("Email send failed for building %s: %s", building.id, reason)
        except Exception:
            pass

        return Response(
            {"status": "EMAIL_FAILED", "reason": reason},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def analyze_notifications(self, request, pk=None):
        """Accepts a forecast payload and evaluates notification triggers."""
        building = self.get_object()
        forecast = request.data.get("forecast")
        if not isinstance(forecast, list):
            return Response({"detail": "forecast must be a list of points"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            events = analyze_forecast_and_notify(building, forecast, send_email=True)
            from .serializers import NotificationEventSerializer
            serialized = NotificationEventSerializer(events, many=True).data
            return Response({"created": len(events), "events": serialized}, status=status.HTTP_200_OK)
        except Exception as e:
            self.logger.exception("Error analyzing notifications for building %s", building.id)
            return Response({"detail": "analysis_failed", "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
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
    @action(detail=False, methods=["get"])
    def portfolio(self, request):

        buildings = BuildingProfile.objects.filter(
            owner=request.user
        )

        total_buildings = buildings.count()

        total_heating = sum(
            b.predicted_heating_load or 0
            for b in buildings
        )

        total_cooling = sum(
            b.predicted_cooling_load or 0
            for b in buildings
        )

        estimated_carbon_avoided = total_heating * 0.2
        estimated_cost_savings = total_heating * 0.15

        return Response({
            "total_facilities": total_buildings,
            "total_heating_load": total_heating,
            "total_cooling_load": total_cooling,
            "estimated_carbon_avoided_kg":
                estimated_carbon_avoided,
            "estimated_cost_savings_gbp":
                estimated_cost_savings
        })

class FlexibleAssetViewSet(viewsets.ModelViewSet):
    """
    Provides full CRUD interface endpoints for managing flexible electrical hardware items.
    """
    queryset = FlexibleAsset.objects.all()
    serializer_class = FlexibleAssetSerializer


class RegisterView(APIView):
    """Simple registration endpoint that creates a user and returns JWT tokens."""
    permission_classes = [AllowAny]

    def post(self, request):
        User = get_user_model()

        email = request.data.get("email") or request.data.get("username")
        password = request.data.get("password")
        if not email or not password:
            return Response({"detail": "email and password required"}, status=status.HTTP_400_BAD_REQUEST)

        # Use email as username when appropriate
        username = email if "@" in (email or "") else request.data.get("username", email)

        if User.objects.filter(username=username).exists():
            return Response({"detail": "User already exists."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, email=email, password=password)

        refresh = RefreshToken.for_user(user)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }, status=status.HTTP_201_CREATED)



def generate_mock_schedule():
    """
    MVP carbon-aware schedule generator (placeholder for ML model B integration)
    """
    # moved to api/services/ml_inference.py; imported at module level
    pass


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
    
