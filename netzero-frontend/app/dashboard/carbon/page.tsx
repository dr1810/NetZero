"use client";

import React, { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchBuildings,
  getCarbonIntensity,
  getModulationEvents,
  triggerModulation,
  setAssetModulation,
  fetchAssets,
  BuildingProfile,
  AssetProfile,
  CarbonIntensityResponse,
  ModulationEvent,
  TriggerModulationResponse,
} from "@/lib/api";
import {
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Play,
  Eye,
  RefreshCw,
} from "lucide-react";
import GreenEnergyPlanner from "@/components/GreenEnergyPlanner";

const CARBON_DEBUG = process.env.NEXT_PUBLIC_CARBON_DEBUG === "true";

function carbonDebug(message: string, payload?: unknown) {
  if (!CARBON_DEBUG) return;
  if (typeof payload === "undefined") {
    console.debug(message);
    return;
  }
  console.debug(message, payload);
}

function CarbonMonitoringPageContent() {
  const searchParams = useSearchParams();
  const [buildings, setBuildings] = useState<BuildingProfile[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null);
  const [carbonData, setCarbonData] = useState<CarbonIntensityResponse | null>(null);
  const [events, setEvents] = useState<ModulationEvent[]>([]);
  const [assets, setAssets] = useState<AssetProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [assetActionId, setAssetActionId] = useState<number | null>(null);
  const [dryRunResult, setDryRunResult] = useState<TriggerModulationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedReasonEventId, setExpandedReasonEventId] = useState<number | null>(null);
  const plannerBuildingId = Number(searchParams?.get("buildingId") || "") || null;
  const plannerStart = searchParams?.get("plannerStart") || "";
  const plannerEnd = searchParams?.get("plannerEnd") || "";
  const plannerDevice = searchParams?.get("plannerDevice") || "";
  const plannerCarbon = searchParams?.get("plannerCarbon") || "";
  const plannerSavings = searchParams?.get("plannerSavings") || "";

  const loadBuildings = useCallback(async () => {
    try {
      const data = await fetchBuildings();
      setBuildings(data);
      if (plannerBuildingId && data.some((building) => building.id === plannerBuildingId)) {
        setSelectedBuilding(plannerBuildingId);
      } else if (data.length > 0) {
        setSelectedBuilding(data[0].id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load buildings';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [plannerBuildingId]);

  const loadCarbonData = useCallback(async () => {
    if (!selectedBuilding) return;

    try {
      setRefreshing(true);
      const [carbonRes, eventsRes, assetsRes] = await Promise.all([
        getCarbonIntensity(selectedBuilding),
        getModulationEvents(selectedBuilding, 1, 10),
        fetchAssets(),
      ]);

      carbonDebug("[CarbonPage] loadCarbonData raw results", {
        selectedBuilding,
        carbonRes,
        eventsCount: eventsRes?.results?.length ?? 0,
        assetsCount: assetsRes?.length ?? 0,
      });

      setCarbonData(carbonRes);
      setEvents(eventsRes.results);
      setAssets(assetsRes.filter((a) => a.building === selectedBuilding));
      setError(null);
    } catch (err: unknown) {
      // Check if it's a 503 service unavailable
      let message = 'Failed to load carbon data';
      
      if (err instanceof Error) {
        try {
          const errorData = JSON.parse(err.message);
          if (errorData.status === 503) {
            message = '⚠️ Backend not ready: Database migrations need to be applied on Render. Please run: python manage.py migrate';
          } else if (errorData.status === 404) {
            message = 'Carbon preferences not configured for this building. Please create one via Django admin.';
          } else {
            message = errorData.message || err.message;
          }
        } catch {
          message = err.message;
        }
      }
      
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }, [selectedBuilding]);

  useEffect(() => {
    if (!selectedBuilding) return;
    carbonDebug("[CarbonPage] render-state update", {
      selectedBuilding,
      carbonData,
      eventsCount: events.length,
      assetsCount: assets.length,
      error,
    });
  }, [selectedBuilding, carbonData, events.length, assets.length, error]);

  const handleTrigger = async (dryRun: boolean) => {
    if (!selectedBuilding) return;

    try {
      setTriggerLoading(true);
      const result = await triggerModulation(selectedBuilding, dryRun);

      if (result.status === "skipped") {
        setDryRunResult(result);
        setError(result.message || "Carbon intensity data unavailable. Modulation skipped.");
        return;
      }

      if (dryRun) {
        setDryRunResult(result);
      } else {
        setDryRunResult(null);
        // Reload data after live trigger
        await loadCarbonData();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to trigger modulation';
      setError(message);
    } finally {
      setTriggerLoading(false);
    }
  };

  const handleSetAssetModulation = async (assetId: number, nextState: boolean) => {
    try {
      setAssetActionId(assetId);
      await setAssetModulation(assetId, nextState);
      await loadCarbonData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update asset modulation state';
      setError(message);
    } finally {
      setAssetActionId(null);
    }
  };

  useEffect(() => {
    setTimeout(() => loadBuildings(), 0);
  }, [loadBuildings]);

  useEffect(() => {
    if (selectedBuilding) {
      setTimeout(() => loadCarbonData(), 0);
      const interval = setInterval(loadCarbonData, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [selectedBuilding, loadCarbonData]);

  const getCarbonLevelColor = (index: string) => {
    switch (index.toLowerCase()) {
      case "very low":
        return "text-green-600 bg-green-50";
      case "low":
        return "text-green-500 bg-green-50";
      case "moderate":
        return "text-yellow-600 bg-yellow-50";
      case "high":
        return "text-orange-600 bg-orange-50";
      case "very high":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "RESTORED":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "DELAYED":
        return <TrendingDown className="w-4 h-4 text-yellow-600" />;
      case "REDUCED":
        return <TrendingDown className="w-4 h-4 text-orange-600" />;
      case "SHUTDOWN":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const modulatedAssets = assets.filter((a) => a.is_modulated_active);
  const totalCarbonSaved = events.reduce(
    (sum, e) => sum + (e.estimated_carbon_saved_kg || 0),
    0
  );
  const topMix = (carbonData?.generation_mix || [])
    .slice()
    .sort((a, b) => b.perc - a.perc)
    .slice(0, 6);

  const parseExplainability = (event: ModulationEvent) => {
    const reason = event.reason || "";
    const intensityMatch = reason.match(/Carbon intensity \(([\d.]+) gCO2\/kWh\)/i);
    const thresholdMatch = reason.match(/threshold \(([\d.]+) gCO2\/kWh\)/i);
    const gasMatch = reason.match(/gas ([\d.]+)%/i);
    const windMatch = reason.match(/wind ([\d.]+)%/i);
    const renewableMatch = reason.match(/renewables ([\d.]+)%/i);

    return {
      summary: reason.split(".")[0] || "Modulation decision from carbon-aware scheduler.",
      intensity: intensityMatch ? Number(intensityMatch[1]) : event.carbon_intensity_at_time,
      threshold: thresholdMatch ? Number(thresholdMatch[1]) : event.carbon_threshold,
      gas: gasMatch ? Number(gasMatch[1]) : null,
      wind: windMatch ? Number(windMatch[1]) : null,
      renewables: renewableMatch ? Number(renewableMatch[1]) : null,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (buildings.length === 0) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-600" />
        <h2 className="text-xl font-semibold mb-2">No Buildings Found</h2>
        <p className="text-gray-600">
          Please create a building profile to view carbon monitoring.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Carbon-Aware Load Shifting</h1>
        <p className="text-gray-600">
          Real-time carbon intensity monitoring and asset modulation
        </p>
      </div>

      {/* Building Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Building</label>
        <select
          value={selectedBuilding || ""}
          onChange={(e) => setSelectedBuilding(Number(e.target.value))}
          className="w-full md:w-64 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              Building {b.id} - {b.postcode}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <GreenEnergyPlanner buildings={buildings} preferredBuildingId={selectedBuilding} />
      </div>

      {plannerStart && plannerEnd && plannerBuildingId === selectedBuilding && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-900">Planner handoff ready for carbon controls</p>
          <p className="mt-1 text-sm text-emerald-800">
            Suggested low-carbon window for {plannerDevice.replaceAll("_", " ")}: {plannerStart} - {plannerEnd}
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            Forecast intensity {plannerCarbon || "-"} gCO₂/kWh • Estimated savings {plannerSavings || "-"} kg CO₂.
            Use the dry run below to inspect what would happen if you modulated this building now, or trigger manually if the current grid state already warrants action.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Error Loading Carbon Data</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
          {error.includes('migrations') && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <p className="font-medium text-yellow-800 mb-1">🔧 Quick Fix:</p>
              <ol className="list-decimal list-inside text-yellow-700 space-y-1">
                <li>Go to Render Dashboard → Your Service → Shell</li>
                <li>Run: <code className="bg-yellow-100 px-1 rounded">python manage.py migrate</code></li>
                <li>Refresh this page</li>
              </ol>
              <p className="text-yellow-600 mt-2 text-xs">
                See <a href="https://github.com/dr1810/NetZero/blob/main/DEPLOYMENT_GUIDE.md" target="_blank" rel="noopener noreferrer" className="underline">DEPLOYMENT_GUIDE.md</a> for details
              </p>
            </div>
          )}
        </div>
      )}

      {/* Carbon Intensity Card */}
      {carbonData && (
        <div className="mb-6 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Current Carbon Intensity
            </h2>
            <button
              onClick={loadCarbonData}
              disabled={refreshing}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Intensity Gauge */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Intensity</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getCarbonLevelColor(
                    carbonData.index
                  )}`}
                >
                  {carbonData.index}
                </span>
              </div>
              <div className="text-5xl font-bold mb-2">
                {carbonData.current_intensity.toFixed(0)}
                <span className="text-2xl text-gray-600 ml-2">gCO₂/kWh</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    carbonData.should_modulate ? "bg-red-500" : "bg-green-500"
                  }`}
                  style={{
                    width: `${Math.min((carbonData.current_intensity / 600) * 100, 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0</span>
                <span>Threshold: {carbonData.threshold}</span>
                <span>600</span>
              </div>
            </div>

            {/* Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-2">Status</div>
              <div className="flex items-center gap-2 mb-4">
                {carbonData.should_modulate ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <span className="font-medium text-orange-600">Modulation Active</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-600">Normal Operation</span>
                  </>
                )}
              </div>
              <div className="text-xs text-gray-500">
                Updated: {new Date(carbonData.timestamp).toLocaleTimeString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Region: {carbonData.region_id} ({carbonData.source})
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Modulations */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Active Modulations
        </h2>

        {modulatedAssets.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No assets currently modulated
          </p>
        ) : (
          <div className="space-y-3">
            {modulatedAssets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
              >
                <div>
                  <div className="font-medium">{asset.name}</div>
                  <div className="text-sm text-gray-600">
                    {asset.electrical_capacity_kw} kW • {asset.criticality_classification}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-yellow-700">
                  <TrendingDown className="w-5 h-5" />
                  <span className="font-medium">Modulated</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Energy Mix Dashboard */}
      {carbonData && (
        <div className="mb-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Current Energy Mix (UK Grid)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
              <div className="text-xs text-emerald-700 uppercase tracking-wide">Green Energy Score</div>
              <div className="text-3xl font-bold text-emerald-800">{carbonData.green_score}/100</div>
              <div className="text-sm text-emerald-700 capitalize">{carbonData.green_score_band}</div>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
              <div className="text-xs text-blue-700 uppercase tracking-wide">Renewables</div>
              <div className="text-3xl font-bold text-blue-800">{carbonData.renewable_share.toFixed(1)}%</div>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 border border-orange-100">
              <div className="text-xs text-orange-700 uppercase tracking-wide">Fossil</div>
              <div className="text-3xl font-bold text-orange-800">{carbonData.fossil_share.toFixed(1)}%</div>
            </div>
          </div>

          {topMix.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {topMix.map((mix) => (
                <div key={mix.fuel} className="p-3 border rounded-lg bg-gray-50">
                  <div className="text-sm font-medium capitalize">{mix.fuel}</div>
                  <div className="text-lg font-bold">{mix.perc.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Generation mix currently unavailable.</p>
          )}
        </div>
      )}

      {/* Registered Assets */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Registered Assets
        </h2>

        {assets.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No assets registered for this building
          </p>
        ) : (
          <div className="space-y-3">
            {assets.map((asset) => {
              const isBusy = assetActionId === asset.id;
              return (
                <div
                  key={asset.id}
                  className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{asset.name}</div>
                    <div className="text-sm text-gray-600">
                      {asset.electrical_capacity_kw} kW • {asset.criticality_classification}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        asset.is_modulated_active
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {asset.is_modulated_active ? "Modulated" : "Normal"}
                    </span>
                    <button
                      onClick={() =>
                        handleSetAssetModulation(asset.id, !asset.is_modulated_active)
                      }
                      disabled={isBusy}
                      className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg disabled:opacity-60 ${
                        asset.is_modulated_active
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-orange-600 text-white hover:bg-orange-700"
                      }`}
                    >
                      {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {asset.is_modulated_active ? "Restore" : "Modulate"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Trigger */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Manual Trigger</h2>
        <div className="flex gap-3">
          <button
            onClick={() => handleTrigger(true)}
            disabled={triggerLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50"
          >
            <Eye className="w-4 h-4" />
            Dry Run
          </button>
          <button
            onClick={() => handleTrigger(false)}
            disabled={triggerLoading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {triggerLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Trigger Now
          </button>
        </div>

        {dryRunResult && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold mb-2">Dry Run Results</h3>
            <p className="text-sm mb-2">Status: {dryRunResult.status}</p>
            {dryRunResult.decisions && dryRunResult.decisions.length > 0 ? (
              <div className="space-y-2">
                {dryRunResult.decisions.map((d, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium">{d.asset_name}:</span> {d.action}
                    {d.estimated_carbon_saved && (
                      <span className="text-green-600 ml-2">
                        (saves {d.estimated_carbon_saved.toFixed(3)} kg CO₂)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No actions needed</p>
            )}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Recent Activity
          </h2>
          <div className="text-sm text-gray-600">
            Total Carbon Saved: <span className="font-bold text-green-600">{totalCarbonSaved.toFixed(3)} kg CO₂</span>
          </div>
        </div>

        {events.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No activity yet</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg"
              >
                <div className="mt-1">{getActionIcon(event.action_type)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{event.asset_name}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(event.triggered_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{event.action_type}</span> •{" "}
                    {event.carbon_intensity_at_time.toFixed(0)} gCO₂/kWh (
                    {event.carbon_intensity_index}) • Threshold:{" "}
                    {event.carbon_threshold.toFixed(0)}
                  </div>
                  {event.reason && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedReasonEventId(
                            expandedReasonEventId === event.id ? null : event.id
                          )
                        }
                        className="text-xs font-semibold text-blue-700 hover:text-blue-800"
                      >
                        {expandedReasonEventId === event.id ? "Hide why" : "Why was this action taken?"}
                      </button>

                      {expandedReasonEventId === event.id && (
                        <div className="mt-2 p-3 border border-blue-100 bg-blue-50 rounded-lg text-sm text-slate-700 space-y-1">
                          {(() => {
                            const details = parseExplainability(event);
                            return (
                              <>
                                <div className="font-medium text-slate-800">Reason Summary</div>
                                <div>{details.summary}</div>
                                <div className="pt-1">Carbon intensity: {details.intensity.toFixed(1)} gCO₂/kWh</div>
                                <div>Threshold: {details.threshold.toFixed(1)} gCO₂/kWh</div>
                                {details.gas !== null && <div>Gas generation: {details.gas.toFixed(1)}%</div>}
                                {details.wind !== null && <div>Wind generation: {details.wind.toFixed(1)}%</div>}
                                {details.renewables !== null && <div>Renewable share: {details.renewables.toFixed(1)}%</div>}
                                {event.estimated_carbon_saved_kg !== null && (
                                  <div className="font-semibold text-green-700">
                                    Estimated saving: {event.estimated_carbon_saved_kg.toFixed(3)} kg CO₂
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                  {event.estimated_carbon_saved_kg !== null && (
                    <div className="text-sm text-green-600 font-medium mt-1">
                      Saved: {event.estimated_carbon_saved_kg.toFixed(3)} kg CO₂
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CarbonMonitoringPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <CarbonMonitoringPageContent />
    </Suspense>
  );
}
