import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bird,
  LogOut,
  LayoutDashboard,
  Calculator,
  Egg,
  BarChart3,
  Stethoscope,
  Syringe,
  Settings,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "@/components/app/NotificationBell";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/coops", label: "Flocks", icon: Bird },
  { to: "/rationpro", label: "Feed Management", icon: Calculator },
  { to: "/egg-ledger", label: "Production", icon: Egg },
  { to: "/events", label: "Health Records", icon: Syringe },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/vetline", label: "VetLine", icon: Stethoscope },
] as const;

const BOTTOM_NAV = [
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <nav className="flex-1 overflow-y-auto py-2">
        <div className="divide-y divide-white/[0.06]">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={onNavigate}
              activeProps={{
                className: "bg-flock-harvest/15 !text-flock-harvest",
              }}
              className="group flex items-center gap-3 px-5 py-3 font-sans text-[13.5px] text-flock-cream/70 transition hover:bg-white/5 hover:text-flock-cream"
            >
              <n.icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{n.label}</span>
              <ChevronRight className="h-3.5 w-3.5 text-flock-cream/30" />
            </Link>
          ))}
        </div>
      </nav>
      <div className="border-t border-white/10">
        <div className="divide-y divide-white/[0.06]">
          {BOTTOM_NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={onNavigate}
              activeProps={{
                className: "bg-flock-harvest/15 !text-flock-harvest",
              }}
              className="flex items-center gap-3 px-5 py-3 font-sans text-[13.5px] text-flock-cream/70 transition hover:bg-white/5 hover:text-flock-cream"
            >
              <n.icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{n.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

export default function AppShell({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-flock-cream">
      {/* Fixed left sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col bg-flock-soil md:flex">
        <Link to="/dashboard" className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
          <Bird className="h-6 w-6 text-flock-harvest" />
          <span className="font-display text-2xl text-flock-cream">Flocker</span>
        </Link>
        <NavLinks />
        <div className="border-t border-white/10">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 px-5 py-3 font-sans text-[13.5px] text-flock-cream/70 transition hover:bg-white/5 hover:text-flock-cream"
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span className="flex-1 text-left">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-30 bg-flock-soil/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-40 flex w-[78%] max-w-[18rem] flex-col bg-flock-soil shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2"
              >
                <Bird className="h-6 w-6 text-flock-harvest" />
                <span className="font-display text-2xl text-flock-cream">Flocker</span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded p-1.5 text-flock-cream/70 transition hover:bg-white/5 hover:text-flock-cream"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
            <div className="border-t border-white/10">
              <button
                onClick={signOut}
                className="flex w-full items-center gap-3 px-5 py-3 font-sans text-[13.5px] text-flock-cream/70 transition hover:bg-white/5 hover:text-flock-cream"
              >
                <LogOut className="h-[18px] w-[18px]" />
                <span className="flex-1 text-left">Sign out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="md:pl-60">
        {/* Top header bar */}
        <header className="sticky top-0 z-10 border-b border-flock-fog bg-flock-cream/95 px-4 backdrop-blur sm:px-6">
          <div className="flex h-16 items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="-ml-1 rounded p-2 text-flock-soil transition hover:bg-flock-fog md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
              {actions}
              <NotificationBell />
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 sm:py-8">
          <div className="mb-6 flex flex-wrap items-end gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-2xl text-flock-soil sm:text-3xl">{title}</h1>
              {subtitle && (
                <p className="mt-1 font-sans text-[13px] text-flock-stone sm:text-[14px]">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="animate-flock-enter">{children}</div>
        </main>
      </div>
    </div>
  );
}
