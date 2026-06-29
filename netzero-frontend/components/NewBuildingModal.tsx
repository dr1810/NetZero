"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createBuildingProfile, updateBuilding, NewBuildingInput, BuildingProfile } from "@/lib/api";
import { Cpu, AlertTriangle, X } from "lucide-react";

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

type NumericField = Exclude<keyof NewBuildingInput, "postcode">;

const NUMERIC_FIELDS: NumericField[] = [
  "relative_compactness",
  "surface_area",
  "wall_area",
  "roof_area",
  "overall_height",
  "orientation",
  "glazing_area",
  "glazing_area_distribution",
];

const INTEGER_FIELDS: NumericField[] = [
  "orientation",
  "glazing_area_distribution",
];

type BuildingFormState = {
  postcode: string;
  relative_compactness: string;
  surface_area: string;
  wall_area: string;
  roof_area: string;
  overall_height: string;
  orientation: string;
  glazing_area: string;
  glazing_area_distribution: string;
};

const DEFAULT_FORM_STATE: BuildingFormState = {
  postcode: AVAILABLE_POSTCODES[0].code,
  relative_compactness: "0.7",
  surface_area: "150",
  wall_area: "120",
  roof_area: "80",
  overall_height: "3.5",
  orientation: "2",
  glazing_area: "0.25",
  glazing_area_distribution: "1",
};

const FIELD_LABELS: Record<NumericField, string> = {
  relative_compactness: "Relative compactness",
  surface_area: "Surface area",
  wall_area: "Wall area",
  roof_area: "Roof area",
  overall_height: "Overall height",
  orientation: "Orientation",
  glazing_area: "Glazing area",
  glazing_area_distribution: "Glazing area distribution",
};

const toFormState = (data: BuildingProfile | null | undefined): BuildingFormState => {
  if (!data) return DEFAULT_FORM_STATE;
  return {
    postcode: data.postcode || DEFAULT_FORM_STATE.postcode,
    relative_compactness: String(data.relative_compactness ?? DEFAULT_FORM_STATE.relative_compactness),
    surface_area: String(data.surface_area ?? DEFAULT_FORM_STATE.surface_area),
    wall_area: String(data.wall_area ?? DEFAULT_FORM_STATE.wall_area),
    roof_area: String(data.roof_area ?? DEFAULT_FORM_STATE.roof_area),
    overall_height: String(data.overall_height ?? DEFAULT_FORM_STATE.overall_height),
    orientation: String(data.orientation ?? DEFAULT_FORM_STATE.orientation),
    glazing_area: String(data.glazing_area ?? DEFAULT_FORM_STATE.glazing_area),
    glazing_area_distribution: String(
      data.glazing_area_distribution ?? DEFAULT_FORM_STATE.glazing_area_distribution
    ),
  };
};

const normalizeNumericInput = (raw: string, isInteger: boolean): string => {
  if (raw.trim() === "") return "";
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) return raw;
  const nonNegative = Math.max(0, parsed);
  return isInteger ? String(Math.trunc(nonNegative)) : String(nonNegative);
};

const parseApiError = (errorMessage: string): { summary: string; details: string[] } => {
  try {
    const parsed = JSON.parse(errorMessage);
    const body = parsed?.body || {};
    const summary = parsed?.message || parsed?.detail || "Validation failed.";
    const details: string[] = [];
    const errors = body?.errors || body;
    if (errors && typeof errors === "object") {
      for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
        const values = Array.isArray(value) ? value : [value];
        for (const msg of values) {
          if (typeof msg === "string") {
            details.push(`${key.replaceAll("_", " ")}: ${msg}`);
          }
        }
      }
    }
    return { summary, details };
  } catch {
    return { summary: errorMessage, details: [] };
  }
};

