import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bird } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your farm — Flocker" },
      { name: "description", content: "Get started with Flocker: create your poultry farm profile and your first flock in a few quick steps." },
      { property: "og:title", content: "Set up your farm — Flocker" },
      { property: "og:description", content: "Create your poultry farm and first flock to start managing feed, eggs and health with Flocker." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Onboarding,
});

const PRODUCTION_TYPES = ["layer", "broiler", "cockerel", "pullet"];
const PRICE_INGREDIENTS = [
  "Maize (yellow)",
  "Soya bean meal (solvent-ext.)",
  "Wheat bran",
  "Fish meal (65% CP)",
  "Oyster shell",
  "Dicalcium phosphate (DCP)",
  "Vitamin-mineral premix",
  "Salt (NaCl)",
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // step 1
  const [farmName, setFarmName] = useState("");
  const [location, setLocation] = useState("");
  const [region, setRegion] = useState("");
  const [coopName, setCoopName] = useState("Coop 1");
  const [breed, setBreed] = useState("");
  const [productionType, setProductionType] = useState("layer");
  const [birds, setBirds] = useState("");
  const [ageWeeks, setAgeWeeks] = useState("");

  // step 2
  const [eggPrice, setEggPrice] = useState("");
  const [prices, setPrices] = useState<Record<string, string>>({});

  // skip onboarding if already done
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", u.user.id)
        .maybeSingle();
      if (data?.onboarded) navigate({ to: "/dashboard" });
    })();
  }, [navigate]);

  async function finish() {
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) throw new Error("Not signed in");

      const { data: farm, error: farmErr } = await supabase
        .from("farms")
        .insert({
          owner_id: userId,
          name: farmName,
          location,
          region,
          egg_price: Number(eggPrice) || 0,
        })
        .select("id")
        .single();
      if (farmErr) throw farmErr;

      const { error: coopErr } = await supabase.from("coops").insert({
        farm_id: farm.id,
        owner_id: userId,
        name: coopName,
        breed,
        production_type: productionType,
        count: Number(birds) || 0,
        age_weeks: Number(ageWeeks) || 0,
      });
      if (coopErr) throw coopErr;

      const priceRows = Object.entries(prices)
        .filter(([, v]) => v !== "")
        .map(([ingredient_name, v]) => ({
          farm_id: farm.id,
          owner_id: userId,
          ingredient_name,
          price_per_kg: Number(v) || 0,
        }));
      if (priceRows.length > 0) {
        const { error: priceErr } = await supabase
          .from("ingredient_prices")
          .insert(priceRows);
        if (priceErr) throw priceErr;
      }

      const { error: profErr } = await supabase
        .from("profiles")
        .update({ onboarded: true })
        .eq("id", userId);
      if (profErr) throw profErr;

      toast.success("Your farm is ready!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `Couldn't save — ${err.message}`
          : "Couldn't save your farm. Check your connection.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-flock-cream px-4 py-10">
      <div className="mx-auto max-w-lg animate-flock-enter">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Bird className="h-6 w-6 text-flock-harvest" />
          <span className="font-display text-2xl text-flock-soil">Flocker</span>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <StepDot active={step >= 1} label="Your farm" n={1} />
          <div className="h-px flex-1 bg-border" />
          <StepDot active={step >= 2} label="Prices" n={2} />
        </div>

        <div className="rounded-lg border bg-flock-fog p-6 shadow-flock">
          {step === 1 ? (
            <>
              <h1 className="font-display text-2xl text-flock-soil">
                Name your farm
              </h1>
              <p className="mt-1 font-sans text-[13px] text-flock-stone">
                Add your first coop too — you can add more later.
              </p>
              <div className="mt-5 space-y-3">
                <In label="Farm name" value={farmName} onChange={setFarmName} />
                <div className="grid grid-cols-2 gap-3">
                  <In label="Town / city" value={location} onChange={setLocation} />
                  <In label="Region" value={region} onChange={setRegion} />
                </div>
                <hr className="border-border" />
                <In label="Coop name" value={coopName} onChange={setCoopName} />
                <div className="grid grid-cols-2 gap-3">
                  <In label="Breed" value={breed} onChange={setBreed} />
                  <div>
                    <label className="font-sans text-[12px] text-flock-stone">
                      Type
                    </label>
                    <select
                      value={productionType}
                      onChange={(e) => setProductionType(e.target.value)}
                      className="mt-1 w-full rounded-lg border bg-flock-mist px-3 py-2 font-sans text-[14px] capitalize outline-none focus:ring-1 focus:ring-flock-harvest"
                    >
                      {PRODUCTION_TYPES.map((t) => (
                        <option key={t} value={t} className="capitalize">
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <In label="Number of birds" value={birds} onChange={setBirds} type="number" />
                  <In label="Age (weeks)" value={ageWeeks} onChange={setAgeWeeks} type="number" />
                </div>
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!farmName || !coopName}
                className="mt-6 w-full rounded-lg bg-flock-harvest px-4 py-2.5 font-sans text-[15px] font-semibold text-flock-soil disabled:opacity-50"
              >
                Continue
              </button>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl text-flock-soil">
                Set your prices
              </h1>
              <p className="mt-1 font-sans text-[13px] text-flock-stone">
                Used to calculate feed cost and egg profit. You can change these
                anytime.
              </p>
              <div className="mt-5 space-y-3">
                <In
                  label="Egg selling price (₵ per egg)"
                  value={eggPrice}
                  onChange={setEggPrice}
                  type="number"
                />
                <div className="font-sans text-[12px] uppercase tracking-wide text-flock-stone">
                  Feed prices (₵/kg)
                </div>
                {PRICE_INGREDIENTS.map((ing) => (
                  <div key={ing} className="flex items-center gap-3">
                    <span className="flex-1 font-sans text-[13px] text-flock-ink">
                      {ing}
                    </span>
                    <input
                      type="number"
                      value={prices[ing] ?? ""}
                      onChange={(e) =>
                        setPrices((p) => ({ ...p, [ing]: e.target.value }))
                      }
                      placeholder="0.00"
                      className="w-24 rounded-lg border bg-flock-mist px-2 py-1.5 text-right font-mono text-[13px] outline-none focus:ring-1 focus:ring-flock-harvest"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="rounded-lg border bg-flock-cream px-4 py-2.5 font-sans text-[14px] text-flock-soil"
                >
                  Back
                </button>
                <button
                  onClick={finish}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-flock-harvest px-4 py-2.5 font-sans text-[15px] font-semibold text-flock-soil disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Finish setup"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StepDot({ active, label, n }: { active: boolean; label: string; n: number }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-[12px] ${
          active
            ? "bg-flock-harvest text-flock-soil"
            : "bg-flock-fog text-flock-stone"
        }`}
      >
        {n}
      </span>
      <span className="font-sans text-[13px] text-flock-soil">{label}</span>
    </div>
  );
}

function In({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="font-sans text-[12px] text-flock-stone">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border bg-flock-mist px-3 py-2 font-sans text-[14px] outline-none focus:ring-1 focus:ring-flock-harvest"
      />
    </div>
  );
}
