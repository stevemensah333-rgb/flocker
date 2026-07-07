import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, Trash2, Syringe, Stethoscope, Wallet, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/app/AppShell";
import { fmt } from "@/lib/flock/ration";
import { toCSV, downloadCSV, stamp } from "@/lib/flock/export";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({
    meta: [
      { title: "Health Records — Flocker" },
      { name: "description", content: "Log flock health events: vaccinations, treatments, mortality and costs to keep a complete poultry health history." },
      { property: "og:title", content: "Health Records — Flocker" },
      { property: "og:description", content: "Track vaccinations, treatments and mortality with costs for a full poultry flock health record." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EventsPage,
});

type Coop = { id: string; name: string };
type FlockEvent = {
  id: string;
  event_type: string;
  event_date: string;
  coop_id: string | null;
  cost: number;
  note: string | null;
};

const EVENT_TYPES = [
  "Vaccination",
  "Debeaking",
  "Deworming",
  "Medication",
  "Vitamins / supplements",
  "Cleaning / disinfection",
  "Culling",
  "Mortality",
  "Other",
];

const today = () => new Date().toISOString().slice(0, 10);

function EventsPage() {
  const [farmId, setFarmId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [coops, setCoops] = useState<Coop[]>([]);
  const [events, setEvents] = useState<FlockEvent[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  // form
  const [date, setDate] = useState(today());
  const [coopId, setCoopId] = useState<string>("");
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [cost, setCost] = useState("");
  const [note, setNote] = useState("");

  const loadEvents = useCallback(async (fid: string) => {
    const { data } = await supabase
      .from("flock_events")
      .select("id, event_type, event_date, coop_id, cost, note")
      .eq("farm_id", fid)
      .order("event_date", { ascending: false })
      .limit(100);
    setEvents((data ?? []) as FlockEvent[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const { data: f } = await supabase
        .from("farms")
        .select("id")
        .eq("owner_id", u.user.id)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (f) {
        setFarmId(f.id);
        const { data: c } = await supabase
          .from("coops")
          .select("id, name")
          .eq("farm_id", f.id)
          .order("created_at");
        setCoops(c ?? []);
        await loadEvents(f.id);
      }
      setReady(true);
    })();
  }, [loadEvents]);

  async function addEvent() {
    if (!farmId || !userId) {
      toast.error("Set up your farm first.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("flock_events").insert({
      owner_id: userId,
      farm_id: farmId,
      coop_id: coopId || null,
      event_type: eventType,
      event_date: date,
      cost: Number(cost) || 0,
      note: note.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(`Couldn't save — ${error.message}`);
      return;
    }
    toast.success("Event recorded");
    setCost("");
    setNote("");
    await loadEvents(farmId);
  }

  async function remove(id: string) {
    const { error } = await supabase.from("flock_events").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEvents((e) => e.filter((x) => x.id !== id));
  }

  const coopName = useCallback(
    (id: string | null) => coops.find((c) => c.id === id)?.name ?? "All coops",
    [coops],
  );

  const totalCost = useMemo(
    () => events.reduce((s, e) => s + (e.cost || 0), 0),
    [events],
  );

  const inputCls =
    "w-full rounded-lg border bg-flock-mist px-3 py-2 font-sans text-[14px] outline-none focus:ring-1 focus:ring-flock-harvest";

  function exportCSV() {
    if (events.length === 0) {
      toast.error("No events to export.");
      return;
    }
    const csv = toCSV(
      ["Date", "Event", "Coop", "Cost", "Note"],
      events.map((e) => [
        e.event_date,
        e.event_type,
        coopName(e.coop_id),
        fmt(e.cost, 2),
        e.note ?? "",
      ]),
    );
    downloadCSV(`flock-events-${stamp()}.csv`, csv);
    toast.success("Exported CSV");
  }

  return (
    <AppShell
      title="Events"
      subtitle="Record vaccinations, debeaking, treatments and other flock activities."
      actions={
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 rounded-lg border bg-flock-fog px-3 py-2 font-sans text-[13px] text-flock-soil transition hover:bg-flock-mist"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat icon={<Stethoscope className="h-4 w-4" />} label="Events logged" value={events.length.toLocaleString()} />
        <Stat icon={<Syringe className="h-4 w-4" />} label="This list" value={`${events.length} recent`} accent="field" />
        <Stat icon={<Wallet className="h-4 w-4" />} label="Total cost" value={`₵${fmt(totalCost, 0)}`} accent="harvest" />
      </div>

      {/* Add form */}
      <div className="mt-6 rounded-lg border bg-flock-fog p-4 shadow-flock">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Event">
            <select value={eventType} onChange={(e) => setEventType(e.target.value)} className={inputCls}>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Coop">
            <select value={coopId} onChange={(e) => setCoopId(e.target.value)} className={inputCls}>
              <option value="">All coops</option>
              {coops.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Cost (₵)">
            <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" className={inputCls} />
          </Field>
          <Field label="Note">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" className={inputCls} />
          </Field>
        </div>
        <button
          onClick={addEvent}
          disabled={saving}
          className="mt-4 flex items-center gap-1.5 rounded-lg bg-flock-harvest px-4 py-2 font-sans text-[14px] font-semibold text-flock-soil disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> {saving ? "Saving…" : "Record event"}
        </button>
      </div>

      {/* Events table */}
      <h2 className="mb-3 mt-8 font-display text-xl text-flock-soil">Recent events</h2>
      {!ready ? (
        <div className="h-40 animate-pulse rounded-lg bg-flock-fog" />
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-flock-fog px-4 py-10 text-center shadow-flock">
          <Syringe className="h-8 w-8 text-flock-stone" />
          <p className="font-sans text-[14px] text-flock-soil">No events yet</p>
          <p className="font-sans text-[12px] text-flock-stone">Record your first vaccination or treatment above.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-flock-fog shadow-flock">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-flock-mist text-left">
                {["Date", "Event", "Coop", "Cost", "Note", ""].map((h) => (
                  <th key={h} className="px-3 py-2 font-sans text-[11px] uppercase tracking-wide text-flock-stone">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={e.id} className={i > 0 ? "border-t border-flock-mist" : ""}>
                  <td className="px-3 py-2 font-mono text-[12px] text-flock-soil">
                    {new Date(e.event_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                  </td>
                  <td className="px-3 py-2 font-sans text-[13px] text-flock-ink">{e.event_type}</td>
                  <td className="px-3 py-2 font-sans text-[13px] text-flock-stone">{coopName(e.coop_id)}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-flock-soil">₵{fmt(e.cost, 2)}</td>
                  <td className="px-3 py-2 font-sans text-[12px] text-flock-stone">{e.note ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => remove(e.id)} aria-label="Delete event" className="text-flock-clay transition hover:text-flock-red">
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
