import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, Trash2, Save, Package, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/app/AppShell";
import { INGREDIENTS } from "@/lib/flock/ingredients";
import { fmt } from "@/lib/flock/ration";

export const Route = createFileRoute("/_authenticated/feed-store")({
  component: FeedStorePage,
});

type PriceRow = {
  id: string;
  ingredient_name: string;
  price_per_kg: number;
};

const CATEGORY_OF = new Map(INGREDIENTS.map((i) => [i.name, i.category]));

function FeedStorePage() {
  const [farmId, setFarmId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  // add form
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const load = useCallback(async (fid: string) => {
    const { data } = await supabase
      .from("ingredient_prices")
      .select("id, ingredient_name, price_per_kg")
      .eq("farm_id", fid)
      .order("ingredient_name");
    setRows((data ?? []) as PriceRow[]);
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
        await load(f.id);
      }
      setReady(true);
    })();
  }, [load]);

  const priced = useMemo(
    () => new Set(rows.map((r) => r.ingredient_name)),
    [rows],
  );

  const available = useMemo(
    () =>
      INGREDIENTS.map((i) => i.name).filter(
        (n) =>
          !priced.has(n) && n.toLowerCase().includes(query.toLowerCase()),
      ),
    [priced, query],
  );

  async function addPrice() {
    if (!farmId || !userId) {
      toast.error("Set up your farm first.");
      return;
    }
    if (!name) {
      toast.error("Pick an ingredient.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("ingredient_prices").insert({
      owner_id: userId,
      farm_id: farmId,
      ingredient_name: name,
      price_per_kg: Number(price) || 0,
    });
    setSaving(false);
    if (error) {
      toast.error(`Couldn't save — ${error.message}`);
      return;
    }
    toast.success("Ingredient added");
    setName("");
    setPrice("");
    await load(farmId);
  }

  async function updatePrice(id: string, value: number) {
    setRows((r) =>
      r.map((x) => (x.id === id ? { ...x, price_per_kg: value } : x)),
    );
    const { error } = await supabase
      .from("ingredient_prices")
      .update({ price_per_kg: value })
      .eq("id", id);
    if (error) toast.error(error.message);
  }

  async function remove(id: string) {
    const { error } = await supabase
      .from("ingredient_prices")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Removed");
  }

  const inputCls =
    "w-full rounded-lg border bg-flock-mist px-3 py-2 font-sans text-[14px] outline-none focus:ring-1 focus:ring-flock-harvest";

  return (
    <AppShell
      title="Feed Store"
      subtitle="Track current ingredient prices to power least-cost rations."
    >
      {/* Add form */}
      <div className="rounded-lg border bg-flock-fog p-4 shadow-flock">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div>
            <label className="font-sans text-[12px] text-flock-stone">
              Ingredient
            </label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-flock-stone" />
              <input
                list="ingredient-options"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setQuery(e.target.value);
                }}
                placeholder="Search ingredients…"
                className={`${inputCls} pl-8`}
              />
              <datalist id="ingredient-options">
                {available.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
          </div>
          <div>
            <label className="font-sans text-[12px] text-flock-stone">
              ₵ / kg
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className={`${inputCls} mt-1 sm:w-28`}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={addPrice}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-flock-harvest px-4 py-2 font-sans text-[14px] font-semibold text-flock-soil disabled:opacity-60"
            >
              <Plus className="h-4 w-4" /> {saving ? "Adding…" : "Add"}
            </button>
          </div>
        </div>
      </div>

      {/* Price list */}
      <h2 className="mb-3 mt-8 font-display text-xl text-flock-soil">
        Your prices
      </h2>
      {!ready ? (
        <div className="h-40 animate-pulse rounded-lg bg-flock-fog" />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-flock-fog px-4 py-10 text-center shadow-flock">
          <Package className="h-8 w-8 text-flock-stone" />
          <p className="font-sans text-[14px] text-flock-soil">
            No ingredient prices yet
          </p>
          <p className="font-sans text-[12px] text-flock-stone">
            Add prices above to keep your rations accurate.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-flock-fog shadow-flock">
          {rows.map((r, i) => (
            <div
              key={r.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                i > 0 ? "border-t border-flock-mist" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="truncate font-sans text-[14px] font-medium text-flock-soil">
                  {r.ingredient_name}
                </p>
                <p className="font-sans text-[12px] text-flock-stone">
                  {CATEGORY_OF.get(r.ingredient_name) ?? "Other"}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <span className="font-mono text-[13px] text-flock-stone">₵</span>
                <input
                  type="number"
                  defaultValue={fmt(r.price_per_kg, 2)}
                  onBlur={(e) => {
                    const v = Number(e.target.value) || 0;
                    if (v !== r.price_per_kg) updatePrice(r.id, v);
                  }}
                  className="w-24 rounded-lg border bg-flock-mist px-2 py-1.5 text-right font-mono text-[13px] outline-none focus:ring-1 focus:ring-flock-harvest"
                />
                <span className="font-mono text-[12px] text-flock-stone">/kg</span>
              </div>
              <button
                onClick={() => remove(r.id)}
                aria-label="Remove ingredient"
                className="text-flock-clay transition hover:text-flock-red"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 flex items-center gap-1.5 font-sans text-[12px] text-flock-stone">
        <Save className="h-3.5 w-3.5" /> Price edits save automatically when you
        tap away.
      </p>
    </AppShell>
  );
}
