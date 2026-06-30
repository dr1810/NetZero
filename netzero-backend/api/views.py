# api/views.py

from rest_framework.decorators import action
from django.http import HttpResponse
import csv
from django.db import models
from django.db import IntegrityError
from django.core.validators import MinValueValidator
from django.utils import timezone
from ml.predictor import predict_loads
from rest_framework.permissions import IsAuthenticated

from rest_framework import status, viewsets
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
from .services.postcode_region import map_postcode_to_region_id
from .services.auth_verification import (
    build_email_verification_token,
    build_verification_url,
    send_auth_verification_email,
    verify_email_token,
)

logger = logging.getLogger(__name__)

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
            return Response({"detail": "Unable to create building profile due to a data integrity constraint."}, status=status.HTTP_400_BAD_REQUEST)
        
        mapped_region_id = map_postcode_to_region_id(profile_instance.postcode)
        profile_instance.grid_zone_id = mapped_region_id or "UNKNOWN"

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

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        try:
            data = request.data.copy()
        except Exception:
            data = dict(request.data)

        if not data.get("user_email"):
            if instance.user_email:
                data["user_email"] = instance.user_email
            else:
                user_email_value = getattr(request.user, "email", None)
                if user_email_value:
                    data["user_email"] = user_email_value

        serializer = self.get_serializer(instance, data=data, partial=partial)
        if not serializer.is_valid():
            try:
                self.logger.warning("BuildingProfile update validation failed: %s", serializer.errors)
            except Exception:
                pass
            return Response(
                {
                    "errors": serializer.errors,
                    "raw_payload": data,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile_instance = serializer.save(owner=request.user)
        mapped_region_id = map_postcode_to_region_id(profile_instance.postcode)
        if mapped_region_id and profile_instance.grid_zone_id != mapped_region_id:
            profile_instance.grid_zone_id = mapped_region_id
            profile_instance.save(update_fields=["grid_zone_id"])
        return Response(serializer.data, status=status.HTTP_200_OK)
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
    """Registration endpoint that creates an inactive user and emails verification link."""
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

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_active=False,
        )

        token = build_email_verification_token(user)
        verification_url = build_verification_url(token)
        sent, reason = send_auth_verification_email(email=user.email, verification_url=verification_url)
        if not sent:
            logger.warning("Verification email not sent for user=%s reason=%s", user.username, reason)

        return Response(
            {
                "detail": "Registration successful. Please verify your email before logging in.",
                "verification_email_sent": bool(sent),
            },
            status=status.HTTP_201_CREATED,
        )


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token")
        if not token:
            return Response({"detail": "token is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = verify_email_token(token)
        except Exception:
            return Response({"detail": "Invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        user_id = payload.get("user_id")
        email = payload.get("email")

        try:
            user = User.objects.get(id=user_id, email=email)
        except User.DoesNotExist:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        if not user.is_active:
            user.is_active = True
            user.save(update_fields=["is_active"])

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "detail": "Email verified successfully.",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_200_OK,
        )



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


class CarbonMonitoringViewSet(viewsets.ViewSet):
    """
    API endpoints for carbon-aware monitoring and modulation.
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['get'], url_path='carbon-intensity')
    def get_carbon_intensity(self, request, pk=None):
        """
        GET /api/buildings/{id}/carbon-intensity/
        
        Returns current carbon intensity for the building's region.
        """
        from api.services.carbon_monitor import (
            should_trigger_modulation,
            get_current_carbon_intensity,
        )
        
        try:
            should_modulate, carbon_data = should_trigger_modulation(pk)
            
            if carbon_data is None:
                building = BuildingProfile.objects.get(id=pk)

                has_preference = hasattr(building, "carbon_preference")
                automation_enabled = (
                    has_preference and
                    building.carbon_preference.automation_enabled
                )
                if not has_preference or not automation_enabled or not building.grid_zone_id:
                    fallback_threshold = (
                        building.carbon_preference.carbon_intensity_threshold
                        if has_preference else 300.0
                    )
                    current = (
                        get_current_carbon_intensity(building.grid_zone_id)
                        if building.grid_zone_id else None
                    )

                    if current:
                        return Response({
                            "current_intensity": current["intensity"],
                            "threshold": fallback_threshold,
                            "index": current["index"],
                            "region_id": current["region_id"],
                            "timestamp": current["timestamp"],
                            "source": current["source"],
                            "should_modulate": False
                        })

                    return Response({
                        "current_intensity": 0.0,
                        "threshold": fallback_threshold,
                        "index": "unknown",
                        "region_id": building.grid_zone_id or "UNKNOWN",
                        "timestamp": timezone.now(),
                        "source": "unavailable",
                        "should_modulate": False
                    })

                return Response(
                    {"error": "Could not fetch carbon intensity data"},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
            
            return Response({
                "current_intensity": carbon_data["current_intensity"],
                "threshold": carbon_data["threshold"],
                "index": carbon_data["index"],
                "region_id": carbon_data["region_id"],
                "timestamp": carbon_data["timestamp"],
                "source": carbon_data["source"],
                "should_modulate": should_modulate
            })
            
        except BuildingProfile.DoesNotExist:
            return Response(
                {"error": "Building not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Failed to get carbon intensity for building {pk}: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'], url_path='modulation-events')
    def get_modulation_events(self, request, pk=None):
        """
        GET /api/buildings/{id}/modulation-events/
        
        Returns paginated modulation event history.
        Query params: page, page_size (default 20), action_type, asset_id
        """
        from api.models import ModulationEvent
        from rest_framework.pagination import PageNumberPagination
        
        try:
            building = BuildingProfile.objects.get(id=pk)
            
            queryset = ModulationEvent.objects.filter(building=building).select_related('asset')
            
            # Filter by action type if provided
            action_type = request.query_params.get('action_type')
            if action_type:
                queryset = queryset.filter(action_type=action_type)
            
            # Filter by asset if provided
            asset_id = request.query_params.get('asset_id')
            if asset_id:
                queryset = queryset.filter(asset_id=asset_id)
            
            # Paginate
            paginator = PageNumberPagination()
            paginator.page_size = int(request.query_params.get('page_size', 20))
            page = paginator.paginate_queryset(queryset, request)
            
            events_data = [
                {
                    "id": event.id,
                    "asset_id": event.asset.id,
                    "asset_name": event.asset.name,
                    "action_type": event.action_type,
                    "trigger_type": event.trigger_type,
                    "carbon_intensity_at_time": event.carbon_intensity_at_time,
                    "carbon_threshold": event.carbon_threshold,
                    "previous_state": event.previous_state,
                    "new_state": event.new_state,
                    "reason": event.reason,
                    "estimated_carbon_saved_kg": event.estimated_carbon_saved_kg,
                    "triggered_at": event.triggered_at,
                    "duration_minutes": event.duration_minutes,
                    "initiated_by": event.initiated_by
                }
                for event in page
            ]
            
            return paginator.get_paginated_response(events_data)
            
        except BuildingProfile.DoesNotExist:
            return Response(
                {"error": "Building not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Failed to get modulation events for building {pk}: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='trigger-modulation')
    def trigger_modulation(self, request, pk=None):
        """
        POST /api/buildings/{id}/trigger-modulation/
        
        Manually trigger carbon-aware modulation check for a building.
        Optional body: { "dry_run": true }
        """
        from api.services.asset_scheduler import run_carbon_aware_scheduler
        
        try:
            building = BuildingProfile.objects.get(id=pk)
            dry_run = request.data.get('dry_run', False)
            
            result = run_carbon_aware_scheduler(building.id, dry_run=dry_run)
            
            return Response(result, status=status.HTTP_200_OK)
            
        except BuildingProfile.DoesNotExist:
            return Response(
                {"error": "Building not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Failed to trigger modulation for building {pk}: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
