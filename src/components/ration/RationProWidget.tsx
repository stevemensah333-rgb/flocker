import { useMemo, useState, useRef, useCallback } from "react";
import { X, Plus, Check, Search } from "lucide-react";
import {
  INGREDIENTS,
  STAGE_TARGETS,
  type IngredientCategory,
} from "@/lib/flock/ingredients";
import {
  computeTotals,
  nutrientStatus,
  cfStatus,
  buildAdvice,
  getIngredient,
  newId,
  fmt,
  type RationRow,
  type NutrientStatus,
} from "@/lib/flock/ration";

const CATEGORIES: ("All" | IngredientCategory)[] = [
  "All",
  "Energy",
  "Protein",
  "Minerals",
  "Additives",
];

const statusColor: Record<NutrientStatus, string> = {
  met: "text-flock-field",
  close: "text-flock-clay",
  deficit: "text-flock-red",
};

const statusIcon: Record<NutrientStatus, string> = {
  met: "✓",
  close: "⚠",
  deficit: "✗",
};

function defaultRows(priceMap?: Record<string, number>): RationRow[] {
  const pick = (name: string, kg: number, fallback: number): RationRow => ({
    id: newId(),
    name,
    kg,
    pricePerKg: priceMap?.[name] ?? fallback,
  });
  return [
    pick("Maize (yellow)", 55, 1.8),
    pick("Soya bean meal (solvent-ext.)", 20, 3.5),
    pick("Wheat bran", 8, 1.2),
    pick("Fish meal (65% CP)", 5, 4.5),
    pick("Oyster shell", 8.5, 0.6),
    pick("Dicalcium phosphate (DCP)", 2, 1.8),
    pick("Vitamin-mineral premix", 1, 8.0),
    pick("Salt (NaCl)", 0.5, 0.6),
  ];
}

