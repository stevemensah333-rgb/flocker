import { useEffect, useRef, useState } from "react";
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
  ChevronUp,
  Menu,
  X,
  MessageSquare,
  PlayCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "@/components/app/NotificationBell";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

const SECTIONS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Operations",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/coops", label: "Flocks", icon: Bird },
      { to: "/rationpro", label: "Feed Management", icon: Calculator },
      { to: "/egg-ledger", label: "Production", icon: Egg },
    ],
  },
  {
    heading: "Health",
    items: [
      { to: "/events", label: "Health Records", icon: Syringe },
      { to: "/vetline", label: "VetLine", icon: Stethoscope },
    ],
  },
  {
    heading: "Insights",
    items: [{ to: "/reports", label: "Reports", icon: BarChart3 }],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {SECTIONS.map((section) => (
        <div key={section.heading} className="mb-5">
          <p className="px-3 pb-2 font-sans text-[10.5px] font-semibold uppercase tracking-[0.14em] text-fr-label">
            {section.heading}
          </p>
          <div className="space-y-0.5">
            {section.items.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={onNavigate}
                activeProps={{
                  className:
                    "!bg-fr-sidebar-active !text-white border border-white/[0.06]",
                }}
                className="group flex items-center gap-3 rounded-[10px] border border-transparent px-3 py-2.5 font-sans text-[13.5px] text-fr-muted transition hover:bg-white/[0.04] hover:text-white"
              >
                <n.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1 truncate">{n.label}</span>
                {n.badge && (
                  <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10.5px] text-fr-muted">
                    {n.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function ProfileCard({ onSignOut }: { onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<{ name: string; email: string; avatar: string | null }>(
    { name: "Farmer", email: "", avatar: null },
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", u.id)
        .maybeSingle();
      setProfile({
        name: p?.full_name || u.email?.split("@")[0] || "Farmer",
        email: u.email || "",
        avatar: (p as { avatar_url?: string } | null)?.avatar_url ?? null,
      });
    })();
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initials = profile.name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div ref={ref} className="relative border-t border-fr-sidebar-border p-3">
      {open && (
        <div className="absolute bottom-[calc(100%-0.25rem)] left-3 right-3 mb-1 overflow-hidden rounded-xl border border-fr-sidebar-border bg-fr-sidebar-active shadow-2xl">
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-3 font-sans text-[13px] text-fr-muted transition hover:bg-white/[0.05] hover:text-white"
          >
            <Settings className="h-4 w-4" /> Settings
          </Link>
          <a
            href="mailto:hello@flocker.app?subject=Flocker%20feedback"
            className="flex items-center gap-2.5 px-4 py-3 font-sans text-[13px] text-fr-muted transition hover:bg-white/[0.05] hover:text-white"
          >
            <MessageSquare className="h-4 w-4" /> Feedback
          </a>
          <button
            onClick={onSignOut}
            className="flex w-full items-center gap-2.5 border-t border-white/[0.06] px-4 py-3 text-left font-sans text-[13px] text-fr-muted transition hover:bg-white/[0.05] hover:text-white"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl border border-fr-sidebar-border bg-white/[0.03] px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
      >
        {profile.avatar ? (
          <img
            src={profile.avatar}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fr-green/25 font-sans text-[12px] font-semibold text-white">
            {initials || "F"}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-sans text-[13px] font-semibold text-white">
              {profile.name}
            </span>
            <span className="rounded-md border border-fr-green/40 bg-fr-green/15 px-1.5 py-px text-[10px] font-medium text-fr-green">
              Farmer
            </span>
          </span>
          <span className="block truncate font-sans text-[11.5px] text-fr-muted">
            {profile.email}
          </span>
        </span>
        <ChevronUp
          className={`h-4 w-4 shrink-0 text-fr-muted transition ${open ? "" : "rotate-180"}`}
        />
      </button>
    </div>
  );
}

function SidebarHeader() {
  return (
    <div className="flex h-[68px] items-center justify-between px-5">
      <Link to="/dashboard" className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-fr-green/20">
          <Bird className="h-[18px] w-[18px] text-fr-green" />
        </span>
        <span className="font-sans text-lg font-bold tracking-tight text-white">
          Flocker
        </span>
      </Link>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-fr-sidebar-border text-fr-muted">
        <PlayCircle className="h-4 w-4" />
      </span>
    </div>
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
    <div className="min-h-screen bg-fr-content">
      {/* Fixed left sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-fr-sidebar md:flex">
        <SidebarHeader />
        <NavLinks />
        <ProfileCard onSignOut={signOut} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-40 flex w-[80%] max-w-[18rem] flex-col bg-fr-sidebar shadow-2xl">
            <div className="flex h-[68px] items-center justify-between px-5">
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-fr-green/20">
                  <Bird className="h-[18px] w-[18px] text-fr-green" />
                </span>
                <span className="font-sans text-lg font-bold tracking-tight text-white">
                  Flocker
                </span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-fr-muted transition hover:bg-white/5 hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
            <ProfileCard onSignOut={signOut} />
          </aside>
        </div>
      )}

      <div className="md:pl-64">
        {/* Content area with soft green gradient header */}
        <main className="relative min-h-screen">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(120%_100%_at_100%_0%,rgba(47,174,102,0.14),transparent_60%)]" />
          <div className="relative px-5 py-6 sm:px-10 sm:py-9">
            <div className="mb-8 flex flex-wrap items-start gap-4">
              <button
                onClick={() => setMobileOpen(true)}
                className="-ml-1 mt-1 rounded-lg p-2 text-fr-ink transition hover:bg-black/5 md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="font-sans text-3xl font-bold tracking-tight text-fr-ink sm:text-[40px] sm:leading-[1.1]">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-2 max-w-2xl font-sans text-[15px] leading-relaxed text-fr-sub">
                    {subtitle}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {actions}
                <NotificationBell />
              </div>
            </div>
            <div className="animate-flock-enter">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
