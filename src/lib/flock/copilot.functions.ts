import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ── Flock Copilot ──────────────────────────────────────────────────────────
// A central intelligence layer: reads all of a farm's data every load, detects
// anomalies / predictions / economic signals deterministically, then uses
// Lovable AI to phrase each one as a clear, actionable insight for the farmer.

const ROUTES = ["/coops", "/egg-ledger", "/events", "/vetline", "/rationpro", "/reports"] as const;
type ActionRoute = (typeof ROUTES)[number];

export type CopilotCard = {
  severity: "critical" | "watch" | "good";
  title: string;
  body: string;
  actionLabel: string;
  actionRoute: ActionRoute;
};

type Signal = {
  key: string;
  severity: CopilotCard["severity"];
  fact: string;
  suggestedRoute: ActionRoute;
};

const day = 86400000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

function avg(nums: number[]) {
  return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
}

export const generateCopilotBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ cards: CopilotCard[]; generatedAt: string }> => {
    const { supabase, userId } = context;

    const { data: farm } = await supabase
      .from("farms")
      .select("id, name, egg_price")
      .eq("owner_id", userId)
      .order("created_at")
      .limit(1)
      .maybeSingle();

    if (!farm) return { cards: [], generatedAt: new Date().toISOString() };

    const today = new Date();
    const since30 = iso(new Date(today.getTime() - 30 * day));

    const [{ data: coops }, { data: eggs }, { data: events }] = await Promise.all([
      supabase
        .from("coops")
        .select("id, name, breed, count, age_weeks, production_type")
        .eq("farm_id", farm.id),
      supabase
        .from("egg_records")
        .select("record_date, eggs_collected, eggs_sold, price_per_egg")
        .eq("farm_id", farm.id)
        .gte("record_date", since30)
        .order("record_date", { ascending: true }),
      supabase
        .from("flock_events")
        .select("event_type, event_date, cost, note")
        .eq("farm_id", farm.id)
        .gte("event_date", since30)
        .order("event_date", { ascending: true }),
    ]);

    const cs = coops ?? [];
    const er = eggs ?? [];
    const ev = events ?? [];

    const signals: Signal[] = [];

    // 1. Mortality spike — last 7d mortality events vs the previous 7d.
    const mort = ev.filter((e) => e.event_type === "Mortality");
    const last7 = mort.filter((e) => e.event_date >= iso(new Date(today.getTime() - 7 * day))).length;
    const prev7 = mort.filter(
      (e) =>
        e.event_date >= iso(new Date(today.getTime() - 14 * day)) &&
        e.event_date < iso(new Date(today.getTime() - 7 * day)),
    ).length;
    if (last7 > 0 && last7 >= Math.max(2, prev7 * 2)) {
      signals.push({
        key: "mortality_spike",
        severity: "critical",
        fact: `Mortality events logged in the last 7 days: ${last7} (previous 7 days: ${prev7}). This is a sharp rise.`,
        suggestedRoute: "/vetline",
      });
    }

    // 2. Egg production drop — last 3 days avg vs prior period.
    if (er.length >= 6) {
      const recent = er.slice(-3).map((e) => e.eggs_collected || 0);
      const baseline = er.slice(0, -3).map((e) => e.eggs_collected || 0);
      const rAvg = avg(recent);
      const bAvg = avg(baseline);
      if (bAvg > 0 && rAvg < bAvg * 0.85) {
        const dropPct = Math.round((1 - rAvg / bAvg) * 100);
        signals.push({
          key: "egg_drop",
          severity: "watch",
          fact: `Egg collection has dropped ~${dropPct}% (recent avg ${rAvg.toFixed(0)}/day vs baseline ${bAvg.toFixed(0)}/day).`,
          suggestedRoute: "/egg-ledger",
        });
      } else if (bAvg > 0 && rAvg > bAvg * 1.1) {
        signals.push({
          key: "egg_up",
          severity: "good",
          fact: `Egg collection is up (recent avg ${rAvg.toFixed(0)}/day vs baseline ${bAvg.toFixed(0)}/day). Production is trending well.`,
          suggestedRoute: "/egg-ledger",
        });
      }
    }

    // 3. Predictive lay onset — layer flocks approaching point of lay (16–18 wks).
    const approaching = cs.filter(
      (c) =>
        (c.production_type ?? "layer") === "layer" &&
        c.count > 0 &&
        c.age_weeks >= 16 &&
        c.age_weeks < 18,
    );
    for (const c of approaching) {
      const weeksToLay = 18 - c.age_weeks;
      signals.push({
        key: `lay_onset_${c.id}`,
        severity: "watch",
        fact: `Flock "${c.name}" (${c.count} birds, ${c.age_weeks} weeks) reaches point of lay in about ${weeksToLay} week(s). Pre-stock layer feed and prepare nesting.`,
        suggestedRoute: "/rationpro",
      });
    }

    // 4. Economic signal — month expenses vs egg revenue.
    const expenses = ev.reduce((s, e) => s + (e.cost || 0), 0);
    const eggRevenue = er.reduce((s, e) => s + (e.eggs_sold || 0) * (e.price_per_egg || 0), 0);
    if (expenses > 0 && eggRevenue > 0 && expenses > eggRevenue) {
      signals.push({
        key: "economics",
        severity: "watch",
        fact: `Over the last 30 days expenses (${expenses.toFixed(0)}) exceeded egg revenue (${eggRevenue.toFixed(0)}). Margins are tight.`,
        suggestedRoute: "/reports",
      });
    }

    // No data to analyse yet.
    if (cs.length === 0) {
      return {
        cards: [
          {
            severity: "watch",
            title: "Set up your first flock",
            body: "Add a flock so Copilot can start watching mortality, production and costs for you.",
            actionLabel: "Add flock",
            actionRoute: "/coops",
          },
        ],
        generatedAt: new Date().toISOString(),
      };
    }

    // Nothing notable — reassuring "all clear" card.
    if (signals.length === 0) {
      const totalBirds = cs.reduce((s, c) => s + (c.count || 0), 0);
      return {
        cards: [
          {
            severity: "good",
            title: "All flocks look healthy",
            body: `No anomalies detected across ${cs.length} flock(s) and ${totalBirds.toLocaleString()} birds. Mortality, production and costs are within normal range.`,
            actionLabel: "View records",
            actionRoute: "/coops",
          },
        ],
        generatedAt: new Date().toISOString(),
      };
    }

    // Enrich signals into farmer-friendly cards via Lovable AI.
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      // Graceful fallback without AI.
      return {
        cards: signals.slice(0, 5).map((s) => ({
          severity: s.severity,
          title: s.fact.split(".")[0].slice(0, 70),
          body: s.fact,
          actionLabel: "Take a look",
          actionRoute: s.suggestedRoute,
        })),
        generatedAt: new Date().toISOString(),
      };
    }

    try {
      const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
      const { generateText, Output } = await import("ai");
      const { z } = await import("zod");

      const gateway = createLovableAiGatewayProvider(key);

      const schema = z.object({
        cards: z
          .array(
            z.object({
              key: z.string(),
              title: z.string(),
              body: z.string(),
              actionLabel: z.string(),
            }),
          )
          .max(6),
      });

      const factsList = signals
        .map((s, i) => `${i + 1}. [key:${s.key}] [severity:${s.severity}] ${s.fact}`)
        .join("\n");

      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system: `You are Flock Copilot, a proactive poultry farm advisor. You are given pre-detected signals about ONE farm.
For each signal, write one short insight card for the farmer.
- title: under 8 words, plain and specific.
- body: 1-2 short sentences. Explain what it means and the single most useful next step. Low-cost, practical.
- actionLabel: 2-4 words for a button (e.g. "Ask VetLine", "Log egg count", "Plan feed").
- Keep the exact "key" from each signal unchanged so it can be matched.
Do not invent signals beyond those given. Do not add medical dosages.`,
        prompt: `Farm: ${farm.name}\nDetected signals:\n${factsList}`,
        output: Output.object({ schema }),
      });

      const byKey = new Map(signals.map((s) => [s.key, s]));
      const cards: CopilotCard[] = (output.cards ?? [])
        .map((c) => {
          const sig = byKey.get(c.key);
          if (!sig) return null;
          return {
            severity: sig.severity,
            title: c.title,
            body: c.body,
            actionLabel: c.actionLabel,
            actionRoute: sig.suggestedRoute,
          } satisfies CopilotCard;
        })
        .filter((c): c is CopilotCard => c !== null);

      if (cards.length === 0) throw new Error("empty");
      // Surface critical first.
      const order = { critical: 0, watch: 1, good: 2 };
      cards.sort((a, b) => order[a.severity] - order[b.severity]);
      return { cards, generatedAt: new Date().toISOString() };
    } catch {
      return {
        cards: signals.slice(0, 5).map((s) => ({
          severity: s.severity,
          title: s.fact.split(".")[0].slice(0, 70),
          body: s.fact,
          actionLabel: "Take a look",
          actionRoute: s.suggestedRoute,
        })),
        generatedAt: new Date().toISOString(),
      };
    }
  });
