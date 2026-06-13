import { createFileRoute } from "@tanstack/react-router";
import { sendWhatsAppText } from "@/lib/whatsapp/meta.server";
import { buildDailySummary } from "@/lib/whatsapp/brain.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type DB = SupabaseClient<Database>;

export const Route = createFileRoute("/api/public/whatsapp/cron")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let type = "alerts";
        try {
          const body = (await request.json()) as { type?: string };
          if (body.type) type = body.type;
        } catch {
          /* empty body → alerts */
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        try {
          if (type === "summary") {
            await runDailySummary(supabaseAdmin);
          } else {
            await runAlerts(supabaseAdmin);
          }
        } catch (err) {
          console.error("[whatsapp] cron error", err);
          return new Response(JSON.stringify({ ok: false }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ ok: true, type }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

async function verifiedPhones(supabase: DB, farmId: string): Promise<string[]> {
  const { data } = await supabase
    .from("whatsapp_links")
    .select("phone")
    .eq("farm_id", farmId)
    .eq("verified", true);
  return (data ?? []).map((r) => r.phone);
}

// Avoid sending the same alert type more than once per day.
async function alreadySentToday(supabase: DB, farmId: string, intent: string): Promise<boolean> {
  const { data } = await supabase
    .from("whatsapp_messages")
    .select("id")
    .eq("farm_id", farmId)
    .eq("intent", intent)
    .gte("created_at", `${today()}T00:00:00Z`)
    .limit(1);
  return (data ?? []).length > 0;
}

async function sendAndLog(
  supabase: DB,
  ownerId: string,
  farmId: string,
  phones: string[],
  body: string,
  intent: string,
) {
  for (const phone of phones) {
    await sendWhatsAppText(phone, body);
    await supabase.from("whatsapp_messages").insert({
      owner_id: ownerId,
      farm_id: farmId,
      direction: "out",
      phone,
      body,
      intent,
    });
  }
}

async function runAlerts(supabase: DB) {
  const { data: farms } = await supabase
    .from("alert_settings")
    .select("*")
    .eq("alerts_enabled", true);

  for (const s of farms ?? []) {
    const phones = await verifiedPhones(supabase, s.farm_id);
    if (phones.length === 0) continue;

    // Mortality alert: mortality events logged today.
    const { data: mort } = await supabase
      .from("flock_events")
      .select("id")
      .eq("farm_id", s.farm_id)
      .eq("event_type", "Mortality")
      .eq("event_date", today());
    const mortCount = (mort ?? []).length;
    if (
      mortCount >= s.daily_mortality_threshold &&
      s.daily_mortality_threshold > 0 &&
      !(await alreadySentToday(supabase, s.farm_id, "alert_mortality"))
    ) {
      await sendAndLog(
        supabase,
        s.owner_id,
        s.farm_id,
        phones,
        `⚠️ *Mortality alert*\n${mortCount} mortality event(s) logged today — at or above your threshold of ${s.daily_mortality_threshold}. Check your flock for disease or stress.`,
        "alert_mortality",
      );
    }

    // Monthly budget alert.
    if (s.monthly_budget > 0) {
      const { data: evs } = await supabase
        .from("flock_events")
        .select("event_type, cost")
        .eq("farm_id", s.farm_id)
        .gte("event_date", monthStart());
      const spent = (evs ?? [])
        .filter((e) => e.event_type !== "Sale")
        .reduce((sum, e) => sum + (e.cost || 0), 0);
      if (
        spent > s.monthly_budget &&
        !(await alreadySentToday(supabase, s.farm_id, "alert_budget"))
      ) {
        await sendAndLog(
          supabase,
          s.owner_id,
          s.farm_id,
          phones,
          `💸 *Budget alert*\nThis month's costs (${spent.toFixed(2)}) have exceeded your budget of ${s.monthly_budget.toFixed(2)}.`,
          "alert_budget",
        );
      }
    }

    // Vaccination/task reminder: events dated tomorrow.
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const { data: up } = await supabase
      .from("flock_events")
      .select("event_type, note")
      .eq("farm_id", s.farm_id)
      .eq("event_date", tomorrow);
    if (
      (up ?? []).length > 0 &&
      !(await alreadySentToday(supabase, s.farm_id, "alert_task"))
    ) {
      const list = (up ?? [])
        .map((u) => `• ${u.event_type}${u.note ? ` (${u.note})` : ""}`)
        .join("\n");
      await sendAndLog(
        supabase,
        s.owner_id,
        s.farm_id,
        phones,
        `📅 *Reminder for tomorrow*\n${list}`,
        "alert_task",
      );
    }
  }
}

async function runDailySummary(supabase: DB) {
  const { data: farms } = await supabase
    .from("alert_settings")
    .select("owner_id, farm_id, daily_summary_enabled")
    .eq("daily_summary_enabled", true);

  for (const s of farms ?? []) {
    const phones = await verifiedPhones(supabase, s.farm_id);
    if (phones.length === 0) continue;
    const body = await buildDailySummary(supabase, s.farm_id);
    await sendAndLog(supabase, s.owner_id, s.farm_id, phones, body, "summary");
  }
}
