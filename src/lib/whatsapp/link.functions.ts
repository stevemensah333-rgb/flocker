// Server functions powering the WhatsApp Assistant settings UI.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

function gen6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Generate a fresh one-time link code for the farmer's first farm. */
export const generateLinkCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: farm } = await supabase
      .from("farms")
      .select("id")
      .eq("owner_id", userId)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (!farm) throw new Error("Set up your farm first.");

    // Invalidate old unused codes.
    await supabase
      .from("whatsapp_link_codes")
      .update({ consumed: true })
      .eq("owner_id", userId)
      .eq("consumed", false);

    const code = gen6();
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const { error } = await supabase.from("whatsapp_link_codes").insert({
      owner_id: userId,
      farm_id: farm.id,
      code,
      expires_at: expires,
    });
    if (error) throw new Error(error.message);
    return { code, expiresAt: expires };
  });

/** List the WhatsApp numbers currently linked to the farmer's account. */
export const listLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("whatsapp_links")
      .select("id, phone, verified, created_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    return { links: data ?? [] };
  });

/** Unlink a WhatsApp number. */
export const unlink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("whatsapp_links")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SettingsSchema = z.object({
  feed_stock_kg_threshold: z.number().min(0).max(1_000_000),
  daily_mortality_threshold: z.number().int().min(0).max(100000),
  monthly_budget: z.number().min(0).max(100_000_000),
  daily_summary_enabled: z.boolean(),
  alerts_enabled: z.boolean(),
});

/** Read the farm's alert settings, creating defaults if missing. */
export const getAlertSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: farm } = await supabase
      .from("farms")
      .select("id")
      .eq("owner_id", userId)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (!farm) return { settings: null };

    const { data: existing } = await supabase
      .from("alert_settings")
      .select("*")
      .eq("farm_id", farm.id)
      .maybeSingle();
    if (existing) return { settings: existing };

    const { data: created } = await supabase
      .from("alert_settings")
      .insert({ owner_id: userId, farm_id: farm.id })
      .select("*")
      .single();
    return { settings: created };
  });

/** Update the farm's alert settings. */
export const saveAlertSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SettingsSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: farm } = await supabase
      .from("farms")
      .select("id")
      .eq("owner_id", userId)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (!farm) throw new Error("Set up your farm first.");

    const { error } = await supabase
      .from("alert_settings")
      .upsert(
        { owner_id: userId, farm_id: farm.id, ...data },
        { onConflict: "farm_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
