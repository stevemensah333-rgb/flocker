import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, Trash2, Egg, TrendingUp, AlertTriangle, Wallet, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/app/AppShell";
import { fmt } from "@/lib/flock/ration";
import { toCSV, downloadCSV, stamp } from "@/lib/flock/export";

export const Route = createFileRoute("/_authenticated/egg-ledger")({
  component: EggLedgerPage,
});

type Coop = { id: string; name: string };
type EggRecord = {
  id: string;
  record_date: string;
  coop_id: string | null;
  eggs_collected: number;
  eggs_broken: number;
  eggs_sold: number;
  price_per_egg: number;
  note: string | null;
};

const today = () => new Date().toISOString().slice(0, 10);

function EggLedgerPage() {
  const [farmId, setFarmId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [eggPrice, setEggPrice] = useState(0);
  const [coops, setCoops] = useState<Coop[]>([]);
  const [records, setRecords] = useState<EggRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  // form
  const [date, setDate] = useState(today());
  const [coopId, setCoopId] = useState<string>("");
  const [crateSize, setCrateSize] = useState(30);
  const [collectedCrates, setCollectedCrates] = useState("");
  const [collected, setCollected] = useState("");
  const [brokenCrates, setBrokenCrates] = useState("");
  const [broken, setBroken] = useState("");
  const [soldCrates, setSoldCrates] = useState("");
  const [sold, setSold] = useState("");
  const [price, setPrice] = useState("");

  const combine = (crates: string, eggs: string) =>
    (Number(crates) || 0) * crateSize + (Number(eggs) || 0);

  const loadRecords = useCallback(async (fid: string) => {
    const { data } = await supabase
      .from("egg_records")
      .select(
        "id, record_date, coop_id, eggs_collected, eggs_broken, eggs_sold, price_per_egg, note",
      )
      .eq("farm_id", fid)
      .order("record_date", { ascending: false })
      .limit(60);
    setRecords((data ?? []) as EggRecord[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const { data: f } = await supabase
        .from("farms")
        .select("id, egg_price")
        .eq("owner_id", u.user.id)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (f) {
        setFarmId(f.id);
        setEggPrice(f.egg_price ?? 0);
        setPrice(String(f.egg_price ?? ""));
        const { data: c } = await supabase
          .from("coops")
          .select("id, name")
          .eq("farm_id", f.id)
          .order("created_at");
        setCoops(c ?? []);
        await loadRecords(f.id);
      }
      setReady(true);
    })();
  }, [loadRecords]);

  async function addRecord() {
    if (!farmId || !userId) {
      toast.error("Set up your farm first.");
      return;
    }
    const collectedTotal = combine(collectedCrates, collected);
    const brokenTotal = combine(brokenCrates, broken);
    const soldTotal = combine(soldCrates, sold);
    if (!collectedTotal && !soldTotal && !brokenTotal) {
      toast.error("Enter at least one egg or crate count.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("egg_records").insert({
      owner_id: userId,
      farm_id: farmId,
      coop_id: coopId || null,
      record_date: date,
      eggs_collected: collectedTotal,
      eggs_broken: brokenTotal,
      eggs_sold: soldTotal,
      price_per_egg: Number(price) || eggPrice || 0,
    });
    setSaving(false);
    if (error) {
      toast.error(`Couldn't save — ${error.message}`);
      return;
    }
    toast.success("Record added");
    setCollectedCrates("");
    setCollected("");
    setBrokenCrates("");
    setBroken("");
    setSoldCrates("");
    setSold("");
    await loadRecords(farmId);
  }

  async function remove(id: string) {
    const { error } = await supabase.from("egg_records").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRecords((r) => r.filter((x) => x.id !== id));
  }

  const coopName = useCallback(
    (id: string | null) => coops.find((c) => c.id === id)?.name ?? "All coops",
    [coops],
  );

  const stats = useMemo(() => {
    const totalCollected = records.reduce((s, r) => s + r.eggs_collected, 0);
    const totalBroken = records.reduce((s, r) => s + r.eggs_broken, 0);
    const totalSold = records.reduce((s, r) => s + r.eggs_sold, 0);
    const revenue = records.reduce(
      (s, r) => s + r.eggs_sold * r.price_per_egg,
      0,
    );
    const breakRate =
      totalCollected > 0 ? (totalBroken / totalCollected) * 100 : 0;
    return { totalCollected, totalBroken, totalSold, revenue, breakRate };
  }, [records]);

  const inputCls =
    "w-full rounded-lg border bg-flock-mist px-3 py-2 font-sans text-[14px] outline-none focus:ring-1 focus:ring-flock-harvest";

  function exportCSV() {
    if (records.length === 0) {
      toast.error("No records to export.");
      return;
    }
    const csv = toCSV(
      ["Date", "Coop", "Collected", "Broken", "Sold", "Price/egg", "Revenue"],
      records.map((r) => [
        r.record_date,
        coopName(r.coop_id),
        r.eggs_collected,
        r.eggs_broken,
        r.eggs_sold,
        fmt(r.price_per_egg, 2),
        fmt(r.eggs_sold * r.price_per_egg, 2),
      ]),
    );
    downloadCSV(`egg-records-${stamp()}.csv`, csv);
    toast.success("Exported CSV");
  }

  return (
    <AppShell
      title="EggLedger"
      subtitle="Log daily egg collection, breakages and sales."
      actions={
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 rounded-lg border bg-flock-fog px-3 py-2 font-sans text-[13px] text-flock-soil transition hover:bg-flock-mist"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      }
    >
      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={<Egg className="h-4 w-4" />} label="Eggs collected" value={stats.totalCollected.toLocaleString()} />
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Eggs sold" value={stats.totalSold.toLocaleString()} accent="field" />
        <Stat icon={<AlertTriangle className="h-4 w-4" />} label="Break rate" value={`${fmt(stats.breakRate, 1)}%`} accent="clay" />
        <Stat icon={<Wallet className="h-4 w-4" />} label="Egg revenue" value={`₵${fmt(stats.revenue, 0)}`} accent="harvest" />
      </div>

      {/* Add form */}
      <div className="mt-6 rounded-lg border bg-flock-fog p-4 shadow-flock">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Coop">
            <select value={coopId} onChange={(e) => setCoopId(e.target.value)} className={inputCls}>
              <option value="">All coops</option>
              {coops.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Collected">
            <input type="number" value={collected} onChange={(e) => setCollected(e.target.value)} placeholder="0" className={inputCls} />
          </Field>
          <Field label="Broken">
            <input type="number" value={broken} onChange={(e) => setBroken(e.target.value)} placeholder="0" className={inputCls} />
          </Field>
          <Field label="Sold">
            <input type="number" value={sold} onChange={(e) => setSold(e.target.value)} placeholder="0" className={inputCls} />
          </Field>
          <Field label="₵ / egg">
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className={inputCls} />
          </Field>
        </div>
        <button
          onClick={addRecord}
          disabled={saving}
          className="mt-4 flex items-center gap-1.5 rounded-lg bg-flock-harvest px-4 py-2 font-sans text-[14px] font-semibold text-flock-soil disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> {saving ? "Saving…" : "Add record"}
        </button>
      </div>

      {/* Records table */}
      <h2 className="mb-3 mt-8 font-display text-xl text-flock-soil">Recent records</h2>
      {!ready ? (
        <div className="h-40 animate-pulse rounded-lg bg-flock-fog" />
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-flock-fog px-4 py-10 text-center shadow-flock">
          <Egg className="h-8 w-8 text-flock-stone" />
          <p className="font-sans text-[14px] text-flock-soil">No records yet</p>
          <p className="font-sans text-[12px] text-flock-stone">Add your first daily entry above.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-flock-fog shadow-flock">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-flock-mist text-left">
                {["Date", "Coop", "Collected", "Broken", "Sold", "₵/egg", "Revenue", ""].map((h) => (
                  <th key={h} className="px-3 py-2 font-sans text-[11px] uppercase tracking-wide text-flock-stone">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r.id} className={i > 0 ? "border-t border-flock-mist" : ""}>
                  <td className="px-3 py-2 font-mono text-[12px] text-flock-soil">
                    {new Date(r.record_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                  </td>
                  <td className="px-3 py-2 font-sans text-[13px] text-flock-ink">{coopName(r.coop_id)}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-flock-soil">{r.eggs_collected.toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-flock-red">{r.eggs_broken.toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-flock-field">{r.eggs_sold.toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-flock-stone">{fmt(r.price_per_egg, 2)}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-flock-soil">₵{fmt(r.eggs_sold * r.price_per_egg, 2)}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => remove(r.id)} aria-label="Delete record" className="text-flock-clay transition hover:text-flock-red">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-sans text-[12px] text-flock-stone">{label}</label>
      <div className="mt-1">{children}</div>
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
