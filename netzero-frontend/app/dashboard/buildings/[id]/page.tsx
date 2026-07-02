"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { fetchBuilding, fetchBuildingSchedule, BuildingProfile } from "@/lib/api";
import { Loader2, Calendar, ArrowLeft } from "lucide-react";

interface BuildingDetailData extends BuildingProfile {
  predicted_heating_load?: number | null;
  predicted_cooling_load?: number | null;
}

interface BuildingSchedule {
  generated_at: string;
  predicted_heating_load: number;
  predicted_cooling_load: number;
  windows: Record<string, string>;
}

export default function BuildingDetail() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const numericId = id ? Number(id) : NaN;
  const initialTab = searchParams?.get("tab") === "schedules" ? "schedules" : "overview";
  const plannerStart = searchParams?.get("plannerStart") || "";
  const plannerEnd = searchParams?.get("plannerEnd") || "";
  const plannerDevice = searchParams?.get("plannerDevice") || "";
  const plannerCarbon = searchParams?.get("plannerCarbon") || "";
  const plannerSavings = searchParams?.get("plannerSavings") || "";
  const carbonWeightParam = searchParams?.get("carbonWeight");
  const costWeightParam = searchParams?.get("costWeight");
  const comfortWeightParam = searchParams?.get("comfortWeight");
  const [building, setBuilding] = useState<BuildingDetailData | null>(null);
  const [schedule, setSchedule] = useState<BuildingSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "schedules">(initialTab);

  const scheduleWeights = {
    carbonWeight: carbonWeightParam ? Number(carbonWeightParam) : undefined,
    costWeight: costWeightParam ? Number(costWeightParam) : undefined,
    comfortWeight: comfortWeightParam ? Number(comfortWeightParam) : undefined,
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const b = await fetchBuilding(numericId);
        setBuilding(b);
        if (tab === 'schedules') {
          try {
            setScheduleLoading(true);
            const s = await fetchBuildingSchedule(numericId, scheduleWeights);
            setSchedule(s);
            setScheduleError(null);
          } finally {
            setScheduleLoading(false);
          }
        }
      } catch (e) {
        console.error('Error loading building or schedule:', e);
        // show friendly message in UI by setting building to null and stopping loading
        setBuilding(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [numericId, tab, carbonWeightParam, costWeightParam, comfortWeightParam]);

  if (loading) return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
    </div>
  );

  if (!building) return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <h2 className="text-lg font-semibold">Building not found or access denied</h2>
        <p className="text-sm text-slate-500">The requested building may not exist or you do not have permission to view it.</p>
        <div className="mt-4">
          <button onClick={() => router.push('/dashboard')} className="px-3 py-2 bg-slate-900 text-white rounded text-sm">Back to Dashboard</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="text-xs text-slate-500 hover:underline inline-flex items-center gap-2"><ArrowLeft className="h-4 w-4" /> Back</button>
          <h1 className="text-2xl font-bold mt-2">Building {building?.postcode}</h1>
          <p className="text-xs text-slate-400">Profile ID: {building?.id} — Owner: {building?.owner ?? '—'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTab('overview')} className={`px-3 py-1 text-xs rounded ${tab==='overview' ? 'bg-slate-900 text-white' : 'bg-slate-50'}`}>Overview</button>
          <button onClick={() => setTab('schedules')} className={`px-3 py-1 text-xs rounded ${tab==='schedules' ? 'bg-slate-900 text-white' : 'bg-slate-50'}`}>
            <Calendar className="h-4 w-4 inline mr-2" /> Schedules
          </button>
        </div>
      </div>

      {tab === 'overview' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <dl className="grid grid-cols-2 gap-4 text-sm text-slate-700">
            <div><dt className="text-xs text-slate-400">Postcode</dt><dd className="font-medium">{building?.postcode}</dd></div>
            <div><dt className="text-xs text-slate-400">Surface Area</dt><dd className="font-medium">{building?.surface_area} m²</dd></div>
            <div><dt className="text-xs text-slate-400">Orientation</dt><dd className="font-medium">{building?.orientation}</dd></div>
            <div><dt className="text-xs text-slate-400">Predicted Heating Load</dt><dd className="font-medium">{building?.predicted_heating_load} kW</dd></div>
          </dl>
        </div>
      )}

      {tab === 'schedules' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          {plannerStart && plannerEnd && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <div className="font-semibold">Planner handoff applied</div>
              <div className="mt-1">
                Recommended window for {plannerDevice.replaceAll("_", " ")}: {plannerStart} - {plannerEnd}
              </div>
              <div className="mt-1 text-xs text-emerald-700">
                Forecast intensity {plannerCarbon || "-"} gCO₂/kWh • Estimated savings {plannerSavings || "-"} kg CO₂.
                This schedule view was generated using planner-biased optimization weights.
              </div>
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold">Generated Schedule</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  if (isNaN(numericId)) return;
                  setScheduleError(null);
                  try {
                    setScheduleLoading(true);
                    const s = await fetchBuildingSchedule(numericId, scheduleWeights);
                    setSchedule(s);
                  } catch (err: unknown) {
                    console.error('Failed to generate schedule', err);
                    setScheduleError(err instanceof Error ? err.message : "Failed to generate schedule");
                  } finally {
                    setScheduleLoading(false);
                  }
                }}
                className="px-3 py-1 text-xs rounded bg-emerald-600 text-white"
              >
                {scheduleLoading ? 'Generating…' : 'Generate Schedule'}
              </button>
              {schedule && (
                <>
                  <button
                    onClick={() => {
                      try {
                        const txt = JSON.stringify(schedule, null, 2);
                        navigator.clipboard?.writeText(txt);
                      } catch (e) {}
                    }}
                    className="px-3 py-1 text-xs rounded bg-slate-100"
                  >Copy JSON</button>
                  <button
                    onClick={() => {
                      try {
                        const blob = new Blob([JSON.stringify(schedule, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `schedule_building_${numericId}.json`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      } catch (e) {}
                    }}
                    className="px-3 py-1 text-xs rounded bg-slate-100"
                  >Download</button>
                </>
              )}
            </div>
          </div>
          {scheduleError && <p className="text-xs text-red-500">{scheduleError}</p>}
          {scheduleLoading && (
            <p className="text-xs text-slate-500">Generating schedule…</p>
          )}
          {!schedule ? (
            <p className="text-xs text-slate-400">No schedule available. Click &quot;Generate Schedule&quot; to create one.</p>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-slate-500">Generated at: <span className="font-mono">{new Date(schedule.generated_at).toLocaleString()}</span></div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
                <div className="mb-2"><strong>Predicted Heating:</strong> {schedule.predicted_heating_load} kW</div>
                <div className="mb-2"><strong>Predicted Cooling:</strong> {schedule.predicted_cooling_load} kW</div>
                <div>
                  <strong>Windows</strong>
                  <table className="w-full text-xs mt-2">
                    <thead>
                      <tr className="text-left text-slate-400"><th className="pr-4">Time Range</th><th>Level</th></tr>
                    </thead>
                    <tbody>
                      {schedule.windows && Object.entries(schedule.windows).map(([range, level]) => (
                        <tr key={range} className="border-t border-transparent hover:border-slate-200">
                          <td className="py-1 pr-4 font-mono">{range}</td>
                          <td className="py-1">{level}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
