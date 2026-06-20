"use client";

import { useState } from "react";
import { createCarbonPreference } from "@/lib/api";

export default function NewCarbonPreferenceModal({
  isOpen,
  onClose,
  onSuccess,
  buildings,
}: any) {
  const [building, setBuilding] = useState("");
  const [threshold, setThreshold] = useState("");
  const [budget, setBudget] = useState("");
  const [automation, setAutomation] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {
      await createCarbonPreference({
        building: Number(building),
        carbon_intensity_threshold:
          Number(threshold),
        daily_carbon_budget_kg:
          Number(budget),
        automation_enabled: automation,
      });

      onSuccess();
      onClose();
    } catch (err) {
      alert("Failed to save preference");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">

        <h2 className="text-lg font-bold mb-4">
          Carbon Preferences
        </h2>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <select
            className="w-full border p-2 rounded"
            value={building}
            onChange={(e) =>
              setBuilding(e.target.value)
            }
          >
            <option value="">
              Select Building
            </option>

            {buildings.map((b: any) => (
              <option
                key={b.id}
                value={b.id}
              >
                {b.postcode}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Carbon Threshold"
            value={threshold}
            onChange={(e) =>
              setThreshold(e.target.value)
            }
            className="w-full border p-2 rounded"
          />

          <input
            type="number"
            placeholder="Daily Carbon Budget (kg)"
            value={budget}
            onChange={(e) =>
              setBudget(e.target.value)
            }
            className="w-full border p-2 rounded"
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={automation}
              onChange={(e) =>
                setAutomation(
                  e.target.checked
                )
              }
            />
            Automation Enabled
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="bg-emerald-600 text-white px-4 py-2 rounded"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}