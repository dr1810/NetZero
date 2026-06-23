// app/dashboard/layout.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart3, Settings, Leaf, Building2 } from "lucide-react";
import { User, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

// Navigation menu links mapping directly to our active folder paths
const navigationItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Analytics Engine", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Matrix Inventory", href: "/dashboard/buildings", icon: Building2 },
  { name: "Control Center", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  function AuthControls() {
    const { isAuthenticated, logout, userEmail } = useAuth();
    const router = useRouter();

    function initials(email?: string | null) {
      if (!email) return 'ME';
      const name = email.split('@')[0];
      const parts = name.split(/[._\-]/).filter(Boolean);
      if (parts.length === 0) return name.substring(0,2).toUpperCase();
      if (parts.length === 1) return parts[0].substring(0,2).toUpperCase();
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    if (!isAuthenticated) {
      return (
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600">
          <User className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold">Sign In</span>
        </Link>
      );
    }

    return (
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/settings')} className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs bg-slate-50 border border-slate-200 text-slate-700">
          <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-600 text-white text-[11px] font-semibold">{initials(userEmail)}</div>
          <span>Profile</span>
        </button>
        <button onClick={() => logout()} className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs bg-red-50 border border-red-200 text-red-700">
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      
      {/* Persistent Left Sidebar Navigation */}
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 z-20">
        <div className="flex h-16 items-center gap-2 px-6 border-b border-slate-200 dark:border-slate-800">
          <Leaf className="h-6 w-6 text-emerald-500 fill-emerald-500/10" />
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-slate-50">NetZero Cloud</span>
        </div>
        
        <nav className="flex-1 space-y-1 px-4 py-6">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group ${
                  isActive
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-slate-50"
                }`}
              >
                <item.icon className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? "text-emerald-500" : "text-slate-400 dark:text-slate-500"
                }`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Viewport Wrapper */}
      <div className="pl-64 flex flex-col flex-1 min-w-0">
        {/* Top Header Panel */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
            Workspace Hub / Digital Twin Simulation Environment
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-slate-400 font-mono">Local-Edge Active</span>
            </div>
            <AuthControls />
          </div>
        </header>

        {/* Dynamic Nested Content View Injection Slot */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-7xl space-y-8">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}