import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Trash2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/app/AppShell";
import RationProWidget from "@/components/ration/RationProWidget";
import type { RationRow } from "@/lib/flock/ration";

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
  created_at: string;
};

function RationProPage() {
  const [farmId, setFarmId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedRation[]>([]);
  const [loaded, setLoaded] = useState<SavedRation | null>(null);

  const loadSaved = useCallback(async (fid: string) => {
    const { data } = await supabase
      .from("saved_rations")
      .select("id, name, stage, rows, created_at")
      .eq("farm_id", fid)
      .order("created_at", { ascending: false });
    setSaved((data ?? []) as unknown as SavedRation[]);
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
        loadSaved(f.id);
      }
    })();
  }, [loadSaved]);

  const handleSave = useCallback(
    async (data: { rows: RationRow[]; stage: string }) => {
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
      subtitle="Build and balance feed rations."
    >
      <RationProWidget
        key={loaded?.id ?? "new"}
        onSave={handleSave}
        initialRows={loaded?.rows}
        initialStage={loaded?.stage ?? undefined}
      />

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
            Tap "Save formula" above to store a ration you can reload anytime.
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
              <button
                onClick={() => setLoaded(r)}
                className="ml-auto rounded-lg border bg-flock-mist px-3 py-1.5 font-sans text-[12px] text-flock-soil transition hover:bg-flock-fog"
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
