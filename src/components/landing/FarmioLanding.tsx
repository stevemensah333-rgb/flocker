import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Apple, Monitor, ArrowUpRight, Wheat, Egg, HeartPulse, Download, WifiOff, Star } from "lucide-react";
import { DOWNLOADS, detectOS, type DesktopOS } from "@/lib/flock/downloads";
import { recordDownload, submitFeedback } from "@/lib/flock/tracking";
import RationProWidget from "@/components/ration/RationProWidget";
import Ticker from "@/components/landing/Ticker";

import heroFarm from "@/assets/flock/hero-farm.jpg";
import cardFeed from "@/assets/flock/card-feed.jpg";
import cardEggs from "@/assets/flock/card-eggs.jpg";
import cardHealth from "@/assets/flock/card-health.jpg";

const DISPLAY = '"Sora", system-ui, sans-serif';

/* ---------- palette (Farmio-inspired, Flocker original) ---------- */
const C = {
  bg: "#0D130F",
  surface: "#16201A",
  surface2: "#1D2A22",
  lime: "#C6F24E",
  cream: "#F2F0E7",
};

/* ---------- light-green section palette (alternating) ---------- */
const L = {
  bg: "#E9F5EC",
  surface: "#FFFFFF",
  ink: "#0E1A12",
  muted: "#41544799",
  muted2: "#465C4E",
  accent: "#15803D",
  border: "#C7E7D1",
};

/* ---------- scroll reveal ---------- */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function FarmioLanding() {
  return (
    <div style={{ background: C.bg, color: C.cream, fontFamily: DISPLAY }} className="min-h-screen overflow-x-hidden">
      <PillNav />
      <Hero />
      <StatBand />
      <Solutions />
      <HowItWorks />
      <DemoSection />
      <DownloadSection />
      <Testimonials />
      <FeedbackSection />
      <Footer />
    </div>
  );
}

/* ============================ NAV ============================ */
function PillNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const links = [
    { label: "Solutions", href: "#solutions" },
    { label: "How it works", href: "#how" },
    { label: "Demo", href: "#demo" },
    { label: "Reviews", href: "#reviews" },
  ];
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <nav
        className="flex w-full max-w-5xl items-center justify-between rounded-full px-3 py-2.5 pl-5 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(242,240,231,0.97)" : "rgba(242,240,231,0.9)",
          boxShadow: scrolled ? "0 12px 40px -12px rgba(0,0,0,0.5)" : "0 6px 24px -12px rgba(0,0,0,0.3)",
          backdropFilter: "blur(10px)",
        }}
      >
        <a href="#top" className="flex items-center gap-2" aria-label="Flocker home">
          <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: C.lime }}>
            <Egg className="h-4 w-4" style={{ color: C.bg }} />
          </span>
          <span className="text-lg font-bold" style={{ color: C.bg }}>Flocker</span>
        </a>
        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-neutral-700 transition-colors hover:text-neutral-950">
              {l.label}
            </a>
          ))}
        </div>
        <a
          href="#download"
          className="group inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5"
          style={{ background: C.lime, color: C.bg }}
        >
          Download <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </nav>
    </header>
  );
}

/* ============================ HERO ============================ */
function Hero() {
  return (
    <section id="top" className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden">
      <img
        src={heroFarm}
        alt="Free-range hens on a Ghanaian poultry farm at golden hour"
        width={1920}
        height={1280}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(13,19,15,0.55) 0%, rgba(13,19,15,0.25) 40%, rgba(13,19,15,0.92) 100%)" }} />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 pt-32">
        <Reveal>
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-widest"
            style={{ borderColor: "rgba(242,240,231,0.25)", background: "rgba(13,19,15,0.35)", color: C.cream }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.lime }} /> The Poultry Farm OS
          </span>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl" style={{ color: C.cream }}>
            Smart software for<br />every bird you raise.
          </h1>
        </Reveal>

        <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <Reveal delay={160} className="max-w-sm">
            <div
              className="rounded-2xl border p-4"
              style={{ borderColor: "rgba(242,240,231,0.18)", background: "rgba(13,19,15,0.45)", backdropFilter: "blur(6px)" }}
            >
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: C.lime }}>
                <WifiOff className="h-4 w-4" /> Works fully offline
              </div>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(242,240,231,0.75)" }}>
                Formulate feed and keep records in the coop or the field — no signal needed.
              </p>
            </div>
          </Reveal>

          <Reveal delay={240} className="max-w-md md:text-right">
            <p className="text-base leading-relaxed" style={{ color: "rgba(242,240,231,0.8)" }}>
              Flocker turns feed formulation, egg tracking and flock health into one calm desktop app — built for African poultry farms.
            </p>
            <div className="mt-6 md:flex md:justify-end">
              <DownloadButtons />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ============================ STAT BAND ============================ */
