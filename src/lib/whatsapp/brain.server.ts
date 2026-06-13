// WhatsApp "farm brain" — understands farmer messages, records events, answers
// queries, and gives advice. Server-only (uses Lovable AI + admin DB client).
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type DB = SupabaseClient<Database>;

export type FarmCtx = { ownerId: string; farmId: string; phone: string };

// Event types we record from chat. The DB column is free text.
const EXPENSE_TYPES = new Set([
  "Feed purchase",
  "Vaccination",
  "Medication",
  "Deworming",
  "Vitamins / supplements",
  "Cleaning / disinfection",
  "Other expense",
]);

const ExtractedEvent = z.object({
  kind: z.enum(["mortality", "feed_purchase", "sale", "vaccination", "medication", "other"]),
  count: z.number().nullable(),
  amount: z.number().nullable(),
  note: z.string().nullable(),
});

const Extraction = z.object({
  intent: z.enum(["record", "query", "advice"]),
  events: z.array(ExtractedEvent),
});

function gateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  return import("@/lib/ai-gateway.server").then((m) => m.createLovableAiGatewayProvider(key));
}

const SYSTEM_EXTRACT = `You are the parser for a poultry farm WhatsApp assistant.
Classify the farmer's message and extract any farm events it reports.

intent:
- "record": the message reports something that happened (deaths, a purchase, a sale, a vaccination, medication).
- "query": the message asks about their own farm data (bird count, expenses, mortality, profit).
- "advice": the message asks a general poultry question or for guidance.

For each reported event set:
- kind: one of mortality, feed_purchase, sale, vaccination, medication, other
- count: number of birds/bags involved if stated, else null
- amount: money involved in the local currency if stated (total amount), else null
- note: a short human description of the event

A single message may contain several events (e.g. "3 birds died, I bought 5 bags of feed and vaccinated batch 2").
If the message is purely a question, return an empty events array.`;

const SYSTEM_ADVICE = `You are the PoultryOS WhatsApp Farm Assistant, a calm, practical poultry adviser
for small and medium farmers (often in Africa). Reply in short WhatsApp-friendly messages.
Be concrete and low-cost. For health/treatment advice, add a one-line note that this is guidance,
not a substitute for an in-person vet. Never invent drug dosages.`;

async function classify(text: string) {
  const gw = await gateway();
  const { generateText, Output } = await import("ai");
  const { output } = await generateText({
    model: gw("google/gemini-3-flash-preview"),
    system: SYSTEM_EXTRACT,
    prompt: text,
    output: Output.object({ schema: Extraction }),
  });
  return output;
}

async function advice(text: string) {
  const gw = await gateway();
  const { generateText } = await import("ai");
  const { text: reply } = await generateText({
    model: gw("google/gemini-3-flash-preview"),
    system: SYSTEM_ADVICE,
    prompt: text,
  });
  return reply;
}

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

async function totalBirds(supabase: DB, farmId: string) {
  const { data } = await supabase.from("coops").select("id, name, count").eq("farm_id", farmId);
  const total = (data ?? []).reduce((s, c) => s + (c.count || 0), 0);
  return { total, coops: data ?? [] };
}

async function applyMortality(supabase: DB, ctx: FarmCtx, count: number) {
  // Reduce from the coop with the most birds.
  const { coops } = await totalBirds(supabase, ctx.farmId);
  const target = [...coops].sort((a, b) => (b.count || 0) - (a.count || 0))[0];
  if (target) {
    const next = Math.max(0, (target.count || 0) - count);
    await supabase.from("coops").update({ count: next }).eq("id", target.id);
  }
}

async function recordEvents(
  supabase: DB,
  ctx: FarmCtx,
  events: z.infer<typeof ExtractedEvent>[],
): Promise<string[]> {
  const lines: string[] = [];
  for (const e of events) {
    let event_type = "Other";
    if (e.kind === "mortality") event_type = "Mortality";
    else if (e.kind === "feed_purchase") event_type = "Feed purchase";
    else if (e.kind === "sale") event_type = "Sale";
    else if (e.kind === "vaccination") event_type = "Vaccination";
    else if (e.kind === "medication") event_type = "Medication";

    const note =
      (e.note ?? "").trim() ||
      [e.count ? `${e.count}` : null, event_type].filter(Boolean).join(" ");

    await supabase.from("flock_events").insert({
      owner_id: ctx.ownerId,
      farm_id: ctx.farmId,
      event_type,
      event_date: today(),
      cost: e.amount ?? 0,
      note,
    });

    if (e.kind === "mortality" && e.count) {
      await applyMortality(supabase, ctx, e.count);
      lines.push(`☠️ ${e.count} mortality logged`);
    } else if (e.kind === "feed_purchase") {
      lines.push(`🌾 Feed purchase${e.amount ? ` (${e.amount})` : ""} logged`);
    } else if (e.kind === "sale") {
      lines.push(`💰 Sale${e.amount ? ` (${e.amount})` : ""} logged`);
    } else if (e.kind === "vaccination") {
      lines.push(`💉 Vaccination${e.count ? ` of ${e.count} birds` : ""} logged`);
    } else if (e.kind === "medication") {
      lines.push(`🧪 Medication logged`);
    } else {
      lines.push(`✅ ${note} logged`);
    }
  }
  return lines;
}

