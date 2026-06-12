import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Egg, Wallet, AlertTriangle, TrendingUp, BarChart3, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/app/AppShell";
import { fmt } from "@/lib/flock/ration";
import { toCSV, downloadCSV, stamp } from "@/lib/flock/export";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

type EggRecord = {
  record_date: string;
  eggs_collected: number;
  eggs_broken: number;
  eggs_sold: number;
  price_per_egg: number;
};

const RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

function ReportsPage() {
  const [records, setRecords] = useState<EggRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [rangeDays, setRangeDays] = useState<number>(30);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setReady(true);
        return;
      }
      const { data: f } = await supabase
        .from("farms")
        .select("id")
        .eq("owner_id", u.user.id)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (f) {
        const { data } = await supabase
          .from("egg_records")
          .select(
            "record_date, eggs_collected, eggs_broken, eggs_sold, price_per_egg",
          )
          .eq("farm_id", f.id)
          .order("record_date", { ascending: true })
          .limit(365);
        setRecords((data ?? []) as EggRecord[]);
      }
      setReady(true);
    })();
  }, []);

  const inRange = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - rangeDays);
    return records.filter((r) => new Date(r.record_date) >= cutoff);
  }, [records, rangeDays]);

  // aggregate by date
  const daily = useMemo(() => {
    const map = new Map<
      string,
      { date: string; collected: number; broken: number; sold: number; revenue: number }
    >();
    for (const r of inRange) {
      const cur =
        map.get(r.record_date) ?? {
          date: r.record_date,
          collected: 0,
          broken: 0,
          sold: 0,
          revenue: 0,
        };
      cur.collected += r.eggs_collected;
      cur.broken += r.eggs_broken;
      cur.sold += r.eggs_sold;
      cur.revenue += r.eggs_sold * r.price_per_egg;
      map.set(r.record_date, cur);
    }
    return [...map.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        ...d,
        label: new Date(d.date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }),
        breakRate: d.collected > 0 ? (d.broken / d.collected) * 100 : 0,
      }));
  }, [inRange]);

  const totals = useMemo(() => {
    const collected = inRange.reduce((s, r) => s + r.eggs_collected, 0);
    const broken = inRange.reduce((s, r) => s + r.eggs_broken, 0);
    const sold = inRange.reduce((s, r) => s + r.eggs_sold, 0);
    const revenue = inRange.reduce(
      (s, r) => s + r.eggs_sold * r.price_per_egg,
      0,
    );
    return {
      collected,
      broken,
      sold,
      revenue,
      breakRate: collected > 0 ? (broken / collected) * 100 : 0,
      avgDaily: daily.length > 0 ? collected / daily.length : 0,
    };
  }, [inRange, daily]);

  const rangePicker = (
    <div className="flex gap-1 rounded-lg border bg-flock-fog p-1">
      {RANGES.map((r) => (
        <button
          key={r.label}
          onClick={() => setRangeDays(r.days)}
          className={`rounded-md px-3 py-1 font-sans text-[12px] font-medium transition ${
            rangeDays === r.days
              ? "bg-flock-harvest text-flock-soil"
              : "text-flock-stone hover:bg-flock-mist"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );

  function exportCSV() {
    if (daily.length === 0) {
      toast.error("No data to export.");
      return;
    }
    const csv = toCSV(
      ["Date", "Collected", "Broken", "Sold", "Revenue", "Break rate %"],
      daily.map((d) => [
        d.date,
        d.collected,
        d.broken,
        d.sold,
        fmt(d.revenue, 2),
        fmt(d.breakRate, 1),
      ]),
    );
    downloadCSV(`report-${rangeDays}d-${stamp()}.csv`, csv);
    toast.success("Exported CSV");
  }

  return (
    <AppShell
      title="Reports"
      subtitle="Production, revenue and quality trends over time."
      actions={
        <div className="flex items-center gap-2">
          {rangePicker}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-lg border bg-flock-fog px-3 py-2 font-sans text-[13px] text-flock-soil transition hover:bg-flock-mist"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      }
    >
      {!ready ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-flock-fog" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-lg bg-flock-fog" />
        </div>
      ) : daily.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-flock-fog px-4 py-16 text-center shadow-flock">
          <BarChart3 className="h-8 w-8 text-flock-stone" />
          <p className="font-sans text-[14px] text-flock-soil">
            No data for this period
          </p>
          <p className="font-sans text-[12px] text-flock-stone">
            Log egg records in EggLedger to see your trends here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary tiles */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat icon={<Egg className="h-4 w-4" />} label="Eggs collected" value={totals.collected.toLocaleString()} />
            <Stat icon={<TrendingUp className="h-4 w-4" />} label="Avg / day" value={fmt(totals.avgDaily, 0)} accent="field" />
            <Stat icon={<AlertTriangle className="h-4 w-4" />} label="Break rate" value={`${fmt(totals.breakRate, 1)}%`} accent="clay" />
            <Stat icon={<Wallet className="h-4 w-4" />} label="Revenue" value={`₵${fmt(totals.revenue, 0)}`} accent="harvest" />
          </div>

          {/* Production trend */}
          <ChartCard title="Egg collection trend">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={daily} margin={{ left: -16, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-flock-harvest)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-flock-harvest)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-flock-fog)" />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="collected" name="Collected" stroke="var(--color-flock-harvest)" fill="url(#gCollected)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Sold vs broken */}
          <ChartCard title="Eggs sold vs broken">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={daily} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-flock-fog)" />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="sold" name="Sold" fill="var(--color-flock-field)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="broken" name="Broken" fill="var(--color-flock-red)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Revenue line */}
          <ChartCard title="Daily egg revenue (₵)">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={daily} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-flock-fog)" />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} />
                <Tooltip content={<ChartTip prefix="₵" />} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="var(--color-flock-clay)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </AppShell>
  );
}

const axisTick = { fontSize: 11, fill: "var(--color-flock-stone)" };

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-flock-fog p-4 shadow-flock">
      <h3 className="mb-3 font-display text-lg text-flock-soil">{title}</h3>
      {children}
    </div>
  );
}

function ChartTip({
  active,
  payload,
  label,
  prefix = "",
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  prefix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-flock-cream px-3 py-2 shadow-flock">
      <p className="mb-1 font-sans text-[11px] font-medium text-flock-stone">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-mono text-[12px]" style={{ color: p.color }}>
          {p.name}: {prefix}
          {fmt(p.value, prefix ? 2 : 0)}
        </p>
      ))}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  accent = "soil",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: "soil" | "field" | "harvest" | "clay";
}) {
  const accentClass =
    accent === "field"
      ? "text-flock-field"
      : accent === "harvest"
        ? "text-flock-harvest"
        : accent === "clay"
          ? "text-flock-clay"
          : "text-flock-stone";
  return (
    <div className="rounded-lg border bg-flock-fog p-4 shadow-flock">
      <div className={`flex items-center gap-1.5 ${accentClass}`}>
        {icon}
        <span className="font-sans text-[12px] text-flock-stone">{label}</span>
      </div>
      <p className="mt-2 font-mono text-2xl text-flock-soil">{value}</p>
    </div>
  );
}
