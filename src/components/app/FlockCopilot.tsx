import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles,
  AlertTriangle,
  Eye,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { generateCopilotBrief, type CopilotCard } from "@/lib/flock/copilot.functions";

const SEV: Record<
  CopilotCard["severity"],
  { ring: string; chip: string; icon: typeof AlertTriangle; dot: string; label: string }
> = {
  critical: {
    ring: "border-flock-red/40",
    chip: "bg-flock-red/10 text-flock-red",
    icon: AlertTriangle,
    dot: "bg-flock-red",
    label: "Action needed",
  },
  watch: {
    ring: "border-flock-harvest/40",
    chip: "bg-flock-harvest/15 text-flock-clay",
    icon: Eye,
    dot: "bg-flock-harvest",
    label: "Keep an eye",
  },
  good: {
    ring: "border-flock-field/30",
    chip: "bg-flock-field/10 text-flock-field",
    icon: CheckCircle2,
    dot: "bg-flock-field",
    label: "On track",
  },
};

export default function FlockCopilot() {
  const brief = useServerFn(generateCopilotBrief);
  const [cards, setCards] = useState<CopilotCard[] | null>(null);
  const [loading, setLoading] = useState(true);

  async function run() {
    setLoading(true);
    try {
      const res = await brief();
      setCards(res.cards);
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-flock-soil text-flock-cream">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <h2 className="font-sans text-[15px] font-semibold text-flock-soil">
            Flock Copilot
          </h2>
          <span className="font-sans text-[12px] text-flock-stone">
            today&rsquo;s intelligence brief
          </span>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 rounded border bg-flock-fog px-2.5 py-1 font-sans text-[12px] text-flock-soil transition hover:bg-flock-mist disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading && !cards ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded border bg-flock-fog" />
          ))}
        </div>
      ) : cards && cards.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, i) => {
            const s = SEV[c.severity];
            const Icon = s.icon;
            return (
              <div
                key={i}
                className={`flex flex-col justify-between rounded border ${s.ring} bg-flock-paper p-4 transition-colors hover:border-flock-stone/40`}
              >
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-sans text-[11px] font-medium ${s.chip}`}
                    >
                      <Icon className="h-3 w-3" />
                      {s.label}
                    </span>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  </div>
                  <h3 className="font-sans text-[14px] font-semibold text-flock-soil">
                    {c.title}
                  </h3>
                  <p className="mt-1 font-sans text-[13px] leading-relaxed text-flock-stone">
                    {c.body}
                  </p>
                </div>
                <Link
                  to={c.actionRoute}
                  className="mt-3 inline-flex items-center gap-1 font-sans text-[12px] font-medium text-flock-field transition hover:gap-1.5"
                >
                  {c.actionLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded border bg-flock-paper px-4 py-6 text-center font-sans text-[13px] text-flock-stone">
          Copilot has nothing to flag right now.
        </div>
      )}
    </section>
  );
}
