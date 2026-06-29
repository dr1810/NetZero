// app/dashboard/settings/page.tsx
"use client";

import React, { useState } from "react";
import { Bell, ShieldAlert, Globe, Save, CheckCircle2 } from "lucide-react";
import { fetchBuildings, updateBuilding, BuildingProfile, NewBuildingInput } from "@/lib/api";

export default function SettingsPanel() {
  // Local states to mimic interactive dashboard adjustments
  const [backendUrl, setBackendUrl] = useState<string>("http://localhost:8000");
  const [carbonCeiling, setCarbonCeiling] = useState<number>(250);
  const [smsAlerts, setSmsAlerts] = useState<boolean>(true);
  const [emailAlerts, setEmailAlerts] = useState<boolean>(false);
  const [buildings, setBuildings] = useState<BuildingProfile[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);
  const [postcode, setPostcode] = useState<string>("");
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  React.useEffect(() => {
    fetchBuildings()
      .then((rows) => {
        setBuildings(rows);
        if (rows.length > 0) {
          setSelectedBuildingId(rows[0].id);
          setPostcode(rows[0].postcode || "");
        }
      })
      .catch(() => {
        setSaveError("Failed to load building profiles.");
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    if (selectedBuildingId) {
      const selected = buildings.find((b) => b.id === selectedBuildingId);
      if (selected) {
        const payload: NewBuildingInput = {
          postcode,
          relative_compactness: selected.relative_compactness,
          surface_area: selected.surface_area,
          wall_area: selected.wall_area,
          roof_area: selected.roof_area,
          overall_height: selected.overall_height,
          orientation: selected.orientation,
          glazing_area: selected.glazing_area,
          glazing_area_distribution: selected.glazing_area_distribution,
        };
        try {
          await updateBuilding(selectedBuildingId, payload);
        } catch (err: unknown) {
          setSaveError(err instanceof Error ? err.message : "Failed to save postcode.");
          return;
        }
      }
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000); // Reset success notification state
  };

  return (
    <>
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">System Control Center</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure backend orchestration vectors, threshold limits, and notification triggers.
        </p>
      </div>

      <form onSubmit={handleSave} className="grid gap-6 md:grid-cols-2">
        
        {/* Left Column: API & Grid Threshold Modulations */}
        <div className="space-y-6">
          
          {/* Section A: API Core Gateway Bridging */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <Globe className="h-5 w-5 text-emerald-500" />
              <h3 className="font-bold text-lg tracking-tight">API Infrastructure Routing</h3>
            </div>
            
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Django Core REST Endpoint
                </label>
                <input
                  type="text"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  className="w-full font-mono text-sm rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none transition-all focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                />
                <p className="text-[11px] text-slate-400 mt-1.5 leading-normal">
                  Points the frontend route controllers toward your running server engine. Use localhost for debugging and swap out for your cloud API URL during staging.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Regional Scope Postcode
                </label>
                <div className="grid gap-2">
                  <select
                    value={selectedBuildingId ?? ""}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setSelectedBuildingId(id);
                      const selected = buildings.find((building) => building.id === id);
                      if (selected) {
                        setPostcode(selected.postcode || "");
                      }
                    }}
                    className="w-full text-sm rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none transition-all focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                  >
                    {buildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        Building #{building.id}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    placeholder="e.g., SW1A 1AA"
                    className="w-full font-mono text-sm rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none transition-all focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-normal">
                  This postcode is validated and mapped to the National Grid ESO regional zone.
                </p>
              </div>
            </div>
          </div>

          {/* Section B: Automated Modulation Toggles */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <ShieldAlert className="h-5 w-5 text-emerald-500" />
              <h3 className="font-bold text-lg tracking-tight">Automated Modulation (Carbon Ceiling)</h3>
            </div>
            
            <div className="space-y-5 mt-5">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-slate-600 dark:text-slate-300">Max Intensity Ceiling Threshold</span>
                  <span className="font-mono text-emerald-600 font-bold">{carbonCeiling} gCO₂/kWh</span>
                </div>
                <input 
                  type="range" 
                  min="100" 
                  max="400" 
                  step="10" 
                  value={carbonCeiling} 
                  onChange={(e) => setCarbonCeiling(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="rounded-lg bg-amber-50/50 border border-amber-100 p-4 text-xs text-amber-800/90 dark:bg-amber-950/10 dark:border-amber-950/30 dark:text-amber-400 leading-relaxed">
                <strong>Modulation Protocol Active:</strong> When National Grid ESO API data crosses your configured threshold, secondary climate architectures and non-critical assets (like heavy industrial machinery or ovens) will automatically stagger cycles to preserve baseline stability.
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Proactive Alerts & Submit Configurations */}
        <div className="space-y-6 flex flex-col justify-between">
          
          {/* Section C: Proactive Notification Pipelines */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex-1">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <Bell className="h-5 w-5 text-emerald-500" />
              <h3 className="font-bold text-lg tracking-tight">Proactive Telemetry Notifications</h3>
            </div>

            <p className="text-xs text-slate-400 my-4 leading-relaxed">
              Dispatch rapid emergency telemetry signals to homeowners or facility operators prior to impending carbon grid spikes.
            </p>

            <div className="space-y-4 mt-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox"
                  checked={smsAlerts}
                  onChange={(e) => setSmsAlerts(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-slate-950 accent-emerald-500"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-emerald-500 transition-colors">SMS Dispatch Pipeline</span>
                  <p className="text-xs text-slate-400 mt-0.5">Sends automated cellular notification bursts 30 minutes before grid saturation spikes.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group pt-4 border-t border-slate-100 dark:border-slate-800">
                <input 
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-slate-950 accent-emerald-500"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-emerald-500 transition-colors">Automated ESG Email Compliance Reports</span>
                  <p className="text-xs text-slate-400 mt-0.5">Compiles monthly mitigation summaries and delivers analytical PDFs cleanly for corporate audits.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Action Trigger Row */}
          <div className="flex items-center justify-between gap-4 pt-4 sm:pt-0">
            <div className="flex-1">
              {isSaved && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-fade-in">
                  <CheckCircle2 className="h-4 w-4" /> Parameters synchronized successfully.
                </div>
              )}
              {saveError && (
                <div className="text-xs font-semibold text-red-600 dark:text-red-400">
                  {saveError}
                </div>
              )}
            </div>
            
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-emerald-500 transition-all shrink-0 font-semibold"
            >
              <Save className="h-4 w-4" /> Save System Variables
            </button>
          </div>

        </div>

      </form>
    </>
  );
}