import { Link, useNavigate } from "@tanstack/react-router";
import { Bird, LogOut, LayoutDashboard, Calculator, Egg, Package } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/rationpro", label: "RationPro", icon: Calculator },
  { to: "/egg-ledger", label: "EggLedger", icon: Egg },
  { to: "/feed-store", label: "Feed Store", icon: Package },
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
      <header className="sticky top-0 z-10 border-b border-flock-fog bg-flock-cream/95 px-4 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Bird className="h-5 w-5 text-flock-harvest" />
            <span className="font-display text-xl text-flock-soil">Flock</span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeProps={{ className: "bg-flock-fog text-flock-soil" }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-sans text-[13px] text-flock-stone transition hover:bg-flock-fog"
              >
                <n.icon className="h-3.5 w-3.5" /> {n.label}
              </Link>
            ))}
          </nav>
          <button
            onClick={signOut}
            className="ml-auto flex items-center gap-1.5 rounded-lg border bg-flock-fog px-3 py-1.5 font-sans text-[13px] text-flock-soil transition hover:bg-flock-mist"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end gap-3">
          <div>
            <h1 className="font-display text-3xl text-flock-soil">{title}</h1>
            {subtitle && (
              <p className="mt-1 font-sans text-[14px] text-flock-stone">{subtitle}</p>
            )}
          </div>
          {actions && <div className="ml-auto">{actions}</div>}
        </div>
        <div className="animate-flock-enter">{children}</div>
      </main>
    </div>
  );
}
