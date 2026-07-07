import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Stethoscope,
  Send,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  BookOpen,
  Microscope,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { askVetLine } from "@/lib/flock/vetline.functions";
import type { VetLineSource } from "@/lib/flock/vetline.functions";
import AppShell from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated/vetline")({
  head: () => ({
    meta: [
      { title: "VetLine — Poultry Health Assistant | Flocker" },
      { name: "description", content: "Ask VetLine, Flocker's AI poultry health assistant, about symptoms, diseases and treatments with cited veterinary sources." },
      { property: "og:title", content: "VetLine — Poultry Health Assistant | Flocker" },
      { property: "og:description", content: "Get AI-guided answers on poultry diseases, symptoms and treatments with veterinary sources via VetLine." },
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
  confidence?: "high" | "moderate" | "low";
  grounded?: boolean;
  sources?: VetLineSource[];
};

const QUICK = [
  "My hens have watery droppings and look sleepy",
  "Several birds are sneezing and have swollen faces",
  "Sudden drop in egg production this week",
  "Birds are pecking each other and losing feathers",
  "How do I set up basic biosecurity for my coop?",
];

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Hi, I'm VetLine 🩺 — describe what you're seeing in your flock (symptoms, how many birds, how long), and I'll help you triage. Pick a quick start below or type your own.",
};

function VetLine() {
  const ask = useServerFn(askVetLine);
  const [coops, setCoops] = useState<Coop[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

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
  }, [messages, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const flock = coops.find((c) => c.id === selected);
      const res = await ask({
        data: {
          messages: next
            .filter((m) => m.content !== WELCOME.content)
            .map((m) => ({ role: m.role, content: m.content })),
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="VetLine"
      subtitle="Evidence-grounded flock health triage — cited from research & vet references"
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

        {/* Conversation */}
        <div className="space-y-3 rounded-lg border bg-flock-fog p-4 shadow-flock">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : ""}`}
            >
              {m.role === "assistant" && (
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-flock-field/15 text-flock-field">
                  <Stethoscope className="h-3.5 w-3.5" />
                </span>
              )}
              <div
                className={`flex max-w-[82%] flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}
              >
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
          {loading && (
            <div className="flex gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-flock-field/15 text-flock-field">
                <Stethoscope className="h-3.5 w-3.5" />
              </span>
              <div className="rounded-2xl bg-flock-mist px-3.5 py-2.5">
                <span className="flex gap-1">
                  <Dot /> <Dot /> <Dot />
                </span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {error && (
          <p className="rounded-lg border border-flock-red/30 bg-flock-red/10 px-3 py-2 font-sans text-[13px] text-flock-red">
            {error}
          </p>
        )}

        {/* Quick prompts */}
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="flex items-center gap-1.5 rounded-full border border-flock-fog bg-flock-fog px-3 py-1.5 font-sans text-[12px] text-flock-soil transition hover:bg-flock-mist"
              >
                <Sparkles className="h-3 w-3 text-flock-harvest" />
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={2}
            placeholder="Describe the symptoms…"
            className="flex-1 resize-none rounded-lg border border-flock-fog bg-flock-fog px-3 py-2.5 font-sans text-[14px] text-flock-soil placeholder:text-flock-stone focus:outline-none focus:ring-2 focus:ring-flock-field/30"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-flock-field text-flock-cream transition hover:opacity-90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </AppShell>
  );
}

function Dot() {
  return <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-flock-stone" />;
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
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-sans text-[11px] font-medium ${meta.cls}`}
        >
          <ShieldCheck className="h-3 w-3" />
          {meta.label}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-flock-fog px-2 py-0.5 font-sans text-[11px] text-flock-stone">
          {grounded ? (
            <>
              <Microscope className="h-3 w-3" />
              Evidence-backed
            </>
          ) : (
            <>
              <BookOpen className="h-3 w-3" />
              General knowledge
            </>
          )}
        </span>
      </div>
      {sources.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg border border-flock-fog bg-flock-fog/60 p-2">
          <p className="px-1 font-sans text-[10px] font-semibold uppercase tracking-wide text-flock-stone">
            Sources
          </p>
          {sources.map((s) => (
            <a
              key={s.id}
              href={s.url || undefined}
              target="_blank"
              rel="noreferrer noopener"
              className="group flex items-start gap-1.5 rounded-md px-1 py-0.5 font-sans text-[12px] text-flock-soil transition hover:bg-flock-mist"
            >
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-flock-soil/10 text-[10px] font-semibold text-flock-soil">
                {s.id}
              </span>
              <span className="flex-1 leading-snug">
                {s.title}
                {s.origin === "academic" && (
                  <span className="ml-1 text-[10px] text-flock-field">· research</span>
                )}
              </span>
              {s.url && (
                <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-flock-stone opacity-0 transition group-hover:opacity-100" />
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
