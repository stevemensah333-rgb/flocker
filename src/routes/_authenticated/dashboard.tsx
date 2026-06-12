import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bird, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [farmName, setFarmName] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, onboarded")
        .eq("id", u.user.id)
        .maybeSingle();
      if (!profile?.onboarded) {
        navigate({ to: "/onboarding" });
        return;
      }
      setName(profile.full_name?.split(" ")[0] ?? "farmer");
      const { data: farm } = await supabase
        .from("farms")
        .select("name")
        .eq("owner_id", u.user.id)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      setFarmName(farm?.name ?? null);
      setReady(true);
    })();
  }, [navigate]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-flock-cream">
      <header className="sticky top-0 z-10 border-b border-flock-fog bg-flock-cream/95 px-4 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center">
          <div className="flex items-center gap-2">
            <Bird className="h-5 w-5 text-flock-harvest" />
            <span className="font-display text-xl text-flock-soil">Flock</span>
          </div>
          <button
            onClick={signOut}
            className="ml-auto flex items-center gap-1.5 rounded-lg border bg-flock-fog px-3 py-1.5 font-sans text-[13px] text-flock-soil"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {ready ? (
          <div className="animate-flock-enter">
            <h1 className="font-display text-3xl text-flock-soil">
              Good morning, {name}
            </h1>
            <p className="mt-1 font-sans text-[14px] text-flock-stone">
              {farmName ? `${farmName} · ` : ""}
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <div className="mt-8 rounded-lg border bg-flock-fog p-6 shadow-flock">
              <p className="font-sans text-[15px] text-flock-soil">
                Your account and farm are set up. The full dashboard, RationPro,
                EggLedger and more arrive in the next phases.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-8 w-48 animate-pulse rounded bg-flock-fog" />
            <div className="h-32 animate-pulse rounded-lg bg-flock-fog" />
          </div>
        )}
      </main>
    </div>
  );
}
