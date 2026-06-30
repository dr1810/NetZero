import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import NewCarbonPreferenceModal from "./NewCarbonPreferenceModal";

const { createCarbonPreferenceMock } = vi.hoisted(() => ({
  createCarbonPreferenceMock: vi.fn(),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual("@/lib/api");
  return {
    ...actual,
    createCarbonPreference: createCarbonPreferenceMock,
  };
});

describe("NewCarbonPreferenceModal", () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    createCarbonPreferenceMock.mockReset();
    onClose.mockReset();
    onSuccess.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders building choices", () => {
    render(
      <NewCarbonPreferenceModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        buildings={[
          {
            id: 7,
            postcode: "EC1A1BB",
            owner: 1,
            grid_zone_id: "13",
            relative_compactness: 0.8,
            surface_area: 600,
            wall_area: 300,
            roof_area: 200,
            overall_height: 7,
            orientation: 2,
            glazing_area: 0.2,
            glazing_area_distribution: 1,
            calculated_base_load_kw: 0,
            thermal_inertia_coefficient: 0,
            created_at: "2026-01-01T00:00:00Z",
          },
        ]}
      />
    );

    expect(screen.getByText("Carbon Preferences")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "EC1A1BB" })).toBeInTheDocument();
  });

  it("submits payload and closes on success", async () => {
    createCarbonPreferenceMock.mockResolvedValueOnce({ id: 1 });

    render(
      <NewCarbonPreferenceModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        buildings={[
          {
            id: 7,
            postcode: "EC1A1BB",
            owner: 1,
            grid_zone_id: "13",
            relative_compactness: 0.8,
            surface_area: 600,
            wall_area: 300,
            roof_area: 200,
            overall_height: 7,
            orientation: 2,
            glazing_area: 0.2,
            glazing_area_distribution: 1,
            calculated_base_load_kw: 0,
            thermal_inertia_coefficient: 0,
            created_at: "2026-01-01T00:00:00Z",
          },
        ]}
      />
    );

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "7" } });
    fireEvent.change(screen.getByPlaceholderText("Carbon Threshold"), { target: { value: "300" } });
    fireEvent.change(screen.getByPlaceholderText("Daily Carbon Budget (kg)"), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(createCarbonPreferenceMock).toHaveBeenCalledWith({
        building: 7,
        carbon_intensity_threshold: 300,
        daily_carbon_budget_kg: 50,
        automation_enabled: true,
      });
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