async function computeStats(supabase: DB, farmId: string, since: string) {
  const { total } = await totalBirds(supabase, farmId);

  const { data: eggs } = await supabase
    .from("egg_records")
    .select("eggs_collected, eggs_sold, price_per_egg, record_date")
    .eq("farm_id", farmId)
    .gte("record_date", since);
  const eggRevenue = (eggs ?? []).reduce(
    (s, r) => s + (r.eggs_sold || 0) * (r.price_per_egg || 0),
    0,
  );
  const eggsCollected = (eggs ?? []).reduce((s, r) => s + (r.eggs_collected || 0), 0);

  const { data: evs } = await supabase
    .from("flock_events")
    .select("event_type, cost, event_date")
    .eq("farm_id", farmId)
    .gte("event_date", since);
  let expenses = 0;
  let salesRevenue = 0;
  let mortality = 0;
  for (const e of evs ?? []) {
    if (e.event_type === "Sale") salesRevenue += e.cost || 0;
    else if (e.event_type === "Mortality") mortality += 0; // count tracked via note
    else if (EXPENSE_TYPES.has(e.event_type)) expenses += e.cost || 0;
    else expenses += e.cost || 0;
  }
  // Approximate mortality count from notes is unreliable; count Mortality rows.
  const mortalityRows = (evs ?? []).filter((e) => e.event_type === "Mortality").length;

  const revenue = eggRevenue + salesRevenue;
  return {
    birds: total,
    eggsCollected,
    revenue,
    expenses,
    profit: revenue - expenses,
    mortalityEvents: mortalityRows,
    mortality,
  };
}

async function answerQuery(supabase: DB, ctx: FarmCtx, text: string) {
  const month = await computeStats(supabase, ctx.farmId, monthStart());
  const facts = `Farm data (this month):
- Birds currently: ${month.birds}
- Eggs collected: ${month.eggsCollected}
- Revenue: ${month.revenue.toFixed(2)}
- Expenses: ${month.expenses.toFixed(2)}
- Estimated profit: ${month.profit.toFixed(2)}
- Mortality events logged: ${month.mortalityEvents}`;

  const gw = await gateway();
  const { generateText } = await import("ai");
  const { text: reply } = await generateText({
    model: gw("google/gemini-3-flash-preview"),
    system: `You answer a poultry farmer's question about THEIR farm using only the facts provided.
Be concise and WhatsApp-friendly. Use the local currency amounts as given (no symbol assumptions).
If the facts don't cover the question, say what you do know.`,
    prompt: `${facts}\n\nFarmer's question: ${text}`,
  });
  return reply;
}

/** Main entry: process an inbound text message and return a reply string. */
export async function handleMessage(
  supabase: DB,
  ctx: FarmCtx,
  text: string,
): Promise<{ reply: string; intent: string }> {
  try {
    const parsed = await classify(text);

    if (parsed.intent === "record" && parsed.events.length > 0) {
      const lines = await recordEvents(supabase, ctx, parsed.events);
      const reply =
        `Done! I recorded:\n${lines.join("\n")}\n\n` +
        `Type "summary" any time for today's overview.`;
      return { reply, intent: "record" };
    }

    if (parsed.intent === "query") {
      return { reply: await answerQuery(supabase, ctx, text), intent: "query" };
    }

    // advice (or record with no events extracted)
    if (parsed.events.length > 0) {
      const lines = await recordEvents(supabase, ctx, parsed.events);
      return { reply: `Done! I recorded:\n${lines.join("\n")}`, intent: "record" };
    }
    return { reply: await advice(text), intent: "advice" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("402")) {
      return { reply: "The assistant is temporarily unavailable (AI credits). Please try later.", intent: "error" };
    }
    if (msg.includes("429")) {
      return { reply: "I'm a bit busy right now — please send that again in a moment.", intent: "error" };
    }
    console.error("[whatsapp] brain error", err);
    return { reply: "Sorry, I couldn't process that. Please try rephrasing.", intent: "error" };
  }
}

/** Build the evening daily summary text for a farm. */
export async function buildDailySummary(supabase: DB, farmId: string): Promise<string> {
  const stats = await computeStats(supabase, farmId, today());
  const month = await computeStats(supabase, farmId, monthStart());

  // Upcoming vaccinations in next 7 days (events dated in the future).
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const { data: upcoming } = await supabase
    .from("flock_events")
    .select("event_type, event_date, note")
    .eq("farm_id", farmId)
    .gt("event_date", today())
    .lte("event_date", in7)
    .order("event_date");

  const tasks =
    (upcoming ?? []).length > 0
      ? (upcoming ?? [])
          .map((u) => `• ${u.event_date}: ${u.event_type}${u.note ? ` (${u.note})` : ""}`)
          .join("\n")
      : "• None scheduled";

  return (
    `🌙 *Daily Farm Summary*\n\n` +
    `🐔 Birds: ${stats.birds}\n` +
    `☠️ Mortality events today: ${stats.mortalityEvents}\n` +
    `🥚 Eggs collected today: ${stats.eggsCollected}\n` +
    `💵 Profit (this month): ${month.profit.toFixed(2)}\n\n` +
    `📅 *Upcoming (7 days)*\n${tasks}`
  );
}

export type { z };
