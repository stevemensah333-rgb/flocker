import { INGREDIENTS, type Ingredient, type NutrientTarget } from "./ingredients";

export interface RationRow {
  id: string;
  name: string;
  kg: number;
  pricePerKg: number;
}

export interface RationTotals {
  kg: number;
  cp: number;
  me: number;
  ca: number;
  avP: number;
  lys: number;
  meth: number;
  cf: number;
  cost: number;
  costPerKg: number;
}

export type NutrientStatus = "met" | "close" | "deficit";

const ingredientByName = new Map<string, Ingredient>(
  INGREDIENTS.map((i) => [i.name, i]),
);

export function getIngredient(name: string): Ingredient | undefined {
  return ingredientByName.get(name);
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Nutrient values are the true weighted percentages of the whole mix, so the
// batch can be any total weight (100 kg … 5 T), not a fixed 100 kg basis.
export function computeTotals(rows: RationRow[]): RationTotals {
  let kg = 0, cost = 0;
  for (const row of rows) {
    kg += row.kg;
    cost += row.kg * row.pricePerKg;
  }
  const basis = kg > 0 ? kg : 1;
  let cp = 0, me = 0, ca = 0, avP = 0, lys = 0, meth = 0, cf = 0;
  for (const row of rows) {
    const ing = ingredientByName.get(row.name);
    if (!ing) continue;
    const f = row.kg / basis;
    cp += f * ing.cp;
    me += f * ing.me;
    ca += f * ing.ca;
    avP += f * ing.avP;
    lys += f * ing.lys;
    meth += f * ing.meth;
    cf += f * ing.cf;
  }
  return {
    kg, cp, me, ca, avP, lys, meth, cf, cost,
    costPerKg: kg > 0 ? cost / kg : 0,
  };
}


// Status of an achieved value vs target as a percentage-of-target deviation.
export function nutrientStatus(achieved: number, target: number): NutrientStatus {
  if (target === 0) return "met";
  const diffPct = Math.abs((achieved - target) / target) * 100;
  if (diffPct <= 5) return "met";
  if (diffPct <= 15) return "close";
  return "deficit";
}

export function cfStatus(achieved: number, max: number): NutrientStatus {
  if (achieved <= max) return "met";
  if (achieved <= max * 1.15) return "close";
  return "deficit";
}

export interface CorrectionAdvice {
  nutrient: string;
  achieved: number;
  target: number;
  diff: number;
  message: string;
}

// Plain-text correction suggestions, generated after "Calculate".
export function buildAdvice(
  totals: RationTotals,
  target: NutrientTarget,
): CorrectionAdvice[] {
  const advice: CorrectionAdvice[] = [];
  const checks: { key: string; label: string; achieved: number; tgt: number; unit: string }[] = [
    { key: "cp", label: "CP", achieved: totals.cp, tgt: target.cp, unit: "%" },
    { key: "ca", label: "Ca", achieved: totals.ca, tgt: target.ca, unit: "%" },
    { key: "avP", label: "Av.P", achieved: totals.avP, tgt: target.avP, unit: "%" },
    { key: "lys", label: "Lys", achieved: totals.lys, tgt: target.lys, unit: "%" },
    { key: "meth", label: "Meth", achieved: totals.meth, tgt: target.meth, unit: "%" },
  ];

  for (const c of checks) {
    const status = nutrientStatus(c.achieved, c.tgt);
    if (status === "met") continue;
    const diff = c.achieved - c.tgt;
    let msg = "";
    if (c.key === "cp") {
      const kg = Math.abs(diff) * 100 / 35.5; // ~ shift maize<->soya
      msg = diff < 0
        ? `Add ~${kg.toFixed(1)} kg soya bean meal, remove the same in maize.`
        : `Reduce protein source by ~${kg.toFixed(1)} kg, add maize.`;
    } else if (c.key === "ca") {
      const kg = Math.abs(diff) * 100 / 38;
      msg = diff < 0
        ? `Add ~${kg.toFixed(1)} kg oyster shell, reduce maize by the same.`
        : `Reduce oyster shell by ~${kg.toFixed(1)} kg.`;
    } else if (c.key === "avP") {
      const kg = Math.abs(diff) * 100 / 17.5;
      msg = diff < 0
        ? `Add ~${kg.toFixed(1)} kg DCP.`
        : `Reduce DCP by ~${kg.toFixed(1)} kg.`;
    } else if (c.key === "lys") {
      msg = diff < 0 ? `Add ~${(Math.abs(diff) * 100 / 78).toFixed(2)} kg L-Lysine.` : `Reduce lysine source.`;
    } else if (c.key === "meth") {
      msg = diff < 0 ? `Add ~${(Math.abs(diff) * 100 / 99).toFixed(2)} kg DL-Methionine.` : `Reduce methionine source.`;
    }
    advice.push({ nutrient: c.label, achieved: c.achieved, target: c.tgt, diff, message: msg });
  }
  return advice;
}

export function fmt(n: number, dp = 1): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