function StatBand() {
  const stats = [
    { v: "5T", l: "Max feed batch" },
    { v: "10+", l: "Growth stages" },
    { v: "100%", l: "Offline capable" },
    { v: "Free", l: "Forever, no login" },
  ];
  return (
    <section style={{ background: L.bg }}>
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px md:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.l} delay={i * 80} className="px-6 py-10 text-center md:text-left">
            <div className="text-4xl font-semibold md:text-5xl" style={{ color: L.accent }}>{s.v}</div>
            <div className="mt-2 text-sm" style={{ color: L.muted2 }}>{s.l}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ============================ SOLUTIONS ============================ */
function Solutions() {
  const cards = [
    { img: cardFeed, tag: "RationPro", Icon: Wheat, title: "Precision feed formulation", body: "Least-cost rations for every stage, breed and target — batches up to 5 tonnes." },
    { img: cardEggs, tag: "Egg ledger", Icon: Egg, title: "Egg & flock records", body: "Log harvests by crate or by egg, track lay rate and keep your whole ledger local." },
    { img: cardHealth, tag: "Flock health", Icon: HeartPulse, title: "Health & alerts", body: "Daily health scores, mortality alerts and reminders that surface problems early." },
  ];
  return (
    <section id="solutions" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: C.lime }}>Our solutions</p>
          <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
            One app, the complete poultry toolkit.
          </h2>
        </Reveal>
      </div>

      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {cards.map((c, i) => (
          <Reveal key={c.title} delay={i * 120}>
            <article
              className="group relative flex h-[440px] flex-col justify-end overflow-hidden rounded-3xl p-6"
              style={{ background: C.surface }}
            >
              <img
                src={c.img}
                alt={c.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(13,19,15,0.05) 30%, rgba(13,19,15,0.92) 100%)" }} />
              <div className="relative z-10">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: C.lime, color: C.bg }}
                >
                  <c.Icon className="h-3.5 w-3.5" /> {c.tag}
                </span>
                <h3 className="mt-4 text-2xl font-semibold" style={{ color: C.cream }}>{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(242,240,231,0.78)" }}>{c.body}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ============================ HOW IT WORKS ============================ */
function HowItWorks() {
  const steps = [
    { n: "01", title: "Download for your laptop", body: "Grab the free app for macOS or Windows and unzip — no account required." },
    { n: "02", title: "Add your flock", body: "Enter your coops, bird counts and stages. Everything stays on your machine." },
    { n: "03", title: "Formulate & track", body: "Build least-cost feed, log eggs and health, and let Flocker flag what matters." },
  ];
  return (
    <section id="how" className="py-24 md:py-32" style={{ background: L.bg }}>
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: L.accent }}>How it works</p>
          <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl" style={{ color: L.ink }}>
            Up and running in three steps.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 120}>
              <div className="relative rounded-2xl border p-7" style={{ borderColor: L.border, background: L.surface }}>
                <span className="text-5xl font-semibold" style={{ color: "rgba(21,128,61,0.28)" }}>{s.n}</span>
                <h3 className="mt-4 text-xl font-semibold" style={{ color: L.ink }}>{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: L.muted2 }}>{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================ DEMO ============================ */
function DemoSection() {
  return (
    <section id="demo" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <Reveal className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: C.lime }}>Live demo</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Formulate least-cost feed in seconds.</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm" style={{ color: "rgba(242,240,231,0.7)" }}>
          Edit any kg value below — RationPro recalculates nutrition and cost instantly.
        </p>
      </Reveal>
      <Reveal delay={120}>
        <div className="mx-auto mt-10 overflow-hidden rounded-3xl border bg-white shadow-2xl" style={{ borderColor: "rgba(242,240,231,0.12)" }}>
          <RationProWidget />
          <Ticker />
        </div>
      </Reveal>
    </section>
  );
}

