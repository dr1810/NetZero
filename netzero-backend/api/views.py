# api/views.py

from rest_framework.decorators import action
from django.http import HttpResponse
import csv
from django.db import models
from django.db import IntegrityError
from django.core.validators import MinValueValidator
from django.utils import timezone
from ml.predictor import predict_loads
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import PermissionDenied
from django.contrib.auth import get_user_model
import logging

from .models import (
    BuildingProfile,
    FlexibleAsset,
    ModulationEvent,
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
    send_account_deleted_email,
)

logger = logging.getLogger(__name__)

class CarbonPreferenceViewSet(viewsets.ModelViewSet):
    queryset = CarbonPreference.objects.all()
    serializer_class = CarbonPreferenceSerializer

    def create(self, request, *args, **kwargs):
        """Create or update a building preference in one endpoint to avoid duplicate-create failures."""
        building_id = request.data.get("building")
        if not building_id:
            return Response(
                {"detail": "building is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = CarbonPreference.objects.filter(building_id=building_id).first()
        if existing:
            serializer = self.get_serializer(existing, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data, status=status.HTTP_200_OK)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

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
            carbon_weight = float(request.query_params.get("carbon_weight", 0.5))
            cost_weight = float(request.query_params.get("cost_weight", 0.3))
            comfort_weight = float(request.query_params.get("comfort_weight", 0.2))
            schedule = generate_schedule_for_building(
                building,
                carbon_weight=carbon_weight,
                cost_weight=cost_weight,
                comfort_weight=comfort_weight,
            )
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
            {
                "status": "EMAIL_NOT_SENT",
                "reason": reason,
                "recipient": building.user_email,
                "building_profile_id": building.id
            },
            status=status.HTTP_200_OK
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
        assets = FlexibleAsset.objects.filter(building__owner=request.user)
        events = ModulationEvent.objects.filter(building__owner=request.user)

        total_buildings = buildings.count()

        total_heating = sum(
            b.predicted_heating_load or 0
            for b in buildings
        )

        total_cooling = sum(
            b.predicted_cooling_load or 0
            for b in buildings
        )

        total_flexible_capacity_kw = sum(a.electrical_capacity_kw or 0 for a in assets)
        total_carbon_saved_kg = sum(e.estimated_carbon_saved_kg or 0 for e in events)
        baseline_emissions_kg = max((total_heating + total_cooling) * 0.23, 0.001)
        cumulative_carbon_reduction_percent = min((total_carbon_saved_kg / baseline_emissions_kg) * 100, 100.0)
        estimated_cost_savings = (total_carbon_saved_kg * 1000.0 / 250.0) * 0.25

        return Response({
            "total_facilities": total_buildings,
            "total_heating_load": total_heating,
            "total_cooling_load": total_cooling,
            "total_flexible_capacity_kw": round(total_flexible_capacity_kw, 3),
            "cumulative_carbon_reduction_percent": round(cumulative_carbon_reduction_percent, 3),
            "estimated_carbon_avoided_kg": round(total_carbon_saved_kg, 3),
            "estimated_cost_savings_gbp": round(estimated_cost_savings, 3),
            "active_modulations": assets.filter(is_modulated_active=True).count(),
        })

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated], url_path="centralized-control")
    def centralized_control(self, request):
        """
        Trigger portfolio-wide modulation checks for all buildings owned by the user.
        Optional body: { "dry_run": true }
        """
        from api.services.asset_scheduler import run_carbon_aware_scheduler

        dry_run = bool(request.data.get("dry_run", False))
        buildings = BuildingProfile.objects.filter(owner=request.user).values_list("id", flat=True)

        results = []
        total_applied = 0
        for building_id in buildings:
            result = run_carbon_aware_scheduler(building_id, dry_run=dry_run)
            results.append({"building_id": building_id, "result": result})
            total_applied += int(result.get("applied_count", 0) or 0)

        return Response(
            {
                "status": "dry_run" if dry_run else "applied",
                "buildings_processed": len(results),
                "total_applied_modulations": total_applied,
                "results": results,
            },
            status=status.HTTP_200_OK,
        )

