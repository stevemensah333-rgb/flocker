import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bird,
  LogOut,
  Egg,
  Calculator,
  Wallet,
  TrendingUp,
  TrendingDown,
  Wheat,
  BarChart3,
  Stethoscope,
  ChevronRight,
  Plus,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Coop = {
  id: string;
  name: string;
  breed: string | null;
  count: number;
  age_weeks: number;
  production_type: string | null;
};

type Farm = { id: string; name: string; egg_price: number };

type Activity = {
  key: string;
  label: string;
  amount: string;
  when: string;
  in: boolean | null;
};

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [farm, setFarm] = useState<Farm | null>(null);
  const [coops, setCoops] = useState<Coop[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, onboarded")
        .eq("id", u.user.id)
        .maybeSingle();
      if (!profile?.onboarded) {
        navigate({ to: "/onboarding" });
        return;
      }
      setName(profile.full_name?.split(" ")[0] ?? "farmer");
      const { data: f } = await supabase
        .from("farms")
        .select("id, name, egg_price")
        .eq("owner_id", u.user.id)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      setFarm(f ?? null);
      if (f) {
        const { data: c } = await supabase
          .from("coops")
          .select("id, name, breed, count, age_weeks, production_type")
          .eq("farm_id", f.id)
          .order("created_at");
        setCoops(c ?? []);
      }
      setReady(true);
    })();
  }, [navigate]);

  const totalBirds = useMemo(
    () => coops.reduce((s, c) => s + (c.count || 0), 0),
    [coops],
  );
  // Estimated daily eggs at a typical 82% lay rate for layers in production.
  const estEggs = useMemo(
    () =>
      Math.round(
        coops
          .filter((c) => (c.production_type ?? "layer") === "layer" && c.age_weeks >= 18)
          .reduce((s, c) => s + c.count * 0.82, 0),
      ),
    [coops],
  );
  const eggPrice = farm?.egg_price ?? 0;
  const estRevenue = Math.round((estEggs / 30) * eggPrice * 100) / 100;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-flock-cream">
      <header className="sticky top-0 z-10 border-b border-flock-fog bg-flock-cream/95 px-4 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center">
          <div className="flex items-center gap-2">
            <Bird className="h-5 w-5 text-flock-harvest" />
            <span className="font-display text-xl text-flock-soil">Flock</span>
          </div>
          <button
            onClick={signOut}
            className="ml-auto flex items-center gap-1.5 rounded-lg border bg-flock-fog px-3 py-1.5 font-sans text-[13px] text-flock-soil transition hover:bg-flock-mist"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {ready ? (
          <div className="animate-flock-enter">
            <h1 className="font-display text-3xl text-flock-soil">
              {greeting()}, {name}
            </h1>
            <p className="mt-1 font-sans text-[14px] text-flock-stone">
              {farm ? `${farm.name} · ` : ""}
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>

            {/* Stat tiles */}
            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile
                icon={<Bird className="h-4 w-4" />}
                label="Total birds"
                value={totalBirds.toLocaleString()}
                sub={`${coops.length} coop${coops.length === 1 ? "" : "s"}`}
              />
              <StatTile
                icon={<Egg className="h-4 w-4" />}
                label="Est. eggs / day"
                value={estEggs.toLocaleString()}
                sub="~82% lay rate"
                accent="field"
              />
              <StatTile
                icon={<Wallet className="h-4 w-4" />}
                label="Est. egg revenue"
                value={`${estRevenue.toLocaleString()}`}
                sub="per day"
                accent="harvest"
              />
              <StatTile
                icon={<TrendingUp className="h-4 w-4" />}
                label="Egg price"
                value={eggPrice ? eggPrice.toFixed(2) : "—"}
                sub="per egg"
              />
            </div>

            {/* Two columns: timeline + ledger */}
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <section className="lg:col-span-2">
                <SectionHead title="Your flock" />
                <div className="overflow-hidden rounded-lg border bg-flock-fog shadow-flock">
                  {coops.length === 0 ? (
                    <EmptyCoops />
                  ) : (
                    coops.map((c, i) => (
                      <div
                        key={c.id}
                        className={`flex items-center gap-3 px-4 py-3 ${
                          i > 0 ? "border-t border-flock-mist" : ""
                        }`}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-flock-mist text-flock-field">
                          <Bird className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-sans text-[14px] font-medium text-flock-soil">
                            {c.name}
                          </p>
                          <p className="font-sans text-[12px] text-flock-stone">
                            {c.breed ?? "Mixed"} · {c.production_type ?? "layer"}
                          </p>
                        </div>
                        <div className="ml-auto text-right">
                          <p className="font-mono text-[14px] text-flock-soil">
                            {c.count.toLocaleString()}
                          </p>
                          <p className="font-sans text-[12px] text-flock-stone">
                            {c.age_weeks}w old
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section>
                <SectionHead title="Recent activity" />
                <div className="rounded-lg border bg-flock-fog p-2 shadow-flock">
                  {SAMPLE_LEDGER.map((e, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-2 py-2.5 ${
                        i > 0 ? "border-t border-flock-mist" : ""
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full ${
                          e.in
                            ? "bg-flock-field/12 text-flock-field"
                            : "bg-flock-red/12 text-flock-red"
                        }`}
                      >
                        {e.in ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-sans text-[13px] text-flock-soil">
                          {e.label}
                        </p>
                        <p className="font-sans text-[11px] text-flock-stone">
                          {e.when}
                        </p>
                      </div>
                      <span
                        className={`ml-auto font-mono text-[13px] ${
                          e.in ? "text-flock-field" : "text-flock-red"
                        }`}
                      >
                        {e.in ? "+" : "-"}
                        {e.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Module shortcuts */}
            <SectionHead title="Modules" className="mt-8" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ModuleCard
                to="/rationpro"
                icon={<Calculator className="h-5 w-5" />}
                title="RationPro"
                desc="Balance least-cost feed rations"
                accent="harvest"
              />
              <ModuleCard
                to="/egg-ledger"
                icon={<Egg className="h-5 w-5" />}
                title="EggLedger"
                desc="Track daily eggs & production"
                accent="field"
              />
              <ModuleCard
                to="/feed-store"
                icon={<Wheat className="h-5 w-5" />}
                title="Feed Store"
                desc="Manage ingredient prices"
                accent="clay"
              />
              <ModuleCard
                to="/reports"
                icon={<BarChart3 className="h-5 w-5" />}
                title="Reports"
                desc="Production & revenue trends"
                accent="harvest"
              />
              <ModuleCard
                to="/vetline"
                icon={<Stethoscope className="h-5 w-5" />}
                title="VetLine"
                desc="AI flock health triage"
                accent="field"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-8 w-48 animate-pulse rounded bg-flock-fog" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-flock-fog" />
              ))}
            </div>
            <div className="h-48 animate-pulse rounded-lg bg-flock-fog" />
          </div>
        )}
      </main>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
  accent = "soil",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: "soil" | "field" | "harvest";
}) {
  const accentClass =
    accent === "field"
      ? "text-flock-field"
      : accent === "harvest"
        ? "text-flock-harvest"
        : "text-flock-stone";
  return (
    <div className="rounded-lg border bg-flock-fog p-4 shadow-flock">
      <div className={`flex items-center gap-1.5 ${accentClass}`}>
        {icon}
        <span className="font-sans text-[12px] text-flock-stone">{label}</span>
      </div>
      <p className="mt-2 font-mono text-2xl text-flock-soil">{value}</p>
      <p className="font-sans text-[12px] text-flock-stone">{sub}</p>
    </div>
  );
}

function SectionHead({
  title,
  className = "",
}: {
  title: string;
  className?: string;
}) {
  return (
    <h2 className={`mb-3 font-display text-xl text-flock-soil ${className}`}>
      {title}
    </h2>
  );
}

function ModuleCard({
  to,
  icon,
  title,
  desc,
  accent,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: "harvest" | "field" | "clay";
}) {
  const bg =
    accent === "harvest"
      ? "bg-flock-harvest/15 text-flock-harvest"
      : accent === "field"
        ? "bg-flock-field/15 text-flock-field"
        : "bg-flock-clay/15 text-flock-clay";
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-lg border bg-flock-fog p-4 shadow-flock transition hover:bg-flock-mist"
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-sans text-[15px] font-medium text-flock-soil">{title}</p>
        <p className="truncate font-sans text-[12px] text-flock-stone">{desc}</p>
      </div>
      <ChevronRight className="ml-auto h-4 w-4 text-flock-stone transition group-hover:translate-x-0.5" />
    </Link>
  );
}

function EmptyCoops() {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <Bird className="h-8 w-8 text-flock-stone" />
      <p className="font-sans text-[14px] text-flock-soil">No coops yet</p>
      <Link
        to="/onboarding"
        className="mt-1 flex items-center gap-1 rounded-lg bg-flock-harvest px-3 py-1.5 font-sans text-[13px] text-flock-soil"
      >
        <Plus className="h-3.5 w-3.5" /> Add a coop
      </Link>
    </div>
  );
}

const SAMPLE_LEDGER = [
  { label: "Egg sales — Tray x40", amount: "1,200", when: "Today, 09:14", in: true },
  { label: "Feed batch — Layer mash", amount: "8,500", when: "Yesterday", in: false },
  { label: "Egg sales — Crate x12", amount: "3,600", when: "2 days ago", in: true },
  { label: "Vaccine — Newcastle", amount: "2,100", when: "3 days ago", in: false },
];
