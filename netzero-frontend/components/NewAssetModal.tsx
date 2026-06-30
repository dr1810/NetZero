"use client";

import React, { useState } from "react";
import {
  createAsset,
  BuildingProfile,
  NewAssetInput,
} from "@/lib/api";
import {
  Zap,
  Loader2,
  X,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  buildings: BuildingProfile[];
}

export default function NewAssetModal({
  isOpen,
  onClose,
  onSuccess,
  buildings,
}: Props) {

  const [formData, setFormData] =
    useState<NewAssetInput>({
      building: 0,
      name: "",
      electrical_capacity_kw: 5,
      criticality_classification: "FLEXIBLE",
    });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } =
      e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "number"
          ? parseFloat(value)
          : value,
    }));
  };

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      await createAsset(formData);

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to register asset."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">

      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl">

        <button
          onClick={onClose}
          className="absolute top-4 right-4"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <Zap className="h-5 w-5 text-indigo-500" />
          <h2 className="text-base font-bold">
            Register Flexible Asset
          </h2>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Building
            </label>

            <select
              name="building"
              required
              value={formData.building}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
            >
              <option value="">
                Select Building
              </option>

              {buildings.map((b) => (
                <option
                  key={b.id}
                  value={b.id}
                >
                  {b.postcode}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Asset Name
            </label>

            <input
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Capacity (kW)
            </label>

            <input
              type="number"
              step="0.1"
              name="electrical_capacity_kw"
              value={
                formData.electrical_capacity_kw
              }
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Criticality
            </label>

            <select
              name="criticality_classification"
              value={
                formData.criticality_classification
              }
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
            >
              <option value="CRITICAL">
                Critical
              </option>

              <option value="FLEXIBLE">
                Flexible
              </option>

              <option value="SHEDDABLE">
                Sheddable
              </option>
            </select>
          </div>

          {error && (
            <div className="text-xs text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 p-3 text-xs font-semibold text-white hover:bg-slate-800"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Registering...
              </span>
            ) : (
              "Register Asset"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}