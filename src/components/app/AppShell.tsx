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
  Bell,
  ChevronDown,
  ChevronRight,

} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-flock-cream">
      {/* Fixed left sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col bg-flock-soil md:flex">
        <Link to="/dashboard" className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
          <Bird className="h-6 w-6 text-flock-harvest" />
          <span className="font-display text-2xl text-flock-cream">Flocker</span>
        </Link>
        <nav className="flex-1 overflow-y-auto py-2">
          <div className="divide-y divide-white/[0.06]">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
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
                activeProps={{
                  className: "bg-flock-harvest/15 !text-flock-harvest",
                }}
                className="flex items-center gap-3 px-5 py-3 font-sans text-[13.5px] text-flock-cream/70 transition hover:bg-white/5 hover:text-flock-cream"
              >
                <n.icon className="h-[18px] w-[18px]" />
                <span className="flex-1">{n.label}</span>
              </Link>
            ))}
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 px-5 py-3 font-sans text-[13.5px] text-flock-cream/70 transition hover:bg-white/5 hover:text-flock-cream"
            >
              <LogOut className="h-[18px] w-[18px]" />
              <span className="flex-1 text-left">Sign out</span>
            </button>
          </div>
        </div>
      </aside>


      <div className="md:pl-60">
        {/* Top header bar */}
        <header className="sticky top-0 z-10 border-b border-flock-fog bg-flock-cream/95 px-6 backdrop-blur">
          <div className="flex h-16 items-center gap-4">
            <button className="flex items-center gap-2 rounded border bg-flock-fog px-3 py-1.5 font-sans text-[13px] text-flock-soil transition hover:bg-flock-mist">
              <Bird className="h-3.5 w-3.5 text-flock-field" /> My Farm
              <ChevronDown className="h-3.5 w-3.5 text-flock-stone" />
            </button>
            <div className="ml-auto flex items-center gap-3">
              {actions}
              <button className="relative flex h-9 w-9 items-center justify-center rounded border bg-flock-fog text-flock-soil transition hover:bg-flock-mist">
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-flock-red" />
              </button>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-flock-soil font-sans text-[13px] font-medium text-flock-cream">
                F
              </span>
            </div>
          </div>
        </header>

        <main className="px-6 py-8">
          <div className="mb-6 flex flex-wrap items-end gap-3">
            <div>
              <h1 className="font-display text-3xl text-flock-soil">{title}</h1>
              {subtitle && (
                <p className="mt-1 font-sans text-[14px] text-flock-stone">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="animate-flock-enter">{children}</div>
        </main>
      </div>
    </div>
  );
}
