"""
Asset Scheduler Service

Carbon-aware load shifting logic that determines which assets to modulate
based on current carbon intensity vs building thresholds.
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import timedelta
from django.utils import timezone
from django.db import transaction

logger = logging.getLogger(__name__)


class ModulationDecision:
    """Represents a decision to modulate an asset."""
    
    def __init__(
        self,
        asset_id: int,
        asset_name: str,
        action: str,
        reason: str,
        previous_state: bool,
        new_state: bool,
        estimated_carbon_saved: Optional[float] = None
    ):
        self.asset_id = asset_id
        self.asset_name = asset_name
        self.action = action
        self.reason = reason
        self.previous_state = previous_state
        self.new_state = new_state
        self.estimated_carbon_saved = estimated_carbon_saved
    
    def __repr__(self):
        return f"ModulationDecision(asset={self.asset_name}, action={self.action})"


def evaluate_building_modulation(
    building_id: int,
    carbon_data: Dict[str, Any],
    dry_run: bool = False
) -> List[ModulationDecision]:
    """
    Evaluate which assets in a building should be modulated based on carbon intensity.
    
    Args:
        building_id: BuildingProfile ID
        carbon_data: Dict with current_intensity, threshold, etc from carbon_monitor
        dry_run: If True, return decisions without applying them
    
    Returns:
        List of ModulationDecision objects
    """
    from api.models import BuildingProfile, FlexibleAsset
    
    try:
        building = BuildingProfile.objects.prefetch_related('flexible_assets').get(id=building_id)
        assets = building.flexible_assets.all()
        
        if not assets.exists():
            logger.info(f"Building {building_id} has no flexible assets")
            return []
        
        current_intensity = carbon_data["current_intensity"]
        threshold = carbon_data["threshold"]
        should_modulate = current_intensity > threshold
        
        decisions = []
        
        for asset in assets:
            decision = _evaluate_asset(asset, current_intensity, threshold, should_modulate)
            if decision:
                decisions.append(decision)
        
        logger.info(
            f"Building {building_id}: {len(decisions)} modulation decisions "
            f"(intensity={current_intensity:.1f}, threshold={threshold:.1f})"
        )
        
        return decisions
        
    except Exception as e:
        logger.error(f"Failed to evaluate building {building_id}: {e}")
        return []


def _evaluate_asset(
    asset,
    current_intensity: float,
    threshold: float,
    should_modulate: bool
) -> Optional[ModulationDecision]:
    """
    Evaluate a single asset and determine if it should be modulated.
    
    Returns ModulationDecision if action needed, None otherwise.
    """
    current_state = asset.is_modulated_active
    criticality = asset.criticality_classification
    
    # Decide new state based on carbon intensity
    if should_modulate:
        # CRITICAL assets are never modulated automatically.
        if criticality == "CRITICAL":
            return None

        # Carbon is high - activate modulation if not already active
        if not current_state:
            strategy = _resolve_modulation_strategy(asset)
            if strategy is None:
                return None
            action = strategy["action"]
            reason = (
                f"Carbon intensity ({current_intensity:.1f} gCO2/kWh) exceeds "
                f"threshold ({threshold:.1f} gCO2/kWh). Applying {strategy['label']} strategy."
            )
            estimated_saved = _estimate_carbon_savings(
                asset,
                current_intensity,
                effectiveness_factor=strategy["effectiveness"],
            )
            
            return ModulationDecision(
                asset_id=asset.id,
                asset_name=asset.name,
                action=action,
                reason=reason,
                previous_state=current_state,
                new_state=True,
                estimated_carbon_saved=estimated_saved
            )
    else:
        # Carbon is low - restore all modulated assets to normal operation.
        if current_state:
            reason = (
                f"Carbon intensity ({current_intensity:.1f} gCO2/kWh) below "
                f"threshold ({threshold:.1f} gCO2/kWh). Restoring normal operation."
            )
            
            return ModulationDecision(
                asset_id=asset.id,
                asset_name=asset.name,
                action="RESTORED",
                reason=reason,
                previous_state=current_state,
                new_state=False,
                estimated_carbon_saved=None
            )
    
    return None


def _determine_action_type(criticality: str) -> str:
    """
    Map criticality level to action type.
    
    FLEXIBLE assets can be delayed or reduced.
    SHEDDABLE assets can be temporarily shut down.
    """
    if criticality == "SHEDDABLE":
        return "SHUTDOWN"
    elif criticality == "FLEXIBLE":
        return "DELAYED"
    else:
        return "REDUCED"


def _resolve_modulation_strategy(asset) -> Optional[Dict[str, Any]]:
    """Return action/effectiveness based on asset type heuristics and criticality."""
    name = (getattr(asset, "name", "") or "").lower()

    # Preserve refrigeration continuity by default.
    if any(keyword in name for keyword in ["fridge", "freezer", "refrigeration", "cold room"]):
        return None

    # Asset-specific smart logic
    if "ev" in name or "charger" in name:
        return {
            "action": "DELAYED",
            "effectiveness": 0.5,
            "label": "EV charger delay",
        }

    if any(keyword in name for keyword in ["hvac", "air", "chiller", "heat pump", "ahu", "ventilation"]):
        return {
            "action": "REDUCED",
            "effectiveness": 0.5,
            "label": "HVAC capacity reduction",
        }

    if "light" in name:
        return {
            "action": "SHUTDOWN",
            "effectiveness": 0.8,
            "label": "lighting shutdown",
        }

    if any(keyword in name for keyword in ["induction", "cooker", "oven", "toaster"]):
        return {
            "action": "DELAYED",
            "effectiveness": 0.5,
            "label": "cooking load delay",
        }

    # Fallback strategy for assets without a recognized type
    if asset.criticality_classification == "SHEDDABLE":
        action = "SHUTDOWN"
    else:
        action = "REDUCED"
    if action == "SHUTDOWN":
        effectiveness = 0.8
    elif action in {"DELAYED", "REDUCED"}:
        effectiveness = 0.5
    else:
        effectiveness = 0.5

    return {
        "action": action,
        "effectiveness": effectiveness,
        "label": "standard modulation",
    }


def _estimate_carbon_savings(asset, current_intensity: float, effectiveness_factor: float) -> float:
    """
    Estimate carbon savings from modulating an asset.
    
    Rough calculation: assume asset runs at capacity for 1 hour
    and modulation avoids 50-80% of that emissions.
    """
    capacity_kw = asset.electrical_capacity_kw
    hours = 1.0
    
    # Carbon saved = capacity * hours * intensity * effectiveness / 1000 (gCO2 to kg)
    saved_kg = (capacity_kw * hours * current_intensity * effectiveness_factor) / 1000.0
    
    return round(saved_kg, 3)


@transaction.atomic
def apply_modulation_decisions(
    building_id: int,
    decisions: List[ModulationDecision],
    carbon_data: Dict[str, Any],
    trigger_type: str = "AUTOMATIC",
    initiated_by: str = "system"
) -> int:
    """
    Apply modulation decisions by updating asset states and logging events.
    
    Args:
        building_id: BuildingProfile ID
        decisions: List of ModulationDecision objects
        carbon_data: Carbon intensity context
        trigger_type: AUTOMATIC, MANUAL, or SCHEDULED
        initiated_by: User email or 'system'
    
    Returns:
        Number of successfully applied modulations
    """
    from api.models import FlexibleAsset, ModulationEvent, BuildingProfile
    
    if not decisions:
        return 0
    
    try:
        building = BuildingProfile.objects.get(id=building_id)
        applied_count = 0
        
        for decision in decisions:
            try:
                asset = FlexibleAsset.objects.get(id=decision.asset_id)
                
                # Update asset state
                asset.is_modulated_active = decision.new_state
                asset.save(update_fields=['is_modulated_active'])
                
                # Log modulation event
                ModulationEvent.objects.create(
                    asset=asset,
                    building=building,
                    action_type=decision.action,
                    trigger_type=trigger_type,
                    carbon_intensity_at_time=carbon_data["current_intensity"],
                    carbon_threshold=carbon_data["threshold"],
                    previous_state=decision.previous_state,
                    new_state=decision.new_state,
                    reason=decision.reason,
                    estimated_carbon_saved_kg=decision.estimated_carbon_saved,
                    initiated_by=initiated_by
                )
                
                applied_count += 1
                logger.info(f"Applied modulation: {decision}")
                
            except Exception as e:
                logger.error(f"Failed to apply decision for asset {decision.asset_id}: {e}")
                continue
        
        logger.info(f"Applied {applied_count}/{len(decisions)} modulations for building {building_id}")
        return applied_count
        
    except Exception as e:
        logger.error(f"Failed to apply modulations for building {building_id}: {e}")
        return 0


def run_carbon_aware_scheduler(building_id: int, dry_run: bool = False) -> Dict[str, Any]:
    """
    Main entry point: Check carbon intensity and apply modulations for a building.
    
    Args:
        building_id: BuildingProfile ID
        dry_run: If True, evaluate but don't apply changes
    
    Returns:
        Dict with status, decisions, and applied_count
    """
    from api.services.carbon_monitor import should_trigger_modulation
    
    try:
        should_modulate, carbon_data = should_trigger_modulation(building_id)
        
        if carbon_data is None:
            return {
                "status": "error",
                "message": "Could not fetch carbon intensity data",
                "decisions": [],
                "applied_count": 0
            }
        
        # Always evaluate to potentially restore assets when carbon is low
        decisions = evaluate_building_modulation(building_id, carbon_data, dry_run)
        
        if dry_run:
            return {
                "status": "dry_run",
                "carbon_data": carbon_data,
                "decisions": [
                    {
                        "asset_name": d.asset_name,
                        "action": d.action,
                        "reason": d.reason,
                        "estimated_carbon_saved": d.estimated_carbon_saved
                    }
                    for d in decisions
                ],
                "applied_count": 0
            }
        
        applied_count = 0
        if decisions:
            applied_count = apply_modulation_decisions(
                building_id,
                decisions,
                carbon_data,
                trigger_type="AUTOMATIC",
                initiated_by="system"
            )
        
        return {
            "status": "success",
            "carbon_data": carbon_data,
            "decisions_count": len(decisions),
            "applied_count": applied_count
        }
        
    except Exception as e:
        logger.error(f"Scheduler failed for building {building_id}: {e}")
        return {
            "status": "error",
            "message": str(e),
            "decisions": [],
            "applied_count": 0
        }