/* ============================ DOWNLOAD ============================ */
function DownloadButtons({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  const [os, setOs] = useState<DesktopOS>("mac");
  useEffect(() => setOs(detectOS()), []);
  const otherOs: DesktopOS = os === "mac" ? "windows" : "mac";
  const meta: Record<DesktopOS, { label: string; href: string; Icon: typeof Apple }> = {
    mac: { label: "Download for Mac", href: DOWNLOADS.mac, Icon: Apple },
    windows: { label: "Download for Windows", href: DOWNLOADS.windows, Icon: Monitor },
  };
  const P = meta[os];
  const O = meta[otherOs];
  const base = compact ? "px-5 py-2.5 text-sm" : "px-6 py-3 text-sm";
  const primary = light
    ? { background: L.accent, color: "#FFFFFF" }
    : { background: C.lime, color: C.bg };
  const secondary = light
    ? { borderColor: L.border, color: L.ink }
    : { borderColor: "rgba(242,240,231,0.3)", color: C.cream };
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <a
        href={P.href}
        download
        onClick={() => recordDownload(os)}
        aria-label={P.label}
        className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-transform hover:-translate-y-0.5 ${base}`}
        style={primary}
      >
        <P.Icon className="h-4 w-4" /> {P.label}
      </a>
      <a
        href={O.href}
        download
        onClick={() => recordDownload(otherOs)}
        aria-label={O.label}
        className={`inline-flex items-center justify-center gap-2 rounded-full border font-semibold transition-colors ${base}`}
        style={secondary}
      >
        <O.Icon className="h-4 w-4" /> {O.label}
      </a>
    </div>
  );
}

function DownloadSection() {
  const steps = [
    "Download the zip for your laptop and unzip it.",
    "Open the Flocker app inside the unzipped folder.",
    "On first launch, allow it to open (macOS: right-click → Open).",
    "Start logging records and formulating feed — no internet needed.",
  ];
  return (
    <section id="download" className="relative overflow-hidden py-24 md:py-32" style={{ background: L.bg }}>
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: "rgba(21,128,61,0.12)" }} />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: L.accent, color: "#FFFFFF" }}>
            <Download className="h-3.5 w-3.5" /> Get the app
          </span>
          <h2 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl" style={{ color: L.ink }}>Download Flocker for your laptop.</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm" style={{ color: L.muted2 }}>
            A desktop app that runs fully offline — feed formulation and farm records stay on your machine, ready wherever you are.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <div className="mt-8 flex justify-center"><DownloadButtons light /></div>
          <p className="mt-4 text-xs" style={{ color: L.muted2 }}>Free · Works offline · macOS &amp; Windows</p>
        </Reveal>
      </div>
      <div className="relative mx-auto mt-12 grid max-w-3xl gap-4 px-6 sm:grid-cols-2">
        {steps.map((s, i) => (
          <Reveal key={i} delay={i * 80}>
            <div className="flex gap-3 rounded-xl border p-4 text-left" style={{ borderColor: L.border, background: L.surface }}>
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold" style={{ background: L.accent, color: "#FFFFFF" }}>{i + 1}</span>
              <span className="text-sm" style={{ color: L.muted2 }}>{s}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ============================ TESTIMONIALS ============================ */
function Testimonials() {
  const items = [
    { q: "Flocker cut my feed bill and I finally know my lay rate every morning. It runs even when the network is down.", name: "Kwame Mensah", role: "Layer farm · Ashanti" },
    { q: "Logging eggs by crate is so much faster. My records are finally organised in one place.", name: "Ama Owusu", role: "Poultry farm · Greater Accra" },
    { q: "The feed formulation alone is worth it. No more guessing rations for my broilers.", name: "Yaw Boateng", role: "Broiler farm · Brong-Ahafo" },
  ];
  return (
    <section id="reviews" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: C.lime }}>Reviews</p>
        <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">What farmers say about Flocker.</h2>
      </Reveal>
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {items.map((t, i) => (
          <Reveal key={t.name} delay={i * 120}>
            <figure className="flex h-full flex-col rounded-2xl border p-7" style={{ borderColor: "rgba(242,240,231,0.1)", background: C.surface }}>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-4 w-4" style={{ color: C.lime, fill: C.lime }} />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-base leading-relaxed" style={{ color: "rgba(242,240,231,0.9)" }}>“{t.q}”</blockquote>
              <figcaption className="mt-6">
                <div className="font-semibold" style={{ color: C.cream }}>{t.name}</div>
                <div className="text-sm" style={{ color: "rgba(242,240,231,0.55)" }}>{t.role}</div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ============================ FEEDBACK ============================ */
function FeedbackSection() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || !message.trim()) return;
    setStatus("sending");
    try {
      await submitFeedback(rating, message.trim());
      setStatus("done");
      setRating(0);
      setMessage("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section id="feedback" className="py-24 md:py-28" style={{ background: L.bg }}>
      <div className="mx-auto max-w-lg px-6 text-center">
        {status === "done" ? (
          <Reveal>
            <h2 className="text-3xl font-semibold md:text-4xl" style={{ color: L.ink }}>Thanks for the feedback! 🐔</h2>
            <p className="mt-3 text-sm" style={{ color: L.muted2 }}>We read every note.</p>
          </Reveal>
        ) : (
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: L.accent }}>Your take</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl" style={{ color: L.ink }}>Tell us what you think.</h2>
            <form onSubmit={onSubmit} className="mt-8 space-y-4 text-left">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star className="h-8 w-8" style={{ color: (hover || rating) >= n ? L.accent : "rgba(14,26,18,0.18)", fill: (hover || rating) >= n ? L.accent : "transparent" }} />
                  </button>
                ))}
              </div>
              <textarea
                required
                rows={4}
                placeholder="What do you love? What's missing?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
                style={{ borderColor: L.border, background: L.surface, color: L.ink }}
              />
              {status === "error" && <p className="text-sm" style={{ color: "#B4442E" }}>Something went wrong. Try again.</p>}
              <button
                type="submit"
                disabled={status === "sending" || !rating || !message.trim()}
                className="w-full rounded-full py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                style={{ background: L.accent, color: "#FFFFFF" }}
              >
                {status === "sending" ? "Sending…" : "Send feedback"}
              </button>
            </form>
          </Reveal>
        )}
      </div>
    </section>
  );
}

/* ============================ FOOTER ============================ */
function Footer() {
  return (
    <footer className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-xs" style={{ color: "rgba(242,240,231,0.4)" }}>
      <span>© {new Date().getFullYear()} Flocker — built for African poultry farms.</span>
      <Link to="/admin" className="transition-colors hover:text-[color:var(--lime)]" style={{ color: "rgba(242,240,231,0.2)" }}>
        Admin
      </Link>
    </footer>
  );
}