export default function NewBuildingModal({ isOpen, onClose, onSuccess, initialData = null }: FormProps) {
  const [formData, setFormData] = useState<BuildingFormState>(DEFAULT_FORM_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [inferenceResult, setInferenceResult] = useState<Record<string, unknown> | null>(null);
  const [existingId, setExistingId] = useState<number | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<NumericField, string>>>({});
  const router = useRouter();

  // When editing, populate form with incoming data
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (initialData && isOpen) {
        setFormData(toFormState(initialData));
      }
      if (!isOpen) {
        setFormData(DEFAULT_FORM_STATE);
        setExistingId(null);
        setError(null);
        setErrorDetails([]);
        setFieldErrors({});
        setInferenceResult(null);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handlePostcodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, postcode: e.target.value }));
  };

  const handleNumericChange = (field: NumericField, raw: string) => {
    const parsed = Number(raw);
    let nextValue = raw;

    if (raw !== "" && !Number.isNaN(parsed) && parsed < 0) {
      nextValue = "0";
    }

    setFormData((prev) => ({ ...prev, [field]: nextValue }));

    if (nextValue === "") {
      setFieldErrors((prev) => ({ ...prev, [field]: `${FIELD_LABELS[field]} is required.` }));
      return;
    }

    const nextParsed = Number(nextValue);
    if (Number.isNaN(nextParsed)) {
      setFieldErrors((prev) => ({ ...prev, [field]: `${FIELD_LABELS[field]} must be a valid number.` }));
      return;
    }

    if (nextParsed < 0) {
      setFieldErrors((prev) => ({ ...prev, [field]: `${FIELD_LABELS[field]} cannot be negative.` }));
      return;
    }

    if (INTEGER_FIELDS.includes(field) && !Number.isInteger(nextParsed)) {
      setFieldErrors((prev) => ({ ...prev, [field]: `${FIELD_LABELS[field]} must be a whole number.` }));
      return;
    }

    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleNumericBlur = (field: NumericField) => {
    const normalized = normalizeNumericInput(formData[field], INTEGER_FIELDS.includes(field));
    setFormData((prev) => ({ ...prev, [field]: normalized }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrorDetails([]);
    setInferenceResult(null);

    try {
      const nextFieldErrors: Partial<Record<NumericField, string>> = {};
      const payload: NewBuildingInput = {
        postcode: formData.postcode,
        relative_compactness: 0,
        surface_area: 0,
        wall_area: 0,
        roof_area: 0,
        overall_height: 0,
        orientation: 0,
        glazing_area: 0,
        glazing_area_distribution: 0,
      };

      for (const field of NUMERIC_FIELDS) {
        const raw = formData[field];
        if (raw.trim() === "") {
          nextFieldErrors[field] = `${FIELD_LABELS[field]} is required.`;
          continue;
        }
        const value = Number(raw);
        if (Number.isNaN(value)) {
          nextFieldErrors[field] = `${FIELD_LABELS[field]} must be a valid number.`;
          continue;
        }
        if (value < 0) {
          nextFieldErrors[field] = `${FIELD_LABELS[field]} cannot be negative.`;
          continue;
        }
        if (INTEGER_FIELDS.includes(field) && !Number.isInteger(value)) {
          nextFieldErrors[field] = `${FIELD_LABELS[field]} must be a whole number.`;
          continue;
        }
        payload[field] = value as never;
      }

      setFieldErrors(nextFieldErrors);
      if (Object.values(nextFieldErrors).some(Boolean)) {
        setError("Please fix the highlighted fields.");
        setLoading(false);
        return;
      }

      let result;
      if (initialData && initialData.id) {
        result = await updateBuilding(initialData.id, payload);
      } else {
        result = await createBuildingProfile(payload);
      }
      setInferenceResult(result);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      // Try to parse structured backend message containing building_profile_id
      let msg = err instanceof Error ? err.message : "Engine validation failed.";
      setErrorDetails([]);
      try {
        const parsed = JSON.parse(msg);
        if (parsed && parsed.building_profile_id) {
          setExistingId(parsed.building_profile_id);
          msg = parsed.detail || parsed.errors || msg;
        }
      } catch {
        // not JSON, ignore
      }
      const parsedError = parseApiError(typeof msg === "string" ? msg : JSON.stringify(msg));
      setError(parsedError.summary);
      setErrorDetails(parsedError.details);
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
              <select
                name="postcode"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs bg-white"
                value={formData.postcode}
                onChange={handlePostcodeChange}
              >
                {AVAILABLE_POSTCODES.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Parameters Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              "relative_compactness",
              "surface_area",
              "wall_area",
              "roof_area",
              "overall_height",
              "orientation",
              "glazing_area",
              "glazing_area_distribution",
            ].map((field) => {
              const typedField = field as NumericField;
              const fieldError = fieldErrors[typedField];
              return (
              <div key={field}>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  {field.replace("_", " ")}
                </label>
                <input
                  type="number"
                  min={0}
                  step={field === "orientation" || field === "glazing_area_distribution" ? 1 : 0.01}
                  name={field}
                  className={`w-full rounded-lg border p-2 text-xs ${
                    fieldError ? "border-red-300 bg-red-50/40" : "border-slate-200"
                  }`}
                  value={formData[typedField]}
                  onChange={(e) => handleNumericChange(typedField, e.target.value)}
                  onBlur={() => handleNumericBlur(typedField)}
                  required
                />
                {fieldError && <p className="mt-1 text-[10px] text-red-600">{fieldError}</p>}
              </div>
            )})}
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
                {errorDetails.length > 0 && (
                  <ul className="mt-2 list-disc pl-4 text-xs text-red-700 space-y-1">
                    {errorDetails.map((item, idx) => (
                      <li key={`${item}-${idx}`}>{item}</li>
                    ))}
                  </ul>
                )}
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
        {inferenceResult !== null && (
           <div className="mt-6 p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
             {/* ... Result details ... */}
           </div>
        )}
      </div>
    </div>
  );
}