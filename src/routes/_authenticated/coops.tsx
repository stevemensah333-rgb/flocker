import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, Trash2, Bird } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated/coops")({
  component: CoopsPage,
});

type Coop = {
  id: string;
  name: string;
  breed: string | null;
  count: number;
  age_weeks: number;
  production_type: string | null;
};

const PRODUCTION_TYPES = ["layer", "broiler", "cockerel", "pullet"];

function CoopsPage() {
  const [farmId, setFarmId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [coops, setCoops] = useState<Coop[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  // form
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [productionType, setProductionType] = useState("layer");
  const [count, setCount] = useState("");
  const [ageWeeks, setAgeWeeks] = useState("");

  const loadCoops = useCallback(async (fid: string) => {
    const { data } = await supabase
      .from("coops")
      .select("id, name, breed, count, age_weeks, production_type")
      .eq("farm_id", fid)
      .order("created_at");
    setCoops((data ?? []) as Coop[]);
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
        await loadCoops(f.id);
      }
      setReady(true);
    })();
  }, [loadCoops]);

  async function addCoop() {
    if (!farmId || !userId) {
      toast.error("Set up your farm first.");
      return;
    }
    if (!name.trim()) {
      toast.error("Give the coop a name.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("coops").insert({
      farm_id: farmId,
      owner_id: userId,
      name: name.trim(),
      breed: breed.trim() || null,
      production_type: productionType,
      count: Number(count) || 0,
      age_weeks: Number(ageWeeks) || 0,
    });
    setSaving(false);
    if (error) {
      toast.error(`Couldn't save — ${error.message}`);
      return;
    }
    toast.success("Coop added");
    setName("");
    setBreed("");
    setCount("");
    setAgeWeeks("");
    await loadCoops(farmId);
  }

  async function remove(id: string) {
    const { error } = await supabase.from("coops").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCoops((c) => c.filter((x) => x.id !== id));
  }

  const totalBirds = useMemo(
    () => coops.reduce((s, c) => s + (c.count || 0), 0),
    [coops],
  );

  const inputCls =
    "w-full rounded-lg border bg-flock-mist px-3 py-2 font-sans text-[14px] outline-none focus:ring-1 focus:ring-flock-harvest";

  return (
    <AppShell
      title="Coops"
      subtitle="Add and manage the coops on your farm."
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Coops" value={coops.length.toLocaleString()} />
        <Stat label="Total birds" value={totalBirds.toLocaleString()} accent="field" />
      </div>

      {/* Add form */}
      <div className="mt-6 rounded-lg border bg-flock-fog p-4 shadow-flock">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Coop name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Coop 2" className={inputCls} />
          </Field>
          <Field label="Breed">
            <input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Optional" className={inputCls} />
          </Field>
          <Field label="Type">
            <select value={productionType} onChange={(e) => setProductionType(e.target.value)} className={`${inputCls} capitalize`}>
              {PRODUCTION_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Number of birds">
            <input type="number" value={count} onChange={(e) => setCount(e.target.value)} placeholder="0" className={inputCls} />
          </Field>
          <Field label="Age (weeks)">
            <input type="number" value={ageWeeks} onChange={(e) => setAgeWeeks(e.target.value)} placeholder="0" className={inputCls} />
          </Field>
        </div>
        <button
          onClick={addCoop}
          disabled={saving}
          className="mt-4 flex items-center gap-1.5 rounded-lg bg-flock-harvest px-4 py-2 font-sans text-[14px] font-semibold text-flock-soil disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> {saving ? "Saving…" : "Add coop"}
        </button>
      </div>

      {/* Coops list */}
      <h2 className="mb-3 mt-8 font-display text-xl text-flock-soil">Your coops</h2>
      {!ready ? (
        <div className="h-40 animate-pulse rounded-lg bg-flock-fog" />
      ) : coops.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-flock-fog px-4 py-10 text-center shadow-flock">
          <Bird className="h-8 w-8 text-flock-stone" />
          <p className="font-sans text-[14px] text-flock-soil">No coops yet</p>
          <p className="font-sans text-[12px] text-flock-stone">Add your first coop above.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-flock-fog shadow-flock">
          {coops.map((c, i) => (
            <div
              key={c.id}
              className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-flock-mist" : ""}`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-flock-mist text-flock-field">
                <Bird className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-sans text-[14px] font-medium text-flock-soil">{c.name}</p>
                <p className="font-sans text-[12px] text-flock-stone">
                  {c.breed ?? "Mixed"} · {c.production_type ?? "layer"} · {c.age_weeks}w old
                </p>
              </div>
              <p className="ml-auto font-mono text-[14px] text-flock-soil">{c.count.toLocaleString()}</p>
              <button onClick={() => remove(c.id)} aria-label="Delete coop" className="text-flock-clay transition hover:text-flock-red">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
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
  label,
  value,
  accent = "soil",
}: {
  label: string;
  value: string;
  accent?: "soil" | "field";
}) {
  const accentClass = accent === "field" ? "text-flock-field" : "text-flock-stone";
  return (
    <div className="rounded-lg border bg-flock-fog p-4 shadow-flock">
      <span className={`font-sans text-[12px] ${accentClass}`}>{label}</span>
      <p className="mt-2 font-mono text-2xl text-flock-soil">{value}</p>
    </div>
  );
}
