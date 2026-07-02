"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BuildingProfile,
  EnergyPlannerAlternative,
  EnergyPlannerRequest,
  EnergyPlannerResponse,
  fetchBuildingSchedule,
  planGreenEnergy,
  savePlannerRecommendation,
  schedulePlannerModulation,
} from "@/lib/api";
import { Leaf, Loader2, Sparkles } from "lucide-react";

interface GreenEnergyPlannerProps {
  buildings: BuildingProfile[];
  preferredBuildingId?: number | null;
}

const DEVICE_OPTIONS: Array<{ value: EnergyPlannerRequest["device_type"]; label: string }> = [
  { value: "washing_machine", label: "Washing Machine" },
  { value: "dishwasher", label: "Dishwasher" },
  { value: "ev_charger", label: "EV Charger" },
  { value: "hvac", label: "HVAC System" },
  { value: "water_heater", label: "Water Heater" },
  { value: "flexible_load", label: "Other Flexible Load" },
];

function bandClasses(band: EnergyPlannerAlternative["band"]) {
  if (band === "green") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (band === "yellow") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

export default function GreenEnergyPlanner({ buildings, preferredBuildingId = null }: GreenEnergyPlannerProps) {
  const router = useRouter();
  const [form, setForm] = useState<EnergyPlannerRequest>({
    building_id: buildings[0]?.id,
    device_type: "washing_machine",
    duration_hours: 2,
    earliest_start: "08:00",
    latest_finish: "20:00",
    flexibility_level: "medium",
  });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<"schedule" | "modulation" | "save" | "scheduleFuture" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EnergyPlannerResponse | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (preferredBuildingId && form.building_id !== preferredBuildingId) {
      setForm((prev) => ({ ...prev, building_id: preferredBuildingId }));
      return;
    }
    if (!form.building_id && buildings[0]?.id) {
      setForm((prev) => ({ ...prev, building_id: buildings[0].id }));
    }
  }, [buildings, form.building_id, preferredBuildingId]);

  const updateField = <K extends keyof EnergyPlannerRequest>(key: K, value: EnergyPlannerRequest[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setActionMessage(null);
      console.log("ENERGY PLANNER FORM SUBMIT:", form);
      const response = await planGreenEnergy(form);
      setResult(response);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate green energy plan.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const scheduleWeights = () => {
    const flexibility = form.flexibility_level ?? "medium";
    if (flexibility === "high") {
      return { carbonWeight: 0.65, costWeight: 0.2, comfortWeight: 0.15 };
    }
    if (flexibility === "low") {
      return { carbonWeight: 0.45, costWeight: 0.2, comfortWeight: 0.35 };
    }
    return { carbonWeight: 0.55, costWeight: 0.2, comfortWeight: 0.25 };
  };

  const plannerActionPayload = () => {
    if (!result || !form.building_id) return null;
    return {
      building_id: form.building_id,
      device_type: result.device_type,
      duration_hours: form.duration_hours,
      earliest_start: form.earliest_start,
      latest_finish: form.latest_finish,
      recommended_start: result.recommended_start,
      recommended_end: result.recommended_end,
      flexibility_level: result.flexibility_level,
      carbon_intensity: result.carbon_intensity,
      estimated_savings_kg: result.estimated_savings_kg,
      alternatives: result.alternatives,
    };
  };

  const handleScheduleAction = async () => {
    if (!result) return;
    try {
      setActionLoading("schedule");
      setActionMessage(null);
      const weights = scheduleWeights();
      await fetchBuildingSchedule(result.building_id, weights);
      const params = new URLSearchParams({
        tab: "schedules",
        plannerStart: result.recommended_start,
        plannerEnd: result.recommended_end,
        plannerDevice: result.device_type,
        plannerCarbon: String(result.carbon_intensity),
        plannerSavings: String(result.estimated_savings_kg),
        carbonWeight: String(weights.carbonWeight),
        costWeight: String(weights.costWeight),
        comfortWeight: String(weights.comfortWeight),
      });
      router.push(`/dashboard/buildings/${result.building_id}?${params.toString()}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate pre-filled schedule.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleModulationAction = async () => {
    if (!result) return;
    setActionLoading("modulation");
    setActionMessage(null);
    const params = new URLSearchParams({
      buildingId: String(result.building_id),
      plannerStart: result.recommended_start,
      plannerEnd: result.recommended_end,
      plannerDevice: result.device_type,
      plannerCarbon: String(result.carbon_intensity),
      plannerSavings: String(result.estimated_savings_kg),
    });
    router.push(`/dashboard/carbon?${params.toString()}`);
  };

  const handleSaveRecommendation = async () => {
    const payload = plannerActionPayload();
    if (!payload) return;
    try {
      setActionLoading("save");
      setError(null);
      setActionMessage(null);
      await savePlannerRecommendation(payload);
      setActionMessage("Planner recommendation saved for later review.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save planner recommendation.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleScheduleFutureModulation = async () => {
    const payload = plannerActionPayload();
    if (!payload) return;
    try {
      setActionLoading("scheduleFuture");
      setError(null);
      setActionMessage(null);
      const response = await schedulePlannerModulation(payload);
      const recommendation = response && typeof response === "object" ? (response as { recommendation?: { scheduled_for?: string | null } }).recommendation : undefined;
      const scheduledFor = recommendation?.scheduled_for ? new Date(recommendation.scheduled_for).toLocaleString() : payload.recommended_start;
      setActionMessage(`Scheduled future modulation check for ${scheduledFor}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to schedule future modulation.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <section className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4 border-b border-emerald-100 pb-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-emerald-700">
            <Leaf className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-[0.18em]">Green Energy Planner</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Plan flexible devices around the cleanest forecast window</h2>
          <p className="mt-1 text-sm text-slate-500">
            Pick a device, define the operating window, and NetZero will suggest the lowest-carbon start slots.
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-right">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Reusable</div>
          <div className="text-xs text-emerald-800">EV, laundry, hot water, HVAC</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Building</label>
            <select
              value={form.building_id ?? ""}
              onChange={(e) => updateField("building_id", Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.postcode}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Device Type</label>
            <select
              value={form.device_type}
              onChange={(e) => updateField("device_type", e.target.value as EnergyPlannerRequest["device_type"])}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {DEVICE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Earliest Start</label>
            <input
              type="time"
              value={form.earliest_start}
              onChange={(e) => updateField("earliest_start", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Latest Finish</label>
            <input
              type="time"
              value={form.latest_finish}
              onChange={(e) => updateField("latest_finish", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Duration (hours)</label>
            <input
              type="number"
              min={0.5}
              max={12}
              step={0.5}
              value={form.duration_hours}
              onChange={(e) => updateField("duration_hours", Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Flexibility Level</label>
            <select
              value={form.flexibility_level ?? "medium"}
              onChange={(e) => updateField("flexibility_level", e.target.value as "low" | "medium" | "high")}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={loading || buildings.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Find Greenest Slots
            </button>
            <p className="text-xs text-slate-500">
              Uses stored carbon-intensity forecast windows already powering the scheduler.
            </p>
          </div>

          {error && <p className="sm:col-span-2 text-sm text-rose-600">{error}</p>}
          {actionMessage && <p className="sm:col-span-2 text-sm text-emerald-700">{actionMessage}</p>}
        </form>

        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
          {!result ? (
            <div className="flex h-full min-h-[220px] items-center justify-center text-center text-sm text-slate-500">
              Submit a planning request to see recommended green time slots and estimated CO2 savings.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Best Window</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {result.recommended_start} - {result.recommended_end}
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  Forecast carbon intensity: <span className="font-semibold text-slate-900">{result.carbon_intensity.toFixed(1)} gCO₂/kWh</span>
                </div>
                <div className="text-sm text-slate-600">
                  Estimated savings: <span className="font-semibold text-emerald-700">{result.estimated_savings_kg.toFixed(3)} kg CO₂</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">Building {result.building_postcode} • Flexibility {result.flexibility_level}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSaveRecommendation}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {actionLoading === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Save Recommendation
                  </button>
                  <button
                    type="button"
                    onClick={handleScheduleAction}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {actionLoading === "schedule" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Create Pre-Filled Schedule
                  </button>
                  <button
                    type="button"
                    onClick={handleScheduleFutureModulation}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-400 disabled:opacity-60"
                  >
                    {actionLoading === "scheduleFuture" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Schedule Future Modulation
                  </button>
                  <button
                    type="button"
                    onClick={handleModulationAction}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {actionLoading === "modulation" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Open Modulation Controls
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Recommended Slots</div>
                <div className="space-y-2">
                  {result.alternatives.map((slot, index) => (
                    <div key={`${slot.start}-${slot.end}-${index}`} className={`rounded-lg border p-3 ${bandClasses(slot.band)}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold">{slot.start} - {slot.end}</div>
                          <div className="text-xs opacity-80">
                            {slot.carbon_intensity.toFixed(1)} gCO₂/kWh • Saves {slot.estimated_savings_kg.toFixed(3)} kg CO₂
                          </div>
                        </div>
                        <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
                          {slot.band}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}