import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Mic,
  Square,
  AlertTriangle,
  ImagePlus,
  X,
  Send,
  ExternalLink,
  BookOpen,
  Microscope,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { askVetLine } from "@/lib/flock/vetline.functions";
import type { VetLineSource } from "@/lib/flock/vetline.functions";
import { transcribeAudio, speakVetLine } from "@/lib/flock/voice.functions";
import AppShell from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated/vetline")({
  head: () => ({
    meta: [
      { title: "VetLine — Talk to a Poultry Health AI | Flocker" },
      { name: "description", content: "Speak to VetLine, Flocker's voice AI vet. Describe symptoms out loud, attach a photo, and hear evidence-grounded flock health guidance." },
      { property: "og:title", content: "VetLine — Talk to a Poultry Health AI | Flocker" },
      { property: "og:description", content: "Describe your flock's symptoms by voice and get spoken, evidence-grounded poultry health guidance from VetLine." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VetLine,
});

type Coop = {
  id: string;
  name: string;
  breed: string | null;
  count: number;
  age_weeks: number;
  production_type: string | null;
};

type Msg = {
  role: "user" | "assistant";
  content: string;
  image?: string;
  confidence?: "high" | "moderate" | "low";
  grounded?: boolean;
  sources?: VetLineSource[];
};

type Status = "idle" | "listening" | "thinking" | "speaking";

const STATUS_LABEL: Record<Status, string> = {
  idle: "Tap the orb and describe what you're seeing",
  listening: "Listening… tap again when you're done",
  thinking: "VetLine is thinking…",
  speaking: "VetLine is answering…",
};

function VetLine() {
  const ask = useServerFn(askVetLine);
  const transcribe = useServerFn(transcribeAudio);
  const speak = useServerFn(speakVetLine);

  const [coops, setCoops] = useState<Coop[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const messagesRef = useRef<Msg[]>([]);
  messagesRef.current = messages;

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: f } = await supabase
        .from("farms")
        .select("id")
        .eq("owner_id", u.user.id)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (!f) return;
      const { data: c } = await supabase
        .from("coops")
        .select("id, name, breed, count, age_weeks, production_type")
        .eq("farm_id", f.id)
        .order("created_at");
      setCoops(c ?? []);
    })();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  const animate = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i];
      const avg = sum / buf.length / 255;
      setLevel((prev) => prev * 0.6 + avg * 0.4);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopAnalyser = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setLevel(0);
  }, []);

  const blobToBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });

  async function startListening() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;
      animate();

      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => handleRecordingStop(mime);
      rec.start();
      mediaRef.current = rec;
      setStatus("listening");
    } catch {
      setError("Microphone access is required for voice. You can type instead.");
      setStatus("idle");
    }
  }

  function stopListening() {
    mediaRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    stopAnalyser();
  }

  async function handleRecordingStop(mime: string) {
    setStatus("thinking");
    try {
      const blob = new Blob(chunksRef.current, { type: mime });
      const dataUrl = await blobToBase64(blob);
      const { text: transcript } = await transcribe({
        data: { audioBase64: dataUrl, mimeType: mime },
      });
      if (!transcript) {
        setError("Didn't catch that — try again or type your question.");
        setStatus("idle");
        return;
      }
      await send(transcript, pendingImage, true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Voice failed. Try typing.");
      setStatus("idle");
    }
  }

  async function speakReply(reply: string) {
    try {
      const { audioBase64, mimeType } = await speak({
        data: { text: reply.slice(0, 3800) },
      });
      const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
      audioElRef.current = audio;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const srcNode = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      srcNode.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
      setStatus("speaking");
      animate();
      audio.onended = () => {
        stopAnalyser();
        ctx.close().catch(() => {});
        setStatus("idle");
      };
      await audio.play();
    } catch {
      // Speech is a bonus — if it fails, the text answer still stands.
      setStatus("idle");
    }
  }

  async function send(content: string, image: string | null, spoken: boolean) {
    const trimmed = content.trim();
    if (!trimmed) return;
    setError(null);
    const userMsg: Msg = { role: "user", content: trimmed, image: image ?? undefined };
    const next = [...messagesRef.current, userMsg];
    setMessages(next);
    setPendingImage(null);
    setText("");
    setStatus("thinking");
    try {
      const flock = coops.find((c) => c.id === selected);
      const res = await ask({
        data: {
          messages: next.map((m) => ({
            role: m.role,
            content: m.content,
            imageBase64: m.image,
          })),
          flock: flock
            ? {
                name: flock.name,
                breed: flock.breed ?? undefined,
                count: flock.count,
                age_weeks: flock.age_weeks,
                production_type: flock.production_type ?? undefined,
              }
            : undefined,
        },
      });
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.reply,
          confidence: res.confidence,
          grounded: res.grounded,
          sources: res.sources,
        },
      ]);
      if (spoken) await speakReply(res.reply);
      else setStatus("idle");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("idle");
    }
  }

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 12_000_000) {
      setError("Image is too large (max ~12MB).");
      return;
    }
    const r = new FileReader();
    r.onloadend = () => setPendingImage(r.result as string);
    r.readAsDataURL(file);
    e.target.value = "";
  }

  function orbTap() {
    if (status === "idle") startListening();
    else if (status === "listening") stopListening();
    else if (status === "speaking") {
      audioElRef.current?.pause();
      stopAnalyser();
      setStatus("idle");
    }
  }

  const busy = status === "thinking";
  const scale = 1 + level * 0.28 + (status === "listening" || status === "speaking" ? 0.04 : 0);

  return (
    <AppShell
      title="VetLine"
      subtitle="Talk to your AI vet — describe symptoms out loud and hear guidance back"
      actions={
        coops.length > 0 ? (
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-lg border border-flock-fog bg-flock-fog px-3 py-2 font-sans text-[13px] text-flock-soil"
          >
            <option value="">No specific coop</option>
            {coops.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.count})
              </option>
            ))}
          </select>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-flock-harvest/30 bg-flock-harvest/10 px-4 py-2.5">
          <p className="flex items-center gap-1.5 font-sans text-[12px] text-flock-soil">
            <AlertTriangle className="h-3.5 w-3.5 text-flock-harvest" />
            Guidance only — confirm serious cases with a local veterinarian.
          </p>
        </div>

        {/* Voice stage */}
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0b0b12] px-6 py-10 shadow-flock">
          <div className="flex flex-col items-center gap-6">
            <button
              type="button"
              onClick={orbTap}
              disabled={busy}
              aria-label={status === "listening" ? "Stop recording" : "Start speaking"}
              className="group relative flex h-56 w-56 items-center justify-center focus:outline-none disabled:cursor-wait"
            >
              {/* Ambient glow */}
              <span
                className="absolute inset-0 rounded-full blur-3xl transition-opacity duration-300"
                style={{
                  opacity: 0.55 + level * 0.4,
                  background:
                    "radial-gradient(circle at 40% 35%, #ff2d78, transparent 55%), radial-gradient(circle at 70% 60%, #ffb03a, transparent 55%), radial-gradient(circle at 65% 30%, #7b5cff, transparent 60%), radial-gradient(circle at 80% 55%, #2f6bff, transparent 60%)",
                }}
              />
              {/* Orb */}
              <span
                className="relative h-44 w-44 rounded-full shadow-[0_10px_60px_rgba(255,45,120,0.35)] transition-transform duration-100 ease-out"
                style={{
                  transform: `scale(${scale})`,
                  background:
                    "radial-gradient(circle at 45% 55%, #ffe7c2 0%, #ffb03a 18%, #ff2d78 42%, #d61f8f 60%, #7b5cff 78%, #2f6bff 100%)",
                }}
              >
                {/* Soft top highlight */}
                <span
                  className="absolute left-1/2 top-4 h-16 w-24 -translate-x-1/2 rounded-full opacity-60 blur-xl"
                  style={{ background: "radial-gradient(circle, rgba(255,255,255,0.9), transparent 70%)" }}
                />
                {busy && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white/90" />
                  </span>
                )}
              </span>
            </button>

            <p className="font-sans text-[13px] text-white/70">{STATUS_LABEL[status]}</p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={orbTap}
                disabled={busy}
                className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 font-sans text-[13px] font-medium text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-40"
              >
                {status === "listening" ? (
                  <>
                    <Square className="h-4 w-4" /> Stop
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" /> Speak
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 font-sans text-[13px] font-medium text-white backdrop-blur transition hover:bg-white/20"
              >
                <ImagePlus className="h-4 w-4" /> Photo
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onPickImage}
                className="hidden"
              />
            </div>

            {pendingImage && (
              <div className="relative">
                <img
                  src={pendingImage}
                  alt="Attached for VetLine"
                  className="h-20 w-20 rounded-lg object-cover ring-2 ring-white/20"
                />
                <button
                  type="button"
                  onClick={() => setPendingImage(null)}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-flock-red/30 bg-flock-red/10 px-3 py-2 font-sans text-[13px] text-flock-red">
            {error}
          </p>
        )}

        {/* Type fallback */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(text, pendingImage, false);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(text, pendingImage, false);
              }
            }}
            rows={2}
            placeholder="Prefer to type? Describe the symptoms…"
            className="flex-1 resize-none rounded-lg border border-flock-fog bg-flock-fog px-3 py-2.5 font-sans text-[14px] text-flock-soil placeholder:text-flock-stone focus:outline-none focus:ring-2 focus:ring-flock-field/30"
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-flock-field text-flock-cream transition hover:opacity-90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        {/* Transcript */}
        {messages.length > 0 && (
          <div className="space-y-3 rounded-lg border bg-flock-fog p-4 shadow-flock">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : ""}`}>
                <div
                  className={`flex max-w-[82%] flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}
                >
                  {m.image && (
                    <img
                      src={m.image}
                      alt="Farmer upload"
                      className="max-h-40 rounded-lg object-cover"
                    />
                  )}
                  <div
                    className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2 font-sans text-[14px] leading-relaxed ${
                      m.role === "user"
                        ? "bg-flock-soil text-flock-cream"
                        : "bg-flock-mist text-flock-soil"
                    }`}
                  >
                    {m.content}
                  </div>
                  {m.role === "assistant" && m.confidence && (
                    <Provenance
                      confidence={m.confidence}
                      grounded={m.grounded}
                      sources={m.sources ?? []}
                    />
                  )}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>
    </AppShell>
  );
}

const CONFIDENCE_META: Record<
  "high" | "moderate" | "low",
  { label: string; cls: string }
> = {
  high: { label: "High confidence", cls: "bg-flock-field/15 text-flock-field" },
  moderate: { label: "Moderate confidence", cls: "bg-flock-harvest/15 text-flock-harvest" },
  low: { label: "Low confidence", cls: "bg-flock-stone/20 text-flock-stone" },
};

function Provenance({
  confidence,
  grounded,
  sources,
}: {
  confidence: "high" | "moderate" | "low";
  grounded?: boolean;
  sources: VetLineSource[];
}) {
  const meta = CONFIDENCE_META[confidence];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-full px-2 py-0.5 font-sans text-[11px] font-medium ${meta.cls}`}
        >
          {meta.label}
        </span>
        <span className="rounded-full bg-flock-mist px-2 py-0.5 font-sans text-[11px] text-flock-stone">
          {grounded ? "Grounded in sources" : "General knowledge"}
        </span>
      </div>
      {sources.length > 0 && (
        <div className="flex flex-col gap-1">
          {sources.map((s) => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 font-sans text-[12px] text-flock-field hover:underline"
            >
              {s.origin === "academic" ? (
                <Microscope className="h-3 w-3 shrink-0" />
              ) : (
                <BookOpen className="h-3 w-3 shrink-0" />
              )}
              <span className="truncate">{s.title}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
