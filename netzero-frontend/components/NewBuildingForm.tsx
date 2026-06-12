"use client";

import React, { useState } from "react";
import { createBuildingProfile, NewBuildingInput } from "@/lib/api";
import { Cpu, Loader2, CheckCircle2, AlertTriangle, X } from "lucide-react";

interface FormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void; 
}

export default function NewBuildingForm({ isOpen, onClose, onSuccess }: FormProps) {
  const [formData, setFormData] = useState<NewBuildingInput>({
    user_email: "",
    postcode: "",
    relative_compactness: 0.7,
    surface_area: 150,
    wall_area: 120,
    roof_area: 80,
    overall_height: 3.5,
    orientation: 2,
    glazing_area: 0.25,
    glazing_area_distribution: 1,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inferenceResult, setInferenceResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const result = await createBuildingProfile(formData);
      setInferenceResult(result);
      await onSuccess(); 
      
      setTimeout(() => {
        onClose();
        setInferenceResult(null); 
      }, 3000);
      
    } catch (err: any) {
      setError(err.message || "Engine validation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl font-sans max-h-[90vh] overflow-y-auto">
        
        <button 
          onClick={onClose}
          type="button"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <Cpu className="h-5 w-5 text-emerald-500" />
          <h2 className="text-base font-bold text-slate-900">Initialize Digital Twin Telemetry</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Operator Email</label>
              <input
                type="email"
                name="user_email"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-emerald-500"
                placeholder="operator@netzero.internal"
                value={formData.user_email}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">UK Postcode</label>
              <input
                type="text"
                name="postcode"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-emerald-500"
                placeholder="E1 6AN"
                value={formData.postcode}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Compactness</label>
              <input type="number" step="0.01" name="relative_compactness" className="w-full rounded-lg border border-slate-200 p-2 text-xs" value={formData.relative_compactness} onChange={handleInputChange} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Surface Area (m²)</label>
              <input type="number" step="0.1" name="surface_area" className="w-full rounded-lg border border-slate-200 p-2 text-xs" value={formData.surface_area} onChange={handleInputChange} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Wall Area (m²)</label>
              <input type="number" step="0.1" name="wall_area" className="w-full rounded-lg border border-slate-200 p-2 text-xs" value={formData.wall_area} onChange={handleInputChange} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Roof Area (m²)</label>
              <input type="number" step="0.1" name="roof_area" className="w-full rounded-lg border border-slate-200 p-2 text-xs" value={formData.roof_area} onChange={handleInputChange} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Overall Height (m)</label>
              <input type="number" step="0.1" name="overall_height" className="w-full rounded-lg border border-slate-200 p-2 text-xs" value={formData.overall_height} onChange={handleInputChange} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Orientation</label>
              <input type="number" name="orientation" className="w-full rounded-lg border border-slate-200 p-2 text-xs" value={formData.orientation} onChange={handleInputChange} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Glazing Area</label>
              <input type="number" step="0.01" name="glazing_area" className="w-full rounded-lg border border-slate-200 p-2 text-xs" value={formData.glazing_area} onChange={handleInputChange} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Glazing Dist.</label>
              <input type="number" name="glazing_area_distribution" className="w-full rounded-lg border border-slate-200 p-2 text-xs" value={formData.glazing_area_distribution} onChange={handleInputChange} />
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-2/3 flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  Running Inferences...
                </>
              ) : (
                "Compile & Instantiate Twin"
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-xs">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {inferenceResult && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 font-sans animate-fadeIn">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              System Response: {inferenceResult.status}
            </div>
            
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-[11px] font-mono text-slate-600 bg-white/80 rounded-lg p-3 border border-emerald-100">
              <div>
                <span className="text-slate-400 block uppercase text-[9px] font-bold tracking-wider">Grid Zone Identification</span>
                <span className="text-slate-800 font-semibold text-xs">{inferenceResult.mapped_grid_zone}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-[9px] font-bold tracking-wider">Calculated Base Load</span>
                <span className="text-emerald-700 font-bold text-xs">{inferenceResult.calculated_base_load_kw} kW</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-[9px] font-bold tracking-wider">Thermal Inertia Value</span>
                <span className="text-blue-700 font-bold text-xs">{inferenceResult.thermal_inertia_coefficient}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