class FlexibleAssetViewSet(viewsets.ModelViewSet):
    """
    Provides full CRUD interface endpoints for managing flexible electrical hardware items.
    """
    queryset = FlexibleAsset.objects.all()
    serializer_class = FlexibleAssetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return FlexibleAsset.objects.filter(building__owner=self.request.user)
        return FlexibleAsset.objects.none()

    def perform_create(self, serializer):
        building = serializer.validated_data.get("building")
        if not building or building.owner_id != self.request.user.id:
            raise PermissionDenied("You can only register assets for your own buildings.")
        serializer.save()

    @action(detail=True, methods=["post"], url_path="set-modulation")
    def set_modulation(self, request, pk=None):
        """Manually set modulation state for a single asset and log an event."""
        from api.models import ModulationEvent
        from api.services.carbon_monitor import get_current_carbon_intensity

        asset = self.get_object()
        active = request.data.get("active", None)
        if active is None:
            return Response(
                {"error": "active is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if isinstance(active, bool):
            target_state = active
        elif isinstance(active, str):
            normalized = active.strip().lower()
            if normalized in {"true", "1", "yes", "on"}:
                target_state = True
            elif normalized in {"false", "0", "no", "off"}:
                target_state = False
            else:
                return Response(
                    {"error": "active must be a boolean"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            return Response(
                {"error": "active must be a boolean"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        previous_state = asset.is_modulated_active
        if previous_state == target_state:
            return Response(
                {
                    "status": "no_change",
                    "asset_id": asset.id,
                    "is_modulated_active": asset.is_modulated_active,
                    "detail": "Asset modulation state is already set.",
                },
                status=status.HTTP_200_OK,
            )

        building = asset.building
        threshold = (
            building.carbon_preference.carbon_intensity_threshold
            if hasattr(building, "carbon_preference")
            else 300.0
        )

        intensity = 0.0
        if building.grid_zone_id:
            current = get_current_carbon_intensity(building.grid_zone_id)
            if current:
                intensity = float(current.get("intensity") or 0.0)

        if target_state:
            if asset.criticality_classification == "SHEDDABLE":
                action_type = "SHUTDOWN"
            elif asset.criticality_classification == "FLEXIBLE":
                action_type = "DELAYED"
            else:
                action_type = "REDUCED"
            reason = "Manual user modulation enabled for this asset."
            estimated_saved = round((asset.electrical_capacity_kw or 0.0) * max(intensity, 0.0) * 0.5 / 1000.0, 3)
        else:
            action_type = "RESTORED"
            reason = "Manual user restore requested for this asset."
            estimated_saved = None

        asset.is_modulated_active = target_state
        asset.save(update_fields=["is_modulated_active"])

        initiated_by = request.user.email or request.user.username or "system"
        ModulationEvent.objects.create(
            asset=asset,
            building=building,
            action_type=action_type,
            trigger_type="MANUAL",
            carbon_intensity_at_time=float(intensity),
            carbon_threshold=float(threshold),
            previous_state=previous_state,
            new_state=target_state,
            reason=reason,
            estimated_carbon_saved_kg=estimated_saved,
            initiated_by=initiated_by,
        )

        return Response(
            {
                "status": "success",
                "asset_id": asset.id,
                "is_modulated_active": asset.is_modulated_active,
                "action_type": action_type,
                "trigger_type": "MANUAL",
            },
            status=status.HTTP_200_OK,
        )


class RegisterView(APIView):
    """Registration endpoint for simple email/password auth."""
    permission_classes = [AllowAny]

    def post(self, request):
        User = get_user_model()

        email = request.data.get("email") or request.data.get("username")
        password = request.data.get("password")
        first_name = (request.data.get("first_name") or "").strip()
        last_name = (request.data.get("last_name") or "").strip()
        if not email or not password or not first_name or not last_name:
            return Response(
                {"detail": "first_name, last_name, email and password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Use email as username when appropriate
        username = email if "@" in (email or "") else request.data.get("username", email)

        existing_user = User.objects.filter(username=username).first()
        created = False
        if existing_user:
            if existing_user.is_active:
                return Response({"detail": "User already exists."}, status=status.HTTP_400_BAD_REQUEST)
            existing_user.email = email
            existing_user.first_name = first_name
            existing_user.last_name = last_name
            existing_user.is_active = True
            existing_user.set_password(password)
            existing_user.save(update_fields=["email", "first_name", "last_name", "is_active", "password"])
            user = existing_user
        else:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                is_active=True,
                first_name=first_name,
                last_name=last_name,
            )
            created = True
        message = (
            "Account created successfully. You can now sign in."
            if created
            else "Account updated successfully. You can now sign in."
        )
        return Response(
            {
                "detail": message,
                "account_created": bool(created),
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user
        email = getattr(user, "email", None)
        first_name = getattr(user, "first_name", None) or "there"
        username = getattr(user, "username", None)
        deletion_email_sent = False
        if email:
            deletion_email_sent, reason = send_account_deleted_email(email=email, first_name=first_name)
            if not deletion_email_sent:
                logger.warning("Account deletion email not sent for user=%s reason=%s", username, reason)
        user.delete()
        return Response(
            {
                "detail": "Account deleted successfully.",
                "username": username,
                "deletion_email_sent": deletion_email_sent,
            },
            status=status.HTTP_200_OK,
        )


class AdminDeleteUserView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request):
        User = get_user_model()
        user_id = request.data.get("user_id") or request.query_params.get("user_id")
        email = request.data.get("email") or request.query_params.get("email")

        if not user_id and not email:
            return Response(
                {"detail": "Provide user_id or email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        filters = {}
        if user_id:
            filters["id"] = user_id
        if email:
            filters["email"] = email

        try:
            target_user = User.objects.get(**filters)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.user.id == target_user.id:
            return Response(
                {"detail": "Admins cannot delete their own account via this endpoint."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deleted_user_id = target_user.id
        deleted_email = target_user.email
        deleted_username = target_user.username
        target_user.delete()

        return Response(
            {
                "detail": "User deleted successfully.",
                "deleted_user": {
                    "id": deleted_user_id,
                    "username": deleted_username,
                    "email": deleted_email,
                },
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
                        min(max(float(building.carbon_preference.carbon_intensity_threshold), 50.0), 500.0)
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
                            "should_modulate": False,
                            "generation_mix": current.get("generation_mix", []),
                            "fuel_percentages": current.get("fuel_percentages", {}),
                            "renewable_share": current.get("renewable_share", 0.0),
                            "fossil_share": current.get("fossil_share", 0.0),
                            "green_score": current.get("green_score", 0),
                            "green_score_band": current.get("green_score_band", "poor"),
                        })

                    return Response({
                        "current_intensity": 0.0,
                        "threshold": fallback_threshold,
                        "index": "unknown",
                        "region_id": building.grid_zone_id or "UNKNOWN",
                        "timestamp": timezone.now(),
                        "source": "unavailable",
                        "should_modulate": False,
                        "generation_mix": [],
                        "fuel_percentages": {},
                        "renewable_share": 0.0,
                        "fossil_share": 0.0,
                        "green_score": 0,
                        "green_score_band": "poor",
                    })

                return Response({
                    "current_intensity": 0.0,
                    "threshold": (
                        min(max(float(building.carbon_preference.carbon_intensity_threshold), 50.0), 500.0)
                        if has_preference else 300.0
                    ),
                    "index": "unknown",
                    "region_id": building.grid_zone_id,
                    "timestamp": timezone.now(),
                    "source": "unavailable",
                    "should_modulate": False,
                    "generation_mix": [],
                    "fuel_percentages": {},
                    "renewable_share": 0.0,
                    "fossil_share": 0.0,
                    "green_score": 0,
                    "green_score_band": "poor",
                })
            
            return Response({
                "current_intensity": carbon_data["current_intensity"],
                "threshold": carbon_data["threshold"],
                "index": carbon_data["index"],
                "region_id": carbon_data["region_id"],
                "timestamp": carbon_data["timestamp"],
                "source": carbon_data["source"],
                "should_modulate": should_modulate,
                "generation_mix": carbon_data.get("generation_mix", []),
                "fuel_percentages": carbon_data.get("fuel_percentages", {}),
                "renewable_share": carbon_data.get("renewable_share", 0.0),
                "fossil_share": carbon_data.get("fossil_share", 0.0),
                "green_score": carbon_data.get("green_score", 0),
                "green_score_band": carbon_data.get("green_score_band", "poor"),
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

        def classify_intensity(intensity: float) -> str:
            if intensity < 100:
                return "very low"
            if intensity < 200:
                return "low"
            if intensity < 300:
                return "moderate"
            if intensity < 400:
                return "high"
            return "very high"
        
        try:
            building = BuildingProfile.objects.get(id=pk, owner=request.user)
            
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
                    "carbon_intensity_index": classify_intensity(event.carbon_intensity_at_time),
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
        
        Manually trigger carbon-aware modulation for registered assets in a building.
        Optional body: { "dry_run": true, "threshold": 300 }
        """
        from api.services.asset_scheduler import (
            evaluate_building_modulation,
            apply_modulation_decisions,
        )
        from api.services.carbon_monitor import get_current_carbon_intensity
        
        try:
            building = BuildingProfile.objects.get(id=pk, owner=request.user)
            dry_run = bool(request.data.get("dry_run", False))

            threshold_raw = request.data.get("threshold")
            if threshold_raw in [None, ""]:
                threshold = float(
                    (
                    building.carbon_preference.carbon_intensity_threshold
                    if hasattr(building, "carbon_preference")
                    else 300.0
                    )
                )
            else:
                try:
                    threshold = float(threshold_raw)
                except (TypeError, ValueError):
                    return Response(
                        {"error": "threshold must be a valid number"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            if threshold < 50 or threshold > 500:
                return Response(
                    {"error": "threshold must be between 50 and 500 gCO2/kWh"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not building.grid_zone_id:
                return Response(
                    {"error": "Building grid zone is missing; cannot evaluate carbon intensity"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            current = get_current_carbon_intensity(building.grid_zone_id)
            if current:
                carbon_data = {
                    "current_intensity": current["intensity"],
                    "threshold": threshold,
                    "index": current["index"],
                    "region_id": current["region_id"],
                    "timestamp": current["timestamp"],
                    "source": current["source"],
                }
            else:
                carbon_data = {
                    "current_intensity": 0.0,
                    "threshold": threshold,
                    "index": "unknown",
                    "region_id": building.grid_zone_id,
                    "timestamp": timezone.now(),
                    "source": "unavailable",
                    "generation_mix": [],
                    "fuel_percentages": {},
                    "renewable_share": 0.0,
                    "fossil_share": 0.0,
                    "green_score": 0,
                    "green_score_band": "poor",
                }

            if carbon_data["source"] == "unavailable":
                return Response(
                    {
                        "status": "skipped",
                        "message": "Carbon intensity data unavailable. Modulation skipped.",
                        "carbon_data": carbon_data,
                        "decisions": [],
                        "applied_count": 0,
                    },
                    status=status.HTTP_200_OK,
                )

            decisions = evaluate_building_modulation(building.id, carbon_data, dry_run=dry_run)
            decisions_payload = [
                {
                    "asset_id": d.asset_id,
                    "asset_name": d.asset_name,
                    "action": d.action,
                    "current_state": d.previous_state,
                    "new_state": d.new_state,
                    "estimated_carbon_saved": d.estimated_carbon_saved,
                }
                for d in decisions
            ]

            if dry_run:
                return Response(
                    {
                        "status": "dry_run",
                        "carbon_data": carbon_data,
                        "decisions": decisions_payload,
                        "applied_count": 0,
                    },
                    status=status.HTTP_200_OK,
                )

            initiated_by = request.user.email or request.user.username or "system"
            applied_count = apply_modulation_decisions(
                building.id,
                decisions,
                carbon_data,
                trigger_type="MANUAL",
                initiated_by=initiated_by,
            )

            return Response(
                {
                    "status": "success",
                    "carbon_data": carbon_data,
                    "decisions": decisions_payload,
                    "decisions_count": len(decisions_payload),
                    "applied_count": applied_count,
                },
                status=status.HTTP_200_OK,
            )
            
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
    
