import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bird } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or join Flocker — Poultry Farm OS" },
      {
        name: "description",
        content:
          "Sign in to Flocker or create your free account to manage feed, egg production, flock health and finances for your poultry farm.",
      },
      { property: "og:title", content: "Sign in or join Flocker — Poultry Farm OS" },
      {
        property: "og:description",
        content:
          "Access your Flocker poultry farm operating system — feed formulation, egg tracking, health records and reports in one place.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const COUNTRIES = ["Ghana", "Nigeria", "Kenya", "Uganda", "Other"];

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);

  // shared
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // signup
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("Ghana");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName, phone, country },
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/dashboard" });
        } else {
          toast.success("Check your email to confirm your account, then sign in.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(
        msg.includes("Invalid login")
          ? "Wrong email or password — please try again."
          : msg,
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Couldn't sign in with Google — please try again.");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-flock-cream px-4 py-10">
      <div className="w-full max-w-sm animate-flock-enter">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <Bird className="h-6 w-6 text-flock-harvest" />
          <span className="font-display text-2xl text-flock-soil">Flocker</span>
        </Link>

        <div className="rounded-lg border bg-flock-fog p-6 shadow-flock">
          <h1 className="font-display text-2xl text-flock-soil">
            {mode === "signin" ? "Welcome back" : "Create your farm"}
          </h1>
          <p className="mt-1 font-sans text-[13px] text-flock-stone">
            {mode === "signin"
              ? "Sign in to manage your flock."
              : "Free for up to 500 birds. No credit card."}
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            {mode === "signup" && (
              <>
                <Field
                  label="Full name"
                  value={fullName}
                  onChange={setFullName}
                  required
                />
                <Field
                  label="Phone (WhatsApp)"
                  value={phone}
                  onChange={setPhone}
                  type="tel"
                />
                <div>
                  <label className="font-sans text-[12px] text-flock-stone">
                    Country
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="mt-1 w-full rounded-lg border bg-flock-mist px-3 py-2 font-sans text-[14px] outline-none focus:ring-1 focus:ring-flock-harvest"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <Field
              label="Email"
              value={email}
              onChange={setEmail}
              type="email"
              required
            />
            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              type="password"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-flock-harvest px-4 py-2.5 font-sans text-[15px] font-semibold text-flock-soil disabled:opacity-60"
            >
              {loading
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create farm"}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="font-sans text-[12px] text-flock-stone">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full rounded-lg border bg-flock-cream px-4 py-2.5 font-sans text-[14px] font-medium text-flock-soil disabled:opacity-60"
          >
            Continue with Google
          </button>

          <p className="mt-5 text-center font-sans text-[13px] text-flock-stone">
            {mode === "signin" ? "New to Flocker?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-semibold text-flock-soil underline"
            >
              {mode === "signin" ? "Create a farm" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="font-sans text-[12px] text-flock-stone">{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border bg-flock-mist px-3 py-2 font-sans text-[14px] outline-none focus:ring-1 focus:ring-flock-harvest"
      />
    </div>
  );
}
