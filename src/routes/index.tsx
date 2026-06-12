import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FlaskConical, Egg, Bird, Pill } from "lucide-react";
import Ticker from "@/components/landing/Ticker";
import RationProWidget from "@/components/ration/RationProWidget";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flock — The Poultry Farm Operating System" },
      {
        name: "description",
        content:
          "Feed formulation, egg tracking, health alerts and your ledger — one app built for how African poultry farmers actually work.",
      },
      { property: "og:title", content: "Flock — The Poultry Farm Operating System" },
      {
        property: "og:description",
        content:
          "RationPro feed formulation, EggLedger, VetLine and more. Free for up to 500 birds.",
      },
    ],
  }),
  component: Landing,
});

function useCountUp(end: number, run: boolean, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.floor(end * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, run, duration]);
  return val;
}

const MODULES = [
  { icon: FlaskConical, name: "RationPro", line: "PTC feed formulation — kg inputs, instant nutrient analysis" },
  { icon: Egg, name: "EggLedger", line: "Log eggs + feed daily → profit per bird, per cycle" },
  { icon: Bird, name: "FlockCheck", line: "30-sec video → AI count + anomaly flags" },
  { icon: Pill, name: "VetLine", line: "Photo + symptoms → AI diagnosis + nearest agrovet" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-flock-cream">
      <TopNav />
      <Hero />
      <Ticker />
      <StatsBar />
      <ModuleGrid />
      <DemoSection />
      <FinalCta />
      <Ticker />
      <Footer />
    </div>
  );
}

function TopNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-flock-fog bg-flock-cream/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
        <Link to="/" className="flex items-center gap-2">
          <Bird className="h-5 w-5 text-flock-harvest" />
          <span className="font-display text-xl text-flock-soil">Flock</span>
        </Link>
        <nav className="ml-auto flex items-center gap-3">
          <Link
            to="/auth"
            className="font-sans text-[14px] text-flock-soil hover:text-flock-harvest"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            className="rounded-lg bg-flock-harvest px-4 py-2 font-sans text-[14px] font-semibold text-flock-soil"
          >
            Start free
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="bg-flock-soil">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
        <div className="animate-flock-enter">
          <span className="inline-block rounded-full border border-flock-harvest/40 px-3 py-1 font-sans text-[11px] font-semibold uppercase tracking-wide text-flock-harvest">
            Poultry Farm OS
          </span>
          <h1 className="mt-6 font-display text-[40px] leading-[1.05] text-flock-cream md:text-[68px]">
            Every flock.
            <br />
            One system.
            <br />
            Real <span className="italic text-flock-harvest">profit</span>.
          </h1>
          <p className="mt-6 max-w-md font-sans text-[16px] text-flock-cream/80">
            Feed formulation, egg tracking, health alerts, and your ledger — one
            app, built for how African poultry farmers actually work.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="rounded-lg bg-flock-harvest px-5 py-3 font-sans text-[15px] font-semibold text-flock-soil"
            >
              Start free
            </Link>
            <a
              href="#demo"
              className="rounded-lg border border-flock-cream/30 px-5 py-3 font-sans text-[15px] text-flock-cream"
            >
              See how it works →
            </a>
          </div>
          <p className="mt-5 font-sans text-[13px] text-flock-cream/60">
            Free for up to 500 birds · Works on WhatsApp · No credit card
          </p>
        </div>

        <div className="hidden items-center justify-center md:flex">
          <PhoneMock />
        </div>
      </div>
    </section>
  );
}

function PhoneMock() {
  return (
    <div className="w-[300px] rounded-[2rem] border-4 border-flock-ink bg-flock-cream p-3 shadow-flock">
      <div className="rounded-xl border bg-flock-mist p-2">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-sans text-[12px] font-semibold text-flock-soil">
            RationPro
          </span>
          <span className="font-mono text-[10px] text-flock-field">100.0 kg ✓</span>
        </div>
        {[
          ["Maize (yellow)", "55.0", "₵99"],
          ["Soya meal (44%)", "20.0", "₵70"],
          ["Wheat bran", "8.0", "₵10"],
          ["Fish meal (65%)", "5.0", "₵23"],
          ["Oyster shell", "8.5", "₵5"],
        ].map(([n, kg, c]) => (
          <div
            key={n}
            className="flex items-center justify-between border-b py-1 font-mono text-[11px]"
          >
            <span className="font-sans text-flock-ink">{n}</span>
            <span className="text-flock-stone">{kg}</span>
            <span className="text-flock-soil">{c}</span>
          </div>
        ))}
        <div className="mt-2 grid grid-cols-3 gap-1 text-center font-mono text-[10px]">
          <div>
            <div className="text-flock-stone">CP</div>
            <div className="text-flock-field">18.1%</div>
          </div>
          <div>
            <div className="text-flock-stone">ME</div>
            <div className="text-flock-field">2,710</div>
          </div>
          <div>
            <div className="text-flock-stone">Ca</div>
            <div className="text-flock-field">3.6%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && setRun(true),
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const farms = useCountUp(4200, run);
  const saved = useCountUp(340, run);
  const rate = useCountUp(88, run);
  return (
    <section ref={ref} className="border-b bg-flock-cream">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-12 text-center md:grid-cols-3">
        <Stat value={`${farms.toLocaleString()}+`} label="farms using Flock" />
        <Stat value={`₵${saved}`} label="avg. feed cost saved per month" />
        <Stat value={`${rate}%`} label="avg. laying rate on tracked flocks" />
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-mono text-[36px] font-bold text-flock-soil">{value}</div>
      <div className="mt-1 font-sans text-[14px] text-flock-stone">{label}</div>
    </div>
  );
}

function ModuleGrid() {
  return (
    <section className="bg-flock-soil">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-[32px] text-flock-cream">
          Five tools. One flock.
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {MODULES.map((m) => (
            <div
              key={m.name}
              className="rounded-lg border border-flock-cream/15 bg-flock-soil p-5"
            >
              <m.icon className="h-6 w-6 text-flock-harvest" />
              <div className="mt-3 font-sans text-[16px] font-semibold text-flock-cream">
                {m.name}
              </div>
              <p className="mt-1 font-sans text-[13px] text-flock-cream/70">
                {m.line}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DemoSection() {
  return (
    <section id="demo" className="bg-flock-cream">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-[32px] text-flock-soil">
          Try RationPro right now
        </h2>
        <p className="mt-2 max-w-xl font-sans text-[15px] text-flock-stone">
          Type kilograms, watch nutrients update live. This is the real tool — no
          sign-up needed to formulate a ration.
        </p>
        <div className="mt-8">
          <RationProWidget />
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-flock-harvest">
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="font-display text-[36px] text-flock-soil">
          Your flock. Your numbers. Your profit.
        </h2>
        <Link
          to="/auth"
          className="mt-6 inline-block rounded-lg bg-flock-soil px-6 py-3 font-sans text-[16px] font-semibold text-flock-cream"
        >
          Create your farm — it's free
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-flock-soil py-8 text-center">
      <span className="font-display text-lg text-flock-cream">Flock</span>
      <p className="mt-1 font-sans text-[12px] text-flock-cream/50">
        Poultry Farm OS · Built for West African farms
      </p>
    </footer>
  );
}
