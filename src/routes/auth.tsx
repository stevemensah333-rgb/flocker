import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bird } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Flocker" },
      { name: "description", content: "Sign in or create an account to start managing your poultry farm operations." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setBusy(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setErr(error.message);
      navigate({ to: "/dashboard", replace: true });
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      setBusy(false);
      if (error) return setErr(error.message);
      setMsg("Account created. You can sign in now.");
      setMode("login");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-fr-content px-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(47,174,102,0.16),transparent_60%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-fr-green/15">
            <Bird className="h-5 w-5 text-fr-green" />
          </span>
          <span className="font-sans text-2xl font-bold tracking-tight text-fr-ink">
            Flocker
          </span>
        </div>

        <div className="rounded-2xl border border-fr-card-border bg-fr-card p-7 shadow-sm">
          <h1 className="font-sans text-2xl font-bold tracking-tight text-fr-ink">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1.5 font-sans text-[14px] text-fr-sub">
            {mode === "login"
              ? "Sign in to manage your flock."
              : "Start managing your poultry farm in minutes."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block font-sans text-[13px] font-medium text-fr-ink">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@farm.com"
                className="w-full rounded-xl border border-fr-card-border bg-white px-4 py-3 font-sans text-[14px] text-fr-ink outline-none transition focus:border-fr-green"
              />
            </div>
            <div>
              <label className="mb-1.5 block font-sans text-[13px] font-medium text-fr-ink">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-fr-card-border bg-white px-4 py-3 font-sans text-[14px] text-fr-ink outline-none transition focus:border-fr-green"
              />
            </div>

            {err && <p className="font-sans text-[13px] text-flock-red">{err}</p>}
            {msg && <p className="font-sans text-[13px] text-fr-green-text">{msg}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-fr-green py-3 font-sans text-[14px] font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
            >
              {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setErr("");
              setMsg("");
            }}
            className="mt-5 w-full text-center font-sans text-[13px] text-fr-sub transition hover:text-fr-ink"
          >
            {mode === "login" ? (
              <>Don't have an account? <span className="font-semibold text-fr-green-text">Sign up</span></>
            ) : (
              <>Already have an account? <span className="font-semibold text-fr-green-text">Sign in</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
