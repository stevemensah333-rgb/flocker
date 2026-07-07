import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bird,
  Egg,
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  FileText,
  ClipboardList,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/app/AppShell";
import FlockCopilot from "@/components/app/FlockCopilot";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Farm Dashboard — Flocker" },
      { name: "description", content: "Your poultry farm at a glance: egg production, feed costs, flock health and finances in one dashboard." },
      { property: "og:title", content: "Farm Dashboard — Flocker" },
      { property: "og:description", content: "Track egg production, feed costs, flock health and farm finances from your Flocker dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
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

type EggRow = { record_date: string; eggs_collected: number };

function statusFor(c: Coop): { label: string; cls: string } {
  if (c.count <= 0) return { label: "Closed", cls: "bg-flock-stone/15 text-flock-stone" };
  if ((c.production_type ?? "layer") === "layer" && c.age_weeks < 18)
    return { label: "Rearing", cls: "bg-flock-harvest/20 text-flock-clay" };
  return { label: "Active", cls: "bg-flock-field/15 text-flock-field" };
}

function Dashboard() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [farm, setFarm] = useState<Farm | null>(null);
  const [coops, setCoops] = useState<Coop[]>([]);
  const [eggSeries, setEggSeries] = useState<EggRow[]>([]);
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

        const { data: eggs } = await supabase
          .from("egg_records")
          .select("record_date, eggs_collected")
          .eq("farm_id", f.id)
          .order("record_date", { ascending: false })
          .limit(14);
        setEggSeries((eggs ?? []).slice().reverse());
      }
      setReady(true);
    })();
  }, [navigate]);

  const totalBirds = useMemo(
    () => coops.reduce((s, c) => s + (c.count || 0), 0),
    [coops],
  );
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

  const eggValues = eggSeries.map((e) => e.eggs_collected);

  const actions = (
    <>
      <Link
        to="/coops"
        className="hidden items-center gap-1.5 rounded border bg-flock-fog px-3 py-2 font-sans text-[13px] text-flock-soil transition hover:bg-flock-mist sm:flex"
      >
        <ClipboardList className="h-3.5 w-3.5" /> Record Entry
      </Link>
      <Link
        to="/reports"
        className="hidden items-center gap-1.5 rounded border bg-flock-fog px-3 py-2 font-sans text-[13px] text-flock-soil transition hover:bg-flock-mist sm:flex"
      >
        <FileText className="h-3.5 w-3.5" /> Generate Report
      </Link>
      <Link
        to="/coops"
        className="flex items-center gap-1.5 rounded bg-flock-harvest px-3 py-2 font-sans text-[13px] font-medium text-flock-soil transition hover:opacity-90"
      >
        <Plus className="h-3.5 w-3.5" /> Add Flock
      </Link>
    </>
  );

  return (
    <AppShell
      title={`${name ? name + "'s" : "Your"} farm dashboard`}
      subtitle={
        ready
          ? `${farm ? farm.name + " · " : ""}${new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}`
          : "Loading…"
      }
      actions={actions}
    >
      {ready ? (
        <div>
          <FlockCopilot />

          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={<Bird className="h-4 w-4" />}
              label="Total Birds"
              value={totalBirds.toLocaleString()}
              trend="up"
              delta={`${coops.length} flock${coops.length === 1 ? "" : "s"}`}
              spark={eggValues}
            />
            <KpiCard
              icon={<Egg className="h-4 w-4" />}
              label="Egg Production"
              value={estEggs.toLocaleString()}
              trend="up"
              delta="~82% lay rate"
              accent="field"
              spark={eggValues}
            />
            <KpiCard
              icon={<Wallet className="h-4 w-4" />}
              label="Est. Daily Revenue"
              value={`₵${estRevenue.toLocaleString()}`}
              trend="up"
              delta="per day"
              accent="harvest"
              spark={eggValues}
            />
            <KpiCard
              icon={<TrendingDown className="h-4 w-4" />}
              label="Egg Price"
              value={eggPrice ? `₵${eggPrice.toFixed(2)}` : "—"}
              trend="flat"
              delta="per egg"
              spark={eggValues}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {/* Flock data table */}
            <section className="lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-sans text-[15px] font-semibold text-flock-soil">
                  Flock / Batch Records
                </h2>
                <Link
                  to="/coops"
                  className="flex items-center gap-1 rounded border bg-flock-fog px-2.5 py-1 font-sans text-[12px] text-flock-soil transition hover:bg-flock-mist"
                >
                  Manage
                </Link>
              </div>
              <div className="overflow-x-auto rounded border bg-flock-paper">
                {coops.length === 0 ? (
                  <EmptyCoops />
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-flock-line bg-flock-mist/60 font-sans text-[11px] uppercase tracking-wide text-flock-stone">
                        <th className="px-4 py-2.5 font-medium">Batch</th>
                        <th className="px-4 py-2.5 font-medium">Breed</th>
                        <th className="px-4 py-2.5 font-medium">Age</th>
                        <th className="px-4 py-2.5 text-right font-medium">Birds</th>
                        <th className="px-4 py-2.5 font-medium">Type</th>
                        <th className="px-4 py-2.5 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coops.map((c) => {
                        const s = statusFor(c);
                        return (
                          <tr
                            key={c.id}
                            className="border-t border-flock-line font-sans text-[13px] text-flock-soil transition-colors hover:bg-flock-mist/40"
                          >

                            <td className="px-4 py-3 font-medium">{c.name}</td>
                            <td className="px-4 py-3 text-flock-stone">{c.breed ?? "Mixed"}</td>
                            <td className="px-4 py-3 text-flock-stone">{c.age_weeks}w</td>
                            <td className="px-4 py-3 text-right font-mono">
                              {c.count.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-flock-stone capitalize">
                              {c.production_type ?? "layer"}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 font-sans text-[11px] font-medium ${s.cls}`}
                              >
                                {s.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {/* Production chart */}
            <section>
              <h2 className="mb-3 font-sans text-[15px] font-semibold text-flock-soil">
                Egg Production
              </h2>
              <div className="rounded border bg-flock-paper p-4">
                {eggValues.length === 0 ? (
                  <p className="py-10 text-center font-sans text-[13px] text-flock-stone">
                    No production data yet.
                  </p>
                ) : (
                  <BarChart values={eggValues} />
                )}
                <p className="mt-3 font-sans text-[12px] text-flock-stone">
                  Eggs collected · last {eggValues.length || 0} records
                </p>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded bg-flock-fog" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded bg-flock-fog" />
        </div>
      )}
    </AppShell>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <div className="h-6" />;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function KpiCard({
  icon,
  label,
  value,
  delta,
  trend,
  accent = "soil",
  spark,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "flat";
  accent?: "soil" | "field" | "harvest";
  spark: number[];
}) {
  const colorVar =
    accent === "field" ? "#3d6b35" : accent === "harvest" ? "#e8a838" : "#8c7b6b";
  const accentClass =
    accent === "field"
      ? "text-flock-field"
      : accent === "harvest"
        ? "text-flock-harvest"
        : "text-flock-stone";
  return (
    <div className="group relative overflow-hidden rounded border bg-flock-paper p-4 transition-colors hover:border-flock-stone/30">
      <span
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ backgroundColor: colorVar }}
      />
      <div className="flex items-start justify-between">
        <div className={`flex items-center gap-1.5 ${accentClass}`}>
          {icon}
          <span className="font-sans text-[12px] uppercase tracking-wide text-flock-stone">
            {label}
          </span>
        </div>
        <Sparkline values={spark} color={colorVar} />
      </div>
      <p className="mt-3 font-mono text-[26px] leading-none text-flock-soil">{value}</p>
      <div className="mt-2 flex items-center gap-1 font-sans text-[12px] text-flock-stone">
        {trend === "up" ? (
          <TrendingUp className="h-3.5 w-3.5 text-flock-field" />
        ) : trend === "down" ? (
          <TrendingDown className="h-3.5 w-3.5 text-flock-red" />
        ) : null}
        {delta}
      </div>
    </div>
  );
}


function BarChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-40 items-end gap-1.5">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t bg-flock-field/70 transition hover:bg-flock-field"
          style={{ height: `${Math.max((v / max) * 100, 3)}%` }}
          title={v.toLocaleString()}
        />
      ))}
    </div>
  );
}

function EmptyCoops() {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <Bird className="h-8 w-8 text-flock-stone" />
      <p className="font-sans text-[14px] text-flock-soil">No flocks yet</p>
      <Link
        to="/coops"
        className="mt-1 flex items-center gap-1 rounded bg-flock-harvest px-3 py-1.5 font-sans text-[13px] text-flock-soil"
      >
        <Plus className="h-3.5 w-3.5" /> Add a flock
      </Link>
    </div>
  );
}
