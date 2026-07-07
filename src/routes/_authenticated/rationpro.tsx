import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Trash2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/app/AppShell";
import RationProWidget from "@/components/ration/RationProWidget";
import type { RationRow } from "@/lib/flock/ration";
import { fmt } from "@/lib/flock/ration";

export const Route = createFileRoute("/_authenticated/rationpro")({
  head: () => ({
    meta: [
      { title: "Feed Management & RationPro — Flocker" },
      { name: "description", content: "Formulate least-cost poultry rations with RationPro: balance crude protein and energy while controlling feed costs." },
      { property: "og:title", content: "Feed Management & RationPro — Flocker" },
      { property: "og:description", content: "Build and cost poultry feed rations with RationPro, balancing nutrition and price for every batch." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RationProPage,
});

type SavedRation = {
  id: string;
  name: string;
  stage: string | null;
  rows: RationRow[];
  cost_per_kg: number;
  created_at: string;
};

function RationProPage() {
  const [farmId, setFarmId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedRation[]>([]);
  const [loaded, setLoaded] = useState<SavedRation | null>(null);
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  const [pricesReady, setPricesReady] = useState(false);

  const loadSaved = useCallback(async (fid: string) => {
    const { data } = await supabase
      .from("saved_rations")
      .select("id, name, stage, rows, cost_per_kg, created_at")
      .eq("farm_id", fid)
      .order("created_at", { ascending: false });
    setSaved((data ?? []) as unknown as SavedRation[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setPricesReady(true);
        return;
      }
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
        loadSaved(f.id);
        const { data: prices } = await supabase
          .from("ingredient_prices")
          .select("ingredient_name, price_per_kg")
          .eq("farm_id", f.id);
        const map: Record<string, number> = {};
        for (const p of prices ?? []) map[p.ingredient_name] = p.price_per_kg;
        setPriceMap(map);
      }
      setPricesReady(true);
    })();
  }, [loadSaved]);

  const handleSave = useCallback(
    async (data: { rows: RationRow[]; stage: string; costPerKg: number }) => {
      if (!farmId || !userId) {
        toast.error("Set up your farm first.");
        return;
      }
      const name = window.prompt("Name this feed formula:", data.stage);
      if (!name) return;
      const { error } = await supabase.from("saved_rations").insert({
        owner_id: userId,
        farm_id: farmId,
        name,
        stage: data.stage,
        rows: data.rows as unknown as never,
        cost_per_kg: Math.round(data.costPerKg * 100) / 100,
      });
      if (error) {
        toast.error(`Couldn't save — ${error.message}`);
        return;
      }
      toast.success("Formula saved");
      loadSaved(farmId);
    },
    [farmId, userId, loadSaved],
  );

  const handleSavePrices = useCallback(
    async (prices: { name: string; pricePerKg: number }[]) => {
      if (!farmId || !userId) {
        toast.error("Set up your farm first.");
        return;
      }
      if (prices.length === 0) {
        toast.error("Enter at least one price first.");
        return;
      }
      const { error } = await supabase.from("ingredient_prices").upsert(
        prices.map((p) => ({
          owner_id: userId,
          farm_id: farmId,
          ingredient_name: p.name,
          price_per_kg: p.pricePerKg,
        })),
        { onConflict: "farm_id,ingredient_name" },
      );
      if (error) {
        toast.error(`Couldn't save — ${error.message}`);
        return;
      }
      setPriceMap((m) => {
        const next = { ...m };
        for (const p of prices) next[p.name] = p.pricePerKg;
        return next;
      });
      toast.success("Feed prices saved");
    },
    [farmId, userId],
  );

  async function remove(id: string) {
    const { error } = await supabase.from("saved_rations").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSaved((s) => s.filter((r) => r.id !== id));
    toast.success("Formula deleted");
  }

  return (
    <AppShell
      title="RationPro"
      subtitle="Build and balance least-cost feed rations on a 100 kg basis."
    >
      <RationProWidget
        key={loaded?.id ?? (pricesReady ? "new" : "loading")}
        onSave={handleSave}
        onSavePrices={handleSavePrices}
        initialRows={loaded?.rows}
        initialStage={loaded?.stage ?? undefined}
        priceMap={priceMap}
      />
      <p className="mt-2 font-sans text-[12px] text-flock-stone">
        Tap “Save prices” to store your feed prices — they’ll auto-fill next time.
      </p>


      <h2 className="mb-3 mt-8 font-display text-xl text-flock-soil">
        Saved formulas
      </h2>
      {saved.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-flock-fog px-4 py-10 text-center shadow-flock">
          <FileSpreadsheet className="h-8 w-8 text-flock-stone" />
          <p className="font-sans text-[14px] text-flock-soil">
            No saved formulas yet
          </p>
          <p className="font-sans text-[12px] text-flock-stone">
            Tap “Save formula” above to store a ration you can reload anytime.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-flock-fog shadow-flock">
          {saved.map((r, i) => (
            <div
              key={r.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                i > 0 ? "border-t border-flock-mist" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="truncate font-sans text-[14px] font-medium text-flock-soil">
                  {r.name}
                </p>
                <p className="font-sans text-[12px] text-flock-stone">
                  {r.stage ?? "—"} · {r.rows.length} ingredients
                </p>
              </div>
              <span className="ml-auto font-mono text-[13px] text-flock-soil">
                ₵{fmt(r.cost_per_kg, 2)}/kg
              </span>
              <button
                onClick={() => setLoaded(r)}
                className="rounded-lg border bg-flock-mist px-3 py-1.5 font-sans text-[12px] text-flock-soil transition hover:bg-flock-fog"
              >
                Load
              </button>
              <button
                onClick={() => remove(r.id)}
                aria-label="Delete formula"
                className="text-flock-clay transition hover:text-flock-red"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
