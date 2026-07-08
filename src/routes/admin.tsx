import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { claimOrCheckAdmin } from "@/lib/admin/admin.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Flocker Admin" },
      { name: "description", content: "Access the Flocker admin panel to manage system data and feedback." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

const SERIF = '"Playfair Display", Georgia, serif';

type FeedbackRow = { id: string; rating: number; message: string; created_at: string };

function AdminPage() {
  const [session, setSession] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const claim = useServerFn(claimOrCheckAdmin);

  const [downloads, setDownloads] = useState<{ total: number; mac: number; windows: number } | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);

  const loadData = useCallback(async () => {
    const [{ count: total }, { count: mac }, { count: windows }, { data: fb }] = await Promise.all([
      supabase.from("downloads").select("id", { count: "exact", head: true }),
      supabase.from("downloads").select("id", { count: "exact", head: true }).eq("platform", "mac"),
      supabase.from("downloads").select("id", { count: "exact", head: true }).eq("platform", "windows"),
      supabase.from("feedback").select("*").order("created_at", { ascending: false }),
    ]);
    setDownloads({ total: total ?? 0, mac: mac ?? 0, windows: windows ?? 0 });
    setFeedback((fb ?? []) as FeedbackRow[]);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const has = !!data.session;
      setSession(has);
      if (has) {
        const res = await claim({});
        setIsAdmin(res.isAdmin);
        if (res.isAdmin) loadData();
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(!!s));
    return () => sub.subscription.unsubscribe();
  }, [claim, loadData]);

  if (session === null) {
    return <Screen>Loading…</Screen>;
  }

  if (!session) {
    return <LoginForm />;
  }

  if (isAdmin === null) {
    return <Screen>Checking access…</Screen>;
  }

  if (!isAdmin) {
    return (
      <Screen>
        <p className="text-[#F5F0E8]/70">This account is not an admin.</p>
        <button onClick={() => supabase.auth.signOut()} className="mt-4 text-sm text-[#D4840A] underline">
          Sign out
        </button>
      </Screen>
    );
  }

  return (
    <div className="min-h-screen bg-[#1C1C1C] px-6 py-16 text-[#F5F0E8]">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 style={{ fontFamily: SERIF }} className="text-3xl">Admin</h1>
          <button onClick={() => supabase.auth.signOut()} className="text-sm text-[#D4840A] underline">
            Sign out
          </button>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4">
          <Stat label="Total downloads" value={downloads?.total ?? 0} />
          <Stat label="macOS" value={downloads?.mac ?? 0} />
          <Stat label="Windows" value={downloads?.windows ?? 0} />
        </div>

        <h2 style={{ fontFamily: SERIF }} className="mt-12 text-2xl">Feedback ({feedback.length})</h2>
        <div className="mt-4 space-y-3">
          {feedback.length === 0 && <p className="text-sm text-[#F5F0E8]/50">No feedback yet.</p>}
          {feedback.map((f) => (
            <div key={f.id} className="rounded-xl border border-[#F5F0E8]/12 bg-[#242422] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[#D4840A]">{"★".repeat(f.rating)}<span className="text-[#F5F0E8]/20">{"★".repeat(5 - f.rating)}</span></span>
                <span className="text-xs text-[#F5F0E8]/40">{new Date(f.created_at).toLocaleDateString()}</span>
              </div>
              <p className="mt-2 text-sm text-[#F5F0E8]/80">{f.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#F5F0E8]/12 bg-[#242422] p-5 text-center">
      <div className="text-3xl font-bold text-[#D4840A]">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-[#F5F0E8]/50">{label}</div>
    </div>
  );
}

function LoginForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const fn =
      mode === "login"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    setBusy(false);
    if (error) setErr(error.message);
  };

  return (
    <Screen>
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 text-left">
        <h1 style={{ fontFamily: SERIF }} className="text-center text-3xl text-[#F5F0E8]">
          Flocker Admin
        </h1>
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-[#F5F0E8]/15 bg-[#242422] px-4 py-3 text-sm text-[#F5F0E8] outline-none focus:border-[#D4840A]"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-[#F5F0E8]/15 bg-[#242422] px-4 py-3 text-sm text-[#F5F0E8] outline-none focus:border-[#D4840A]"
        />
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-[#D4840A] py-3 text-sm font-semibold text-[#1C1C1C] disabled:opacity-60"
        >
          {busy ? "…" : mode === "login" ? "Sign in" : "Create admin account"}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="w-full text-center text-xs text-[#F5F0E8]/50 underline"
        >
          {mode === "login" ? "First time? Create the admin account" : "Have an account? Sign in"}
        </button>
      </form>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#1C1C1C] px-6 text-center">
      {children}
    </div>
  );
}
