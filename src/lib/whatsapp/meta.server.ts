// Meta WhatsApp Business Cloud API helpers (server-only).
import crypto from "crypto";

const GRAPH = "https://graph.facebook.com/v21.0";

function token() {
  const t = process.env.META_WHATSAPP_TOKEN;
  if (!t) throw new Error("META_WHATSAPP_TOKEN is not configured");
  return t;
}

function phoneNumberId() {
  const id = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  if (!id) throw new Error("META_WHATSAPP_PHONE_NUMBER_ID is not configured");
  return id;
}

/** Verify the X-Hub-Signature-256 header against the raw request body. */
export function verifyMetaSignature(rawBody: string, signature: string | null): boolean {
  const appSecret = process.env.META_WHATSAPP_APP_SECRET;
  if (!appSecret) return false;
  if (!signature || !signature.startsWith("sha256=")) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Send a plain text WhatsApp message to a phone number (E.164, no +). */
export async function sendWhatsAppText(to: string, body: string): Promise<void> {
  const res = await fetch(`${GRAPH}/${phoneNumberId()}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: body.slice(0, 4096), preview_url: false },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error(`[whatsapp] send failed ${res.status}: ${t}`);
  }
}

/** Download a media file by its Meta media id. Returns the raw bytes + mime. */
export async function downloadMedia(
  mediaId: string,
): Promise<{ buffer: ArrayBuffer; mime: string } | null> {
  const metaRes = await fetch(`${GRAPH}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!metaRes.ok) {
    console.error(`[whatsapp] media meta failed ${metaRes.status}`);
    return null;
  }
  const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
  if (!meta.url) return null;
  const fileRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!fileRes.ok) {
    console.error(`[whatsapp] media download failed ${fileRes.status}`);
    return null;
  }
  return { buffer: await fileRes.arrayBuffer(), mime: meta.mime_type ?? "audio/ogg" };
}
