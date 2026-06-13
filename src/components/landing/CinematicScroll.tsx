import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { FRAME_URLS, POSTER_URL } from "@/lib/flock/frames";
import RationProWidget from "@/components/ration/RationProWidget";
import Ticker from "@/components/landing/Ticker";

const FRAME_COUNT = FRAME_URLS.length;
const SERIF = '"Playfair Display", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** Smooth fade band: returns 0..1 opacity for a section active between [start,end] of scroll progress. */
function band(p: number, start: number, end: number) {
  const fade = (end - start) * 0.18;
  if (p < start - fade || p > end + fade) return 0;
  if (p < start) return (p - (start - fade)) / fade;
  if (p > end) return 1 - (p - end) / fade;
  return 1;
}

export default function CinematicScroll() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const targetFrame = useRef(0);
  const currentFrame = useRef(0);
  const rafRef = useRef<number>(0);

  const [loaded, setLoaded] = useState(false);
  const [progressPct, setProgressPct] = useState(0); // load progress 0..100
  const [scrollP, setScrollP] = useState(0); // scroll progress 0..1
  const reduced = usePrefersReducedMotion();

  // ---- Preload all frames ----
  useEffect(() => {
    if (reduced) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    let done = 0;
    const imgs: HTMLImageElement[] = [];
    FRAME_URLS.forEach((url, i) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = img.onerror = () => {
        done += 1;
        if (cancelled) return;
        setProgressPct(Math.round((done / FRAME_COUNT) * 100));
        if (done === FRAME_COUNT) setLoaded(true);
      };
      img.src = url;
      imgs[i] = img;
    });
    imagesRef.current = imgs;
    return () => {
      cancelled = true;
    };
  }, [reduced]);

  // ---- Draw a frame (object-fit: cover) ----
  const draw = useCallback((index: number) => {
    const canvas = canvasRef.current;
    const img = imagesRef.current[index];
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = cw / ch;
    let dw = cw;
    let dh = ch;
    let dx = 0;
    let dy = 0;
    if (ir > cr) {
      dh = ch;
      dw = ch * ir;
      dx = (cw - dw) / 2;
    } else {
      dw = cw;
      dh = cw / ir;
      dy = (ch - dh) / 2;
    }
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }, []);


  // ---- Resize ----
  useEffect(() => {
    if (reduced) return;
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const isMobile = window.innerWidth < 768;
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 2);
      const targetW = isMobile ? Math.min(window.innerWidth, 960) : window.innerWidth;
      canvas.width = Math.round(targetW * dpr);
      canvas.height = Math.round((targetW * (window.innerHeight / window.innerWidth)) * dpr);
      draw(Math.round(currentFrame.current));
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [reduced, loaded, draw]);

  // ---- Scroll → target frame ----
  useEffect(() => {
    if (reduced) return;
    const onScroll = () => {
      const el = scrollRef.current;
      if (!el) return;
      const total = el.scrollHeight - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
      setScrollP(p);
      targetFrame.current = p * (FRAME_COUNT - 1);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reduced]);

  // ---- rAF lerp loop ----
  useEffect(() => {
    if (reduced || !loaded) return;
    const tick = () => {
      currentFrame.current += (targetFrame.current - currentFrame.current) * 0.08;
      const idx = Math.round(currentFrame.current);
      draw(Math.max(0, Math.min(FRAME_COUNT - 1, idx)));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [reduced, loaded, draw]);

  // ----- Reduced-motion static poster -----
  if (reduced) {
    return (
      <div className="relative min-h-screen bg-[#1C1C1C] text-[#F5F0E8]" style={{ fontFamily: SANS }}>
        <TopNav />
        <img
          src={POSTER_URL}
          alt="Sunlit poultry house at golden hour"
          className="fixed inset-0 -z-10 h-full w-full object-cover opacity-70"
        />
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-10 px-6 py-28">
          <Overlay tag="THE FLOCK FARM OS" title="Every bird. Every batch. Every cedi." />
          <Overlay tag="PRECISION NUTRITION" title="The right feed, at the right stage." body="RationPro calculates exact feed formulations for your flock's age, breed, and growth targets — automatically. No guesswork. No waste." />
          <Overlay tag="FLOCK INTELLIGENCE" title="Know before problems show." body="Daily health scores, weight projections, and mortality alerts — all derived from your own farm data." />
          <CtaCard />
        </div>
      </div>
    );
  }

  return (
    <>
    <div ref={scrollRef} style={{ height: "600vh", fontFamily: SANS }} className="relative bg-[#1C1C1C] max-md:!h-[400vh]">
      {/* Loader */}
      {!loaded && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#1C1C1C]">
          <span style={{ fontFamily: SERIF }} className="text-4xl text-[#F5F0E8]">
            Flock
          </span>
          <div className="h-1 w-56 overflow-hidden rounded-full bg-[#F5F0E8]/15">
            <div
              className="h-full rounded-full bg-[#D4840A] transition-[width] duration-200 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs uppercase tracking-widest text-[#F5F0E8]/40">Loading {progressPct}%</span>
        </div>
      )}

      {/* Fixed canvas background */}
      <canvas ref={canvasRef} className="fixed inset-0 z-0 h-screen w-screen bg-[#1C1C1C]" aria-hidden="true" />
      {/* Ambient scrim for legibility */}
      <div className="pointer-events-none fixed inset-0 z-[1] bg-gradient-to-b from-[#1C1C1C]/40 via-transparent to-[#1C1C1C]/50" aria-hidden="true" />


      <TopNav />

      {/* ---- Synchronized text overlays ---- */}
      {/* A — 0%..18% center */}
      <FixedLayer opacity={band(scrollP, 0.0, 0.18)}>
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <Scrim />
          <p style={{ fontFamily: SANS }} className="relative text-xs font-semibold uppercase tracking-[0.3em] text-[#D4840A] md:text-sm">
            The Flock Farm OS
          </p>
          <h1 style={{ fontFamily: SERIF }} className="relative mt-4 max-w-4xl text-4xl leading-tight text-[#F5F0E8] md:text-7xl">
            Every bird. Every batch. Every cedi.
          </h1>
          <p className="relative mt-10 text-sm text-[#F5F0E8]/60">Scroll to enter ↓</p>
        </div>
      </FixedLayer>

      {/* B — 22%..48% left */}
      <FixedLayer opacity={band(scrollP, 0.22, 0.48)}>
        <div className="flex h-full items-center px-6 md:px-16">
          <div className="relative max-w-sm text-left">
            <Scrim />
            <Overlay tag="PRECISION NUTRITION" title="The right feed, at the right stage." body="RationPro calculates exact feed formulations for your flock's age, breed, and growth targets — automatically. No guesswork. No waste." />
          </div>
        </div>
      </FixedLayer>

      {/* C — 52%..78% right */}
      <FixedLayer opacity={band(scrollP, 0.52, 0.78)}>
        <div className="flex h-full items-center justify-end px-6 md:px-16">
          <div className="relative max-w-sm text-right">
            <Scrim />
            <Overlay align="right" tag="FLOCK INTELLIGENCE" title="Know before problems show." body="Daily health scores, weight projections, and mortality alerts — all derived from your own farm data. Flock learns your operation and flags anomalies before they cost you." />
          </div>
        </div>
      </FixedLayer>

      {/* D — 82%..100% center: keep last frames visible */}
      <FixedLayer opacity={band(scrollP, 0.82, 1.0)}>
        <div className="flex h-full items-center justify-center px-6 text-center">
          <Scrim />
          <p className="relative text-sm uppercase tracking-[0.3em] text-[#D4840A]">Keep scrolling ↓</p>
        </div>
      </FixedLayer>
    </div>

      {/* ---- Live demo (RationPro) + ticker, scrolls over the canvas ---- */}
      <section id="demo" className="relative z-20 bg-[#1C1C1C] px-4 py-20 md:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#D4840A]">Live demo</p>
          <h2 style={{ fontFamily: SERIF }} className="mt-3 text-3xl text-[#F5F0E8] md:text-5xl">
            Formulate least-cost feed in seconds.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-[#F5F0E8]/70">
            Edit any kg value below — RationPro recalculates nutrition and cost instantly.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-5xl overflow-hidden rounded-2xl border border-[#F5F0E8]/15 bg-white shadow-2xl">
          <RationProWidget />
          <Ticker />
        </div>
      </section>

      {/* ---- Final CTA ---- */}
      <section className="relative z-20 flex items-center justify-center bg-[#1C1C1C] px-6 pb-28">
        <CtaCard />
      </section>
    </>
  );
}

function FixedLayer({ opacity, children }: { opacity: number; children: React.ReactNode }) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-10 transition-opacity duration-300"
      style={{
        opacity,
        transform: `translateY(${(1 - opacity) * 24}px)`,
        visibility: opacity <= 0.01 ? "hidden" : "visible",
      }}
    >
      <div className={opacity > 0.05 ? "pointer-events-auto h-full" : "h-full"}>{children}</div>
    </div>
  );
}

function Scrim() {
  return (
    <div className="pointer-events-none absolute -inset-x-8 -inset-y-10 -z-[1] rounded-3xl bg-[#1C1C1C]/35 blur-2xl" aria-hidden="true" />
  );
}

function Overlay({
  tag,
  title,
  body,
  align = "left",
}: {
  tag: string;
  title: string;
  body?: string;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#D4840A]">{tag}</p>
      <h2 style={{ fontFamily: SERIF }} className="mt-3 text-2xl text-[#F5F0E8] md:text-4xl">
        {title}
      </h2>
      {body && <p className="mt-4 text-sm leading-relaxed text-[#F5F0E8]/80">{body}</p>}
    </div>
  );
}

function CtaCard() {
  return (
    <div className="relative w-full max-w-lg rounded-2xl border border-[#D4840A] bg-[#1C1C1C]/85 p-8 text-center backdrop-blur-md md:p-10">
      <h2 style={{ fontFamily: SERIF }} className="text-2xl text-[#F5F0E8] md:text-4xl">
        Built for Ghanaian farms. Ready for yours.
      </h2>
      <p className="mx-auto mt-4 max-w-md text-sm text-[#F5F0E8]/70">
        Join farmers across Ashanti, Brong-Ahafo, and Greater Accra managing smarter with Flock.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          to="/auth"
          aria-label="Request early access to Flock"
          className="rounded-full bg-[#D4840A] px-6 py-3 text-sm font-semibold text-[#1C1C1C] transition-transform hover:-translate-y-0.5"
        >
          Request Early Access
        </Link>
        <a
          href="#demo"
          aria-label="Watch the Flock product demo"
          className="rounded-full border border-[#D4840A] px-6 py-3 text-sm font-semibold text-[#F5F0E8] transition-colors hover:bg-[#D4840A]/10"
        >
          Watch the Demo
        </a>
      </div>
    </div>
  );
}

function TopNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-5 md:px-10">
      <Link to="/" style={{ fontFamily: SERIF }} className="text-2xl text-[#F5F0E8]" aria-label="Flock home">
        Flock
      </Link>
      <Link
        to="/auth"
        aria-label="Get access to Flock"
        className="rounded-full bg-[#D4840A] px-5 py-2 text-sm font-semibold text-[#1C1C1C] transition-transform hover:-translate-y-0.5"
      >
        Get Access
      </Link>
    </header>
  );
}