export default function RationProWidget({
  onSave,
  onSavePrices,
  initialRows,
  initialStage,
  priceMap,
}: {
  onSave?: (data: {
    rows: RationRow[];
    stage: string;
    costPerKg: number;
  }) => void;
  onSavePrices?: (prices: { name: string; pricePerKg: number }[]) => void;
  initialRows?: RationRow[];
  initialStage?: string;
  priceMap?: Record<string, number>;
} = {}) {
  const [rows, setRows] = useState<RationRow[]>(
    initialRows ?? (() => defaultRows(priceMap)),
  );
  const [stageName, setStageName] = useState(initialStage ?? STAGE_TARGETS[3].stage);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<"All" | IngredientCategory>("All");
  const [showAdvice, setShowAdvice] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [basisKg, setBasisKg] = useState(100);
  const [birds, setBirds] = useState(1500);
  const [gramsPerBird, setGramsPerBird] = useState(120);
  const [days, setDays] = useState(14);

  const target = useMemo(
    () => STAGE_TARGETS.find((s) => s.stage === stageName)!,
    [stageName],
  );
  const totals = useMemo(() => computeTotals(rows), [rows]);
  const inRation = useMemo(() => new Set(rows.map((r) => r.name)), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return INGREDIENTS.filter(
      (i) =>
        (cat === "All" || i.category === cat) &&
        (q === "" || i.name.toLowerCase().includes(q)),
    );
  }, [search, cat]);

  const qtyRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const addIngredient = useCallback((name: string) => {
    if (inRation.has(name)) return;
    const id = newId();
    setRows((r) => [
      ...r,
      { id, name, kg: 0, pricePerKg: priceMap?.[name] ?? 0 },
    ]);
    setTimeout(() => qtyRefs.current[id]?.focus(), 0);
  }, [inRation, priceMap]);

  const updateRow = (id: string, patch: Partial<RationRow>) =>
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const removeRow = (id: string) =>
    setRows((r) => r.filter((row) => row.id !== id));

  const advice = useMemo(() => buildAdvice(totals, target), [totals, target]);

  const requiredKg = (birds * gramsPerBird * days) / 1000;
  const scaleFactor = totals.kg > 0 ? requiredKg / totals.kg : 0;
  const batchTotalKg = requiredKg;

  const kgDelta = totals.kg - basisKg;
  const kgColor =
    Math.abs(kgDelta) < 0.05
      ? "text-flock-field"
      : kgDelta > 0
        ? "text-flock-red"
        : "text-flock-clay";

  return (
    <div className="overflow-hidden rounded-lg border bg-flock-cream shadow-flock">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-flock-fog px-3 py-2">
        <span className="font-sans text-[13px] font-semibold text-flock-soil">
          RationPro
        </span>
        <span className="text-flock-stone">·</span>
        <label className="font-sans text-[12px] text-flock-stone">Stage</label>
        <select
          value={stageName}
          onChange={(e) => setStageName(e.target.value)}
          className="rounded-sm border bg-flock-mist px-2 py-1 font-sans text-[12px] text-flock-ink"
        >
          {STAGE_TARGETS.map((s) => (
            <option key={s.stage} value={s.stage}>
              {s.stage}
            </option>
          ))}
        </select>
        <span className="text-flock-stone">·</span>
        <label className="font-sans text-[12px] text-flock-stone">Batch</label>
        <div className="inline-flex items-center gap-1 rounded-sm border bg-flock-mist px-2 py-0.5">
          <input
            type="number"
            min={1}
            max={5000}
            value={basisKg}
            onChange={(e) =>
              setBasisKg(Math.min(5000, Math.max(0, Number(e.target.value) || 0)))
            }
            className="w-16 bg-transparent text-right font-mono text-[12px] outline-none"
          />
          <span className="font-sans text-[11px] text-flock-stone">kg</span>
        </div>
        <button
          onClick={() => setShowIngredients((s) => !s)}
          className={`rounded-sm border px-3 py-1 font-sans text-[12px] font-semibold transition ${
            showIngredients
              ? "bg-flock-soil text-flock-cream"
              : "bg-flock-mist text-flock-soil hover:bg-flock-fog"
          }`}
        >
          Ingredients
        </button>
        <button
          onClick={() => setShowAdvice(true)}
          className="ml-auto rounded-sm bg-flock-harvest px-3 py-1 font-sans text-[12px] font-semibold text-flock-soil"
        >
          Calculate
        </button>
        {onSavePrices && (
          <button
            onClick={() =>
              onSavePrices(
                rows
                  .filter((r) => r.pricePerKg > 0)
                  .map((r) => ({ name: r.name, pricePerKg: r.pricePerKg })),
              )
            }
            className="rounded-sm border bg-flock-mist px-3 py-1 font-sans text-[12px] font-semibold text-flock-soil hover:bg-flock-fog"
          >
            Save prices
          </button>
        )}
        {onSave && (
          <button
            onClick={() =>
              onSave({ rows, stage: stageName, costPerKg: totals.costPerKg })
            }
            className="rounded-sm border bg-flock-mist px-3 py-1 font-sans text-[12px] font-semibold text-flock-soil hover:bg-flock-fog"
          >
            Save formula
          </button>
        )}
      </div>


      <div
        className={`grid grid-cols-1 ${showIngredients ? "md:grid-cols-[260px_1fr]" : ""}`}
      >
        {/* Ingredient panel */}
        {showIngredients && (
        <div className="border-b md:border-b-0 md:border-r">

          <div className="border-b p-2">
            <div className="flex items-center gap-1 rounded-sm border bg-flock-mist px-2">
              <Search className="h-3.5 w-3.5 text-flock-stone" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ingredients…"
                className="w-full bg-transparent py-1.5 font-sans text-[13px] outline-none placeholder:text-flock-stone"
              />
            </div>
            <div className="mt-2 flex gap-1 overflow-x-auto">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`whitespace-nowrap rounded-sm px-2 py-0.5 font-sans text-[11px] ${
                    cat === c
                      ? "bg-flock-soil text-flock-cream"
                      : "bg-flock-fog text-flock-stone"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {filtered.map((ing) => {
              const added = inRation.has(ing.name);
              return (
                <div
                  key={ing.name}
                  className={`flex h-8 items-center gap-2 border-b px-2 ${
                    added ? "opacity-50" : ""
                  }`}
                >
                  <span className="flex-1 truncate font-sans text-[13px] text-flock-ink">
                    {ing.name}
                  </span>
                  <span className="font-mono text-[11px] text-flock-stone">
                    {fmt(ing.cp, 1)}% CP
                  </span>
                  <button
                    onClick={() => addIngredient(ing.name)}
                    disabled={added}
                    aria-label={`Add ${ing.name}`}
                    className={`flex h-6 w-6 items-center justify-center rounded-sm ${
                      added
                        ? "text-flock-stone"
                        : "text-flock-soil hover:text-flock-harvest"
                    }`}
                  >
                    {added ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        )}


        {/* Spreadsheet */}
        <div className="overflow-x-auto">
          <div className="flex items-center justify-end gap-2 px-3 py-1.5">
            <span className={`font-mono text-[12px] font-semibold ${kgColor}`}>
              Total: {fmt(totals.kg, 1)} kg
              {Math.abs(kgDelta) >= 0.05 &&
                (kgDelta > 0
                  ? ` ▲ ${fmt(kgDelta, 1)} kg over`
                  : ` ▼ ${fmt(-kgDelta, 1)} kg short`)}
            </span>
          </div>
          <SpreadTable
            rows={rows}
            totals={totals}
            target={target}
            basisKg={basisKg}
            updateRow={updateRow}
            removeRow={removeRow}
            qtyRefs={qtyRefs}
          />
        </div>
      </div>

      {/* Nutrient summary bar */}
      <div className="flex divide-x border-t bg-flock-mist">
        <NutrientTile label="CP" value={totals.cp} target={target.cp} unit="%" />
        <NutrientTile label="ME" value={totals.me} target={target.me} unit="" dp={0} />
        <NutrientTile label="CA" value={totals.ca} target={target.ca} unit="%" dp={2} />
        <NutrientTile label="AV.P" value={totals.avP} target={target.avP} unit="%" dp={2} />
        <NutrientTile label="LYS" value={totals.lys} target={target.lys} unit="%" dp={2} />
        <NutrientTile label="METH" value={totals.meth} target={target.meth} unit="%" dp={2} />
        <NutrientTile label="CF" value={totals.cf} target={target.cfMax} unit="%" max />
      </div>

      {/* Batch scaler */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t px-3 py-2 font-mono text-[12px] text-flock-ink">
        <span className="font-sans text-[12px] text-flock-stone">Scale for</span>
        <ScalerInput value={birds} onChange={setBirds} suffix="birds" w="w-16" />
        <span>×</span>
        <ScalerInput value={gramsPerBird} onChange={setGramsPerBird} suffix="g/bird/day" w="w-14" />
        <span>×</span>
        <ScalerInput value={days} onChange={setDays} suffix="days" w="w-12" />
        <span className="font-sans text-flock-stone">=</span>
        <span className="font-semibold text-flock-soil">
          {fmt(batchTotalKg, 0)} kg total · ₵{fmt(scaleFactor * totals.cost, 0)}
        </span>
      </div>

      {/* Correction advice */}
      {showAdvice && (
        <div className="border-t bg-flock-cream px-3 py-3">
          <div className="mb-1 font-sans text-[11px] font-semibold uppercase tracking-wide text-flock-stone">
            Correction advice
          </div>
          {advice.length === 0 ? (
            <p className="font-mono text-[12px] text-flock-field">
              ✓ All nutrients within target.
            </p>
          ) : (
            <div className="space-y-2">
              {advice.map((a) => (
                <div key={a.nutrient} className="font-mono text-[12px]">
                  <span className="text-flock-soil">
                    {a.nutrient}: {fmt(a.achieved, 1)} → {fmt(a.target, 1)} target (
                    {a.diff >= 0 ? "+" : ""}
                    {fmt(a.diff, 1)})
                  </span>
                  <div className="text-flock-stone">{a.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScalerInput({
  value,
  onChange,
  suffix,
  w,
}: {
  value: number;
  onChange: (n: number) => void;
  suffix: string;
  w: string;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className={`${w} rounded-sm bg-flock-fog px-1.5 py-0.5 text-right font-mono text-[12px] outline-none focus:ring-1 focus:ring-flock-harvest`}
      />
      <span className="font-sans text-[11px] text-flock-stone">{suffix}</span>
    </span>
  );
}

function NutrientTile({
  label,
  value,
  target,
  unit,
  dp = 1,
  max = false,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  dp?: number;
  max?: boolean;
}) {
  const status = max ? cfStatus(value, target) : nutrientStatus(value, target);
  const diff = value - target;
  return (
    <div className="flex-1 px-2 py-1.5 text-center">
      <div className="font-mono text-[10px] uppercase tracking-wide text-flock-stone">
        {label}
      </div>
      <div className="font-mono text-[12px] font-semibold text-flock-soil">
        {fmt(value, dp)}
        {unit}
      </div>
      <div className="font-mono text-[10px] text-flock-stone">
        {max ? "≤" : "/"}
        {fmt(target, dp)}
        {unit}
      </div>
      <div className={`font-mono text-[10px] ${statusColor[status]}`}>
        {diff >= 0 ? "+" : ""}
        {fmt(diff, dp)} {statusIcon[status]}
      </div>
    </div>
  );
}

function SpreadTable({
  rows,
  totals,
  target,
  basisKg,
  updateRow,
  removeRow,
  qtyRefs,
}: {
  rows: RationRow[];
  totals: ReturnType<typeof computeTotals>;
  target: (typeof STAGE_TARGETS)[number];
  basisKg: number;
  updateRow: (id: string, patch: Partial<RationRow>) => void;
  removeRow: (id: string) => void;
  qtyRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
}) {
  const basis = totals.kg > 0 ? totals.kg : 1;
  const th =
    "border px-1.5 py-1 text-right font-sans text-[10px] uppercase tracking-[0.06em] text-flock-stone";
  const td = "border px-1.5 font-mono text-[12px] text-right h-6";
  const cellInput =
    "w-full bg-transparent text-right font-mono text-[12px] outline-none focus:ring-1 focus:ring-flock-harvest";

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-flock-fog">
          <th className="border w-5"></th>
          <th className={`${th} text-left`}>Ingredient</th>
          <th className={th}>Qty (kg)</th>
          <th className={th}>Price/kg</th>
          <th className={th}>ME</th>
          <th className={th}>CP%</th>
          <th className={th}>CP ctr</th>
          <th className={th}>ME ctr</th>
          <th className={th}>Ca ctr</th>
          <th className={th}>AvP ctr</th>
          <th className={th}>Lys ctr</th>
          <th className={th}>Meth ctr</th>
          <th className={th}>Cost ₵</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => {
          const ing = getIngredient(row.name);
          if (!ing) return null;
          const f = row.kg / basis;
          return (
            <tr
              key={row.id}
              className={`group ${idx % 2 === 0 ? "bg-white" : "bg-flock-mist"}`}
            >
              <td className="border text-center">
                <button
                  onClick={() => removeRow(row.id)}
                  aria-label="Remove row"
                  className="text-flock-clay opacity-0 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </td>
              <td className="h-6 border px-1.5 text-left font-sans text-[12px] text-flock-ink">
                {row.name}
              </td>
              <td className={td}>
                <input
                  ref={(el) => {
                    qtyRefs.current[row.id] = el;
                  }}
                  type="number"
                  value={row.kg || ""}
                  onChange={(e) =>
                    updateRow(row.id, { kg: Number(e.target.value) || 0 })
                  }
                  className={cellInput}
                />
              </td>
              <td className={td}>
                <input
                  type="number"
                  value={row.pricePerKg || ""}
                  onChange={(e) =>
                    updateRow(row.id, {
                      pricePerKg: Number(e.target.value) || 0,
                    })
                  }
                  className={cellInput}
                />
              </td>
              <td className={`${td} text-flock-stone`}>{ing.me || "—"}</td>
              <td className={`${td} text-flock-stone`}>{fmt(ing.cp, 1)}</td>
              <td className={td}>{fmt(f * ing.cp, 2)}</td>
              <td className={td}>{fmt(f * ing.me, 0)}</td>
              <td className={td}>{fmt(f * ing.ca, 2)}</td>
              <td className={td}>{fmt(f * ing.avP, 2)}</td>
              <td className={td}>{fmt(f * ing.lys, 2)}</td>
              <td className={td}>{fmt(f * ing.meth, 2)}</td>
              <td className={td}>{fmt(row.kg * row.pricePerKg, 2)}</td>
            </tr>
          );
        })}
        {/* TOTAL */}
        <tr className="bg-flock-fog font-semibold">
          <td className="border"></td>
          <td className="h-6 border px-1.5 text-left font-sans text-[12px]">TOTAL</td>
          <td className={`${td} ${Math.abs(totals.kg - 100) < 0.05 ? "text-flock-field" : "text-flock-red"}`}>
            {fmt(totals.kg, 1)}
          </td>
          <td className={td}></td>
          <td className={td}></td>
          <td className={td}></td>
          <td className={td}>{fmt(totals.cp, 2)}</td>
          <td className={td}>{fmt(totals.me, 0)}</td>
          <td className={td}>{fmt(totals.ca, 2)}</td>
          <td className={td}>{fmt(totals.avP, 2)}</td>
          <td className={td}>{fmt(totals.lys, 2)}</td>
          <td className={td}>{fmt(totals.meth, 2)}</td>
          <td className={td}>{fmt(totals.cost, 2)}</td>
        </tr>
        {/* TARGET */}
        <tr className="bg-flock-mist italic">
          <td className="border"></td>
          <td className="h-6 border px-1.5 text-left font-sans text-[12px]">TARGET</td>
          <td className={td}>100</td>
          <td className={td}></td>
          <td className={td}></td>
          <td className={td}></td>
          <td className={td}>{fmt(target.cp, 2)}</td>
          <td className={td}>{fmt(target.me, 0)}</td>
          <td className={td}>{fmt(target.ca, 2)}</td>
          <td className={td}>{fmt(target.avP, 2)}</td>
          <td className={td}>{fmt(target.lys, 2)}</td>
          <td className={td}>{fmt(target.meth, 2)}</td>
          <td className={td}>—</td>
        </tr>
        {/* DIFF */}
        <tr className="font-semibold">
          <td className="border"></td>
          <td className="h-6 border px-1.5 text-left font-sans text-[12px]">DIFF</td>
          <td className={td}></td>
          <td className={td}></td>
          <td className={td}></td>
          <td className={td}></td>
          <DiffCell achieved={totals.cp} target={target.cp} td={td} />
          <DiffCell achieved={totals.me} target={target.me} td={td} dp={0} />
          <DiffCell achieved={totals.ca} target={target.ca} td={td} dp={2} />
          <DiffCell achieved={totals.avP} target={target.avP} td={td} dp={2} />
          <DiffCell achieved={totals.lys} target={target.lys} td={td} dp={2} />
          <DiffCell achieved={totals.meth} target={target.meth} td={td} dp={2} />
          <td className={td}></td>
        </tr>
      </tbody>
    </table>
  );
}

function DiffCell({
  achieved,
  target,
  td,
  dp = 2,
}: {
  achieved: number;
  target: number;
  td: string;
  dp?: number;
}) {
  const status = nutrientStatus(achieved, target);
  const diff = achieved - target;
  return (
    <td className={`${td} ${statusColor[status]}`}>
      {diff >= 0 ? "+" : ""}
      {fmt(diff, dp)}
    </td>
  );
}
