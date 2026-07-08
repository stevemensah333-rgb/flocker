import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

// ── Speech → Text ────────────────────────────────────────────────────────────
const TranscribeSchema = z.object({
  audioBase64: z.string().min(1).max(20_000_000),
  mimeType: z.string().min(1).max(120).default("audio/webm"),
});

function b64ToBytes(b64: string): Uint8Array {
  const raw = b64.includes(",") ? b64.slice(b64.indexOf(",") + 1) : b64;
  const bin = atob(raw);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export const transcribeAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TranscribeSchema.parse(input))
  .handler(async ({ data }): Promise<{ text: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Voice AI is not configured. Missing API key.");

    const ext = data.mimeType.includes("mp4")
      ? "mp4"
      : data.mimeType.includes("mpeg") || data.mimeType.includes("mp3")
        ? "mp3"
        : data.mimeType.includes("wav")
          ? "wav"
          : "webm";

    const form = new FormData();
    form.append("model", "openai/gpt-4o-mini-transcribe");
    form.append(
      "file",
      new Blob([b64ToBytes(data.audioBase64)], { type: data.mimeType }),
      `audio.${ext}`,
    );

    const res = await fetch(`${GATEWAY}/audio/transcriptions`, {
      method: "POST",
      headers: { "Lovable-API-Key": key },
      body: form,
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Voice service is busy. Try again shortly.");
      if (res.status === 402) throw new Error("AI credits are exhausted.");
      throw new Error(`Could not transcribe audio. ${msg.slice(0, 140)}`);
    }

    const json = (await res.json()) as { text?: string };
    return { text: (json.text ?? "").trim() };
  });

// ── Text → Speech ────────────────────────────────────────────────────────────
const SpeakSchema = z.object({
  text: z.string().min(1).max(4000),
  voice: z.string().max(40).default("alloy"),
});

export const speakVetLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SpeakSchema.parse(input))
  .handler(async ({ data }): Promise<{ audioBase64: string; mimeType: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Voice AI is not configured. Missing API key.");

    const res = await fetch(`${GATEWAY}/audio/speech`, {
      method: "POST",
      headers: {
        "Lovable-API-Key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        input: data.text,
        voice: data.voice,
        response_format: "mp3",
      }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Voice service is busy. Try again shortly.");
      if (res.status === 402) throw new Error("AI credits are exhausted.");
      throw new Error(`Could not generate speech. ${msg.slice(0, 140)}`);
    }

    const buf = new Uint8Array(await res.arrayBuffer());
    return { audioBase64: bytesToB64(buf), mimeType: "audio/mpeg" };
  });
