// ElevenLabs speech-to-text for WhatsApp voice notes (server-only).

export function isVoiceConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

/**
 * Transcribe an audio buffer (typically OGG/Opus from WhatsApp) using ElevenLabs
 * scribe_v2. Returns the transcribed text, or null on failure.
 */
export async function transcribeAudio(
  buffer: ArrayBuffer,
  mime: string,
): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  const ext = mime.includes("mpeg")
    ? "mp3"
    : mime.includes("wav")
      ? "wav"
      : mime.includes("mp4") || mime.includes("m4a")
        ? "m4a"
        : "ogg";

  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mime }), `voice.${ext}`);
  form.append("model_id", "scribe_v2");

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
    });
    if (!res.ok) {
      console.error(`[whatsapp] STT failed ${res.status}: ${await res.text()}`);
      return null;
    }
    const data = (await res.json()) as { text?: string };
    return data.text?.trim() || null;
  } catch (err) {
    console.error("[whatsapp] STT error", err);
    return null;
  }
}
