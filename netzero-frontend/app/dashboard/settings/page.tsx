// app/dashboard/settings/page.tsx
"use client";

import React, { useState } from "react";
import { Bell, ShieldAlert, Save, CheckCircle2 } from "lucide-react";
import {
  deleteAccount,
  adminDeleteUser,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function SettingsPanel() {
  const { logout, userEmail } = useAuth();
  // Local states to mimic interactive dashboard adjustments
  const [carbonCeiling, setCarbonCeiling] = useState<number>(250);
  const [smsAlerts, setSmsAlerts] = useState<boolean>(true);
  const [emailAlerts, setEmailAlerts] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<boolean>(false);
  const [adminDeleteTargetEmail, setAdminDeleteTargetEmail] = useState<string>("");
  const [adminDeleteError, setAdminDeleteError] = useState<string | null>(null);
  const [adminDeleteSuccess, setAdminDeleteSuccess] = useState<string | null>(null);
  const [adminDeletingUser, setAdminDeletingUser] = useState<boolean>(false);

  const ownerEmail = (process.env.NEXT_PUBLIC_OWNER_EMAIL || "dharun.ramesh2003@gmail.com")
    .trim()
    .toLowerCase();
  const isOwnerUser = ((userEmail || "").trim().toLowerCase() === ownerEmail);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000); // Reset success notification state
  };

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This will permanently remove your profile and associated data."
    );
    if (!confirmed) return;

    try {
      setDeletingAccount(true);
      await deleteAccount();
      logout();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account.");
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleAdminDeleteUser = async () => {
    setAdminDeleteError(null);
    setAdminDeleteSuccess(null);
    const email = adminDeleteTargetEmail.trim();
    if (!email) {
      setAdminDeleteError("Enter an email to delete.");
      return;
    }
    if (email.toLowerCase() === (userEmail || "").toLowerCase()) {
      setAdminDeleteError("Use Delete Account to remove your own account.");
      return;
    }

    const confirmed = window.confirm(`Delete user ${email}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setAdminDeletingUser(true);
      await adminDeleteUser({ email });
      setAdminDeleteSuccess(`Deleted user: ${email}`);
      setAdminDeleteTargetEmail("");
    } catch (err: unknown) {
      setAdminDeleteError(err instanceof Error ? err.message : "Failed to delete user.");
    } finally {
      setAdminDeletingUser(false);
    }
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
              {deleteError && (
                <div className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1">
                  {deleteError}
                </div>
              )}
              {adminDeleteError && (
                <div className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1">
                  {adminDeleteError}
                </div>
              )}
              {adminDeleteSuccess && (
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  {adminDeleteSuccess}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isOwnerUser && (
                <>
                  <input
                    type="email"
                    value={adminDeleteTargetEmail}
                    onChange={(e) => setAdminDeleteTargetEmail(e.target.value)}
                    placeholder="user@email.com"
                    className="w-56 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-red-500 dark:border-slate-800 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={handleAdminDeleteUser}
                    disabled={adminDeletingUser}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-red-600 transition-all shrink-0 font-semibold disabled:opacity-60"
                  >
                    {adminDeletingUser ? "Deleting User..." : "Admin Delete User"}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-red-500 transition-all shrink-0 font-semibold disabled:opacity-60"
              >
                {deletingAccount ? "Deleting..." : "Delete Account"}
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-emerald-500 transition-all shrink-0 font-semibold"
              >
                <Save className="h-4 w-4" /> Save System Variables
              </button>
            </div>
          </div>

        </div>

      </form>
    </>
  );
}