"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createBuildingProfile, updateBuilding, NewBuildingInput, BuildingProfile } from "@/lib/api";
import { Cpu, Loader2, CheckCircle2, AlertTriangle, X } from "lucide-react";

const AVAILABLE_POSTCODES = [
  { code: "EC1A 1BB", label: "EC1A 1BB - London Central" },
  { code: "E16 4AN", label: "E16 4AN - London Docklands" },
  { code: "IV1 1SG", label: "IV1 1SG - North Scotland (Highlands)" },
  { code: "EH1 1RE", label: "EH1 1RE - South Scotland (Edinburgh)" },
  { code: "G1 1HX", label: "G1 1HX - South Scotland (Glasgow)" },
  { code: "M1 1AE", label: "M1 1AE - North West England (Manchester)" },
  { code: "NE1 1EN", label: "NE1 1EN - North East England (Newcastle)" },
  { code: "S1 2BP", label: "S1 2BP - South Yorkshire (Sheffield)" },
  { code: "B1 1TF", label: "B1 1TF - West Midlands (Birmingham)" },
  { code: "NG1 1AA", label: "NG1 1AA - East Midlands (Nottingham)" },
  { code: "LL11 1AY", label: "LL11 1AY - North Wales & Merseyside" },
  { code: "CF10 1EP", label: "CF10 1EP - South Wales (Cardiff)" },
  { code: "CB1 1PT", label: "CB1 1PT - East England (Cambridge)" },
  { code: "BS1 5TR", label: "BS1 5TR - South West England (Bristol)" },
  { code: "SO14 3FE", label: "SO14 3FE - Southern England (Southampton)" },
  { code: "BN1 1GE", label: "BN1 1GE - South East England (Brighton)" }
];

interface FormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: BuildingProfile | null;
}

export default function NewBuildingModal({ isOpen, onClose, onSuccess, initialData = null }: FormProps) {
  const [formData, setFormData] = useState<NewBuildingInput>({
    postcode: AVAILABLE_POSTCODES[0].code,
    relative_compactness: 0.7,
    surface_area: 150,
    wall_area: 120,
    roof_area: 80,
    overall_height: 3.5,
    orientation: 2,
    glazing_area: 0.25,
    glazing_area_distribution: 1,
  });

  // When editing, populate form with incoming data
  React.useEffect(() => {
    if (initialData && isOpen) {
      setFormData({
        postcode: initialData.postcode || AVAILABLE_POSTCODES[0].code,
        relative_compactness: initialData.relative_compactness || 0.7,
        surface_area: initialData.surface_area || 150,
        wall_area: initialData.wall_area || 120,
        roof_area: initialData.roof_area || 80,
        overall_height: initialData.overall_height || 3.5,
        orientation: initialData.orientation || 2,
        glazing_area: initialData.glazing_area || 0.25,
        glazing_area_distribution: initialData.glazing_area_distribution || 1,
      });
    }
    if (!isOpen) {
      // reset internal state when closed
      setFormData({
        postcode: AVAILABLE_POSTCODES[0].code,
        relative_compactness: 0.7,
        surface_area: 150,
        wall_area: 120,
        roof_area: 80,
        overall_height: 3.5,
        orientation: 2,
        glazing_area: 0.25,
        glazing_area_distribution: 1,
      });
      setExistingId(null);
      setError(null);
      setInferenceResult(null);
    }
  }, [initialData, isOpen]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inferenceResult, setInferenceResult] = useState<any | null>(null);
  const [existingId, setExistingId] = useState<number | null>(null);
  const router = useRouter();

  if (!isOpen) return null;

  // Handles both text inputs and select dropdowns
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInferenceResult(null);

    try {
      let result;
      if (initialData && initialData.id) {
        result = await updateBuilding(initialData.id, formData);
      } else {
        result = await createBuildingProfile(formData);
      }
      setInferenceResult(result);
      onSuccess();
      onClose();
    } catch (err: any) {
      // Try to parse structured backend message containing building_profile_id
      let msg = err.message || "Engine validation failed.";
      try {
        const parsed = JSON.parse(msg);
          if (parsed && parsed.building_profile_id) {
          setExistingId(parsed.building_profile_id);
          msg = parsed.detail || parsed.errors || msg;
        }
      } catch (e) {
        // not JSON, ignore
      }
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl font-sans">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <Cpu className="h-5 w-5 text-emerald-500" />
          <h2 className="text-base font-bold text-slate-900">Initialize Digital Twin Telemetry</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">UK Postcode</label>
              <select name="postcode" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs bg-white" value={formData.postcode} onChange={handleInputChange}>
                {AVAILABLE_POSTCODES.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Parameters Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Map your fields here clearly to ensure no divs are closed prematurely */}
            {['relative_compactness', 'surface_area', 'wall_area', 'roof_area', 'overall_height', 'orientation', 'glazing_area', 'glazing_area_distribution'].map((field) => (
              <div key={field}>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{field.replace('_', ' ')}</label>
                <input type="number" step="0.01" name={field} className="w-full rounded-lg border border-slate-200 p-2 text-xs" value={(formData as any)[field]} onChange={handleInputChange} />
              </div>
            ))}
          </div>

          <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white p-3 rounded-xl text-xs font-semibold hover:bg-slate-800">
            {loading ? "Processing..." : "Compile & Instantiate Twin"}
          </button>
        </form>

        {/* Error dialog */}
        {error && (
          <div className="mt-6 p-4 rounded-xl border border-red-200 bg-red-50/60">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <p className="text-sm font-semibold text-red-700">Action Required</p>
                </div>
                <p className="mt-2 text-xs text-red-700">{error}</p>
              </div>
              <div className="flex items-center gap-2">
                {existingId && (
                  <button
                    onClick={() => {
                      // navigate to existing building profile page
                      router.push(`/dashboard/buildings/${existingId}`);
                      onClose();
                    }}
                    className="rounded-md bg-slate-800 px-3 py-1 text-xs font-semibold text-white"
                  >
                    View Profile
                  </button>
                )}
                <button onClick={() => { setError(null); setExistingId(null); }} className="ml-2 rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Inference Results display */}
        {inferenceResult && (
           <div className="mt-6 p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
             {/* ... Result details ... */}
           </div>
        )}
      </div>
    </div>
  );
}