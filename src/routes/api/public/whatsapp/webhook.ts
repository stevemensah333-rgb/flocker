import { createFileRoute } from "@tanstack/react-router";
import { verifyMetaSignature, sendWhatsAppText, downloadMedia } from "@/lib/whatsapp/meta.server";
import { transcribeAudio, isVoiceConfigured } from "@/lib/whatsapp/stt.server";
import { handleMessage, type FarmCtx } from "@/lib/whatsapp/brain.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type DB = SupabaseClient<Database>;

type WaMessage = {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  audio?: { id: string };
};

export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      // Meta webhook verification handshake.
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const verifyToken = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        if (
          mode === "subscribe" &&
          verifyToken &&
          verifyToken === process.env.META_WHATSAPP_VERIFY_TOKEN
        ) {
          return new Response(challenge ?? "", { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },

      POST: async ({ request }) => {
        const raw = await request.text();
        const signature = request.headers.get("x-hub-signature-256");

        if (!verifyMetaSignature(raw, signature)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: unknown;
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        // Always 200 quickly so Meta doesn't retry; process inline (short work).
        try {
          await processPayload(payload);
        } catch (err) {
          console.error("[whatsapp] webhook error", err);
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});

async function processPayload(payload: unknown) {
  const messages = extractMessages(payload);
  if (messages.length === 0) return;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  for (const msg of messages) {
    const phone = msg.from;

    // Resolve a verified link for this phone.
    const { data: link } = await supabaseAdmin
      .from("whatsapp_links")
      .select("owner_id, farm_id, verified")
      .eq("phone", phone)
      .eq("verified", true)
      .maybeSingle();

    // Extract incoming text (transcribe voice notes).
    let text = msg.text?.body?.trim() ?? "";
    let wasVoice = false;
    if (!text && msg.type === "audio" && msg.audio?.id) {
      wasVoice = true;
      if (!isVoiceConfigured()) {
        await sendWhatsAppText(
          phone,
          "Voice notes aren't enabled yet. Please type your message for now.",
        );
        continue;
      }
      const media = await downloadMedia(msg.audio.id);
      if (media) {
        text = (await transcribeAudio(media.buffer, media.mime))?.trim() ?? "";
      }
      if (!text) {
        await sendWhatsAppText(phone, "Sorry, I couldn't hear that clearly. Please try again.");
        continue;
      }
    }

    if (!link) {
      await handleUnlinked(supabaseAdmin, phone, text);
      continue;
    }

    if (!text) {
      await sendWhatsAppText(phone, "Send me a message — e.g. \"5 birds died today\".");
      continue;
    }

    const ctx: FarmCtx = { ownerId: link.owner_id, farmId: link.farm_id, phone };

    // Log inbound.
    await supabaseAdmin.from("whatsapp_messages").insert({
      owner_id: link.owner_id,
      farm_id: link.farm_id,
      direction: "in",
      phone,
      body: wasVoice ? `🎙️ ${text}` : text,
    });

    const lower = text.toLowerCase();
    let reply: string;
    let intent: string;
    if (lower === "summary" || lower === "today") {
      const { buildDailySummary } = await import("@/lib/whatsapp/brain.server");
      reply = await buildDailySummary(supabaseAdmin, link.farm_id);
      intent = "summary";
    } else {
      const r = await handleMessage(supabaseAdmin, ctx, text);
      reply = r.reply;
      intent = r.intent;
    }

    await sendWhatsAppText(phone, reply);
    await supabaseAdmin.from("whatsapp_messages").insert({
      owner_id: link.owner_id,
      farm_id: link.farm_id,
      direction: "out",
      phone,
      body: reply,
      intent,
    });
  }
}

// Handle a message from an unlinked phone: accept a 6-digit code to bind.
async function handleUnlinked(
  supabaseAdmin: Awaited<
    typeof import("@/integrations/supabase/client.server")
  >["supabaseAdmin"],
  phone: string,
  text: string,
) {
  const code = (text.match(/\b(\d{6})\b/)?.[1]) ?? null;
  if (!code) {
    await sendWhatsAppText(
      phone,
      "👋 Welcome to PoultryOS! To connect this number, open the app → Settings → WhatsApp Assistant, then send me the 6-digit code shown there.",
    );
    return;
  }

  const { data: row } = await supabaseAdmin
    .from("whatsapp_link_codes")
    .select("id, owner_id, farm_id, expires_at, consumed")
    .eq("code", code)
    .eq("consumed", false)
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (!row || new Date(row.expires_at) < new Date()) {
    await sendWhatsAppText(phone, "That code is invalid or expired. Generate a new one in the app.");
    return;
  }

  // Bind: upsert link, consume code.
  await supabaseAdmin
    .from("whatsapp_links")
    .upsert(
      { owner_id: row.owner_id, farm_id: row.farm_id, phone, verified: true },
      { onConflict: "phone" },
    );
  await supabaseAdmin.from("whatsapp_link_codes").update({ consumed: true }).eq("id", row.id);

  await sendWhatsAppText(
    phone,
    "✅ Connected! You can now chat with me. Try:\n• \"5 birds died today\"\n• \"How many birds do I have?\"\n• \"summary\" for today's overview\nYou can also send a voice note.",
  );
}

function extractMessages(payload: unknown): WaMessage[] {
  const out: WaMessage[] = [];
  const p = payload as {
    entry?: { changes?: { value?: { messages?: WaMessage[] } }[] }[];
  };
  for (const entry of p.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const m of change.value?.messages ?? []) {
        out.push(m);
      }
    }
  }
  return out;
}
