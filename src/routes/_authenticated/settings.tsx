import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, User, Tractor } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [farmId, setFarmId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingFarm, setSavingFarm] = useState(false);

  // profile
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");

  // farm
  const [farmName, setFarmName] = useState("");
  const [location, setLocation] = useState("");
  const [region, setRegion] = useState("");
  const [eggPrice, setEggPrice] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      setEmail(u.user.email ?? "");
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, phone, country")
        .eq("id", u.user.id)
        .maybeSingle();
      if (p) {
        setFullName(p.full_name ?? "");
        setPhone(p.phone ?? "");
        setCountry(p.country ?? "");
      }
      const { data: f } = await supabase
        .from("farms")
        .select("id, name, location, region, egg_price")
        .eq("owner_id", u.user.id)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (f) {
        setFarmId(f.id);
        setFarmName(f.name ?? "");
        setLocation(f.location ?? "");
        setRegion(f.region ?? "");
        setEggPrice(String(f.egg_price ?? ""));
      }
      setReady(true);
    })();
  }, []);

  async function saveProfile() {
    if (!userId) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        country: country.trim() || null,
      })
      .eq("id", userId);
    setSavingProfile(false);
    if (error) {
      toast.error(`Couldn't save — ${error.message}`);
      return;
    }
    toast.success("Profile updated");
  }

  async function saveFarm() {
    if (!farmId) {
      toast.error("No farm found.");
      return;
    }
    setSavingFarm(true);
    const { error } = await supabase
      .from("farms")
      .update({
        name: farmName.trim(),
        location: location.trim() || null,
        region: region.trim() || null,
        egg_price: Number(eggPrice) || 0,
      })
      .eq("id", farmId);
    setSavingFarm(false);
    if (error) {
      toast.error(`Couldn't save — ${error.message}`);
      return;
    }
    toast.success("Farm details updated");
  }

  const inputCls =
    "mt-1 w-full rounded-lg border bg-flock-mist px-3 py-2 font-sans text-[14px] outline-none focus:ring-1 focus:ring-flock-harvest";

  if (!ready) {
    return (
      <AppShell title="Settings" subtitle="Manage your profile and farm.">
        <div className="space-y-4">
          <div className="h-48 animate-pulse rounded-lg bg-flock-fog" />
          <div className="h-48 animate-pulse rounded-lg bg-flock-fog" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Settings" subtitle="Manage your profile and farm.">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile */}
        <section className="rounded-lg border bg-flock-fog p-5 shadow-flock">
          <div className="mb-4 flex items-center gap-2 text-flock-harvest">
            <User className="h-5 w-5" />
            <h2 className="font-display text-xl text-flock-soil">Your profile</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="font-sans text-[12px] text-flock-stone">Email</label>
              <input value={email} disabled className={`${inputCls} opacity-60`} />
            </div>
            <div>
              <label className="font-sans text-[12px] text-flock-stone">Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-sans text-[12px] text-flock-stone">Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="font-sans text-[12px] text-flock-stone">Country</label>
                <input value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>
          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="mt-5 flex items-center gap-1.5 rounded-lg bg-flock-harvest px-4 py-2 font-sans text-[14px] font-semibold text-flock-soil disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {savingProfile ? "Saving…" : "Save profile"}
          </button>
        </section>

        {/* Farm */}
        <section className="rounded-lg border bg-flock-fog p-5 shadow-flock">
          <div className="mb-4 flex items-center gap-2 text-flock-field">
            <Tractor className="h-5 w-5" />
            <h2 className="font-display text-xl text-flock-soil">Your farm</h2>
          </div>
          {farmId ? (
            <>
              <div className="space-y-3">
                <div>
                  <label className="font-sans text-[12px] text-flock-stone">Farm name</label>
                  <input value={farmName} onChange={(e) => setFarmName(e.target.value)} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-sans text-[12px] text-flock-stone">Town / city</label>
                    <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="font-sans text-[12px] text-flock-stone">Region</label>
                    <input value={region} onChange={(e) => setRegion(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="font-sans text-[12px] text-flock-stone">Egg price (₵ per egg)</label>
                  <input type="number" value={eggPrice} onChange={(e) => setEggPrice(e.target.value)} className={inputCls} />
                </div>
              </div>
              <button
                onClick={saveFarm}
                disabled={savingFarm}
                className="mt-5 flex items-center gap-1.5 rounded-lg bg-flock-harvest px-4 py-2 font-sans text-[14px] font-semibold text-flock-soil disabled:opacity-60"
              >
                <Save className="h-4 w-4" /> {savingFarm ? "Saving…" : "Save farm"}
              </button>
            </>
          ) : (
            <p className="font-sans text-[14px] text-flock-stone">No farm set up yet.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
