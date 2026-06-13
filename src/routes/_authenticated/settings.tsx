import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Save, User, Tractor, MessageCircle, Copy, Trash2, RefreshCw, Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/app/AppShell";
import {
  generateLinkCode,
  listLinks,
  unlink,
  getAlertSettings,
  saveAlertSettings,
} from "@/lib/whatsapp/link.functions";

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

      <WhatsAppSection inputCls={inputCls} />
    </AppShell>
  );
}

type LinkRow = { id: string; phone: string; verified: boolean; created_at: string };
type AlertSettingsRow = {
  feed_stock_kg_threshold: number;
  daily_mortality_threshold: number;
  monthly_budget: number;
  daily_summary_enabled: boolean;
  alerts_enabled: boolean;
};

function WhatsAppSection({ inputCls }: { inputCls: string }) {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [code, setCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState<AlertSettingsRow | null>(null);
  const [savingAlerts, setSavingAlerts] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [l, s] = await Promise.all([listLinks(), getAlertSettings()]);
      setLinks(l.links as LinkRow[]);
      if (s.settings) setSettings(s.settings as AlertSettingsRow);
    } catch {
      /* not fatal */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function makeCode() {
    setGenerating(true);
    try {
      const r = await generateLinkCode();
      setCode(r.code);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't generate a code");
    } finally {
      setGenerating(false);
    }
  }

  async function removeLink(id: string) {
    try {
      await unlink({ data: { id } });
      setLinks((prev) => prev.filter((x) => x.id !== id));
      toast.success("Number unlinked");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't unlink");
    }
  }

  async function saveAlerts() {
    if (!settings) return;
    setSavingAlerts(true);
    try {
      await saveAlertSettings({
        data: {
          feed_stock_kg_threshold: Number(settings.feed_stock_kg_threshold) || 0,
          daily_mortality_threshold: Number(settings.daily_mortality_threshold) || 0,
          monthly_budget: Number(settings.monthly_budget) || 0,
          daily_summary_enabled: settings.daily_summary_enabled,
          alerts_enabled: settings.alerts_enabled,
        },
      });
      toast.success("Alert settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSavingAlerts(false);
    }
  }

  const upd = (patch: Partial<AlertSettingsRow>) =>
    setSettings((s) => (s ? { ...s, ...patch } : s));

  return (
    <section className="mt-6 rounded-lg border bg-flock-fog p-5 shadow-flock">
      <div className="mb-4 flex items-center gap-2 text-flock-field">
        <MessageCircle className="h-5 w-5" />
        <h2 className="font-display text-xl text-flock-soil">WhatsApp Assistant</h2>
      </div>
      <p className="mb-5 font-sans text-[13px] text-flock-stone">
        Chat with your farm on WhatsApp — record events, ask questions, send voice notes, and get
        alerts and an evening summary. Connect your number once to get started.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Connect */}
        <div>
          <h3 className="mb-2 font-sans text-[13px] font-semibold text-flock-soil">
            Connected numbers
          </h3>
          {loading ? (
            <div className="h-16 animate-pulse rounded-lg bg-flock-mist" />
          ) : links.length === 0 ? (
            <p className="font-sans text-[13px] text-flock-stone">No numbers connected yet.</p>
          ) : (
            <ul className="space-y-2">
              {links.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between rounded-lg border bg-flock-mist px-3 py-2"
                >
                  <span className="font-mono text-[13px] text-flock-soil">+{l.phone}</span>
                  <button
                    onClick={() => removeLink(l.id)}
                    aria-label="Unlink number"
                    className="text-flock-clay transition hover:text-flock-red"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 rounded-lg border border-dashed bg-flock-mist p-4">
            {code ? (
              <>
                <p className="font-sans text-[12px] text-flock-stone">
                  Send this code to the PoultryOS WhatsApp number to connect (expires in 30 min):
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-mono text-2xl tracking-widest text-flock-soil">{code}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(code);
                      toast.success("Code copied");
                    }}
                    className="rounded-md border bg-flock-fog p-1.5 text-flock-stone transition hover:text-flock-soil"
                    aria-label="Copy code"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={makeCode}
                  disabled={generating}
                  className="mt-3 flex items-center gap-1.5 font-sans text-[12px] text-flock-field hover:underline"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> New code
                </button>
              </>
            ) : (
              <button
                onClick={makeCode}
                disabled={generating}
                className="flex items-center gap-1.5 rounded-lg bg-flock-field px-4 py-2 font-sans text-[14px] font-semibold text-white disabled:opacity-60"
              >
                <MessageCircle className="h-4 w-4" />
                {generating ? "Generating…" : "Connect WhatsApp"}
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-flock-harvest">
            <Bell className="h-4 w-4" />
            <h3 className="font-sans text-[13px] font-semibold text-flock-soil">
              Alerts &amp; daily summary
            </h3>
          </div>
          {settings ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-sans text-[12px] text-flock-stone">
                    Daily mortality alert at
                  </label>
                  <input
                    type="number"
                    value={settings.daily_mortality_threshold}
                    onChange={(e) =>
                      upd({ daily_mortality_threshold: Number(e.target.value) })
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="font-sans text-[12px] text-flock-stone">
                    Monthly budget (₵)
                  </label>
                  <input
                    type="number"
                    value={settings.monthly_budget}
                    onChange={(e) => upd({ monthly_budget: Number(e.target.value) })}
                    className={inputCls}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 font-sans text-[13px] text-flock-soil">
                <input
                  type="checkbox"
                  checked={settings.alerts_enabled}
                  onChange={(e) => upd({ alerts_enabled: e.target.checked })}
                />
                Send WhatsApp alerts
              </label>
              <label className="flex items-center gap-2 font-sans text-[13px] text-flock-soil">
                <input
                  type="checkbox"
                  checked={settings.daily_summary_enabled}
                  onChange={(e) => upd({ daily_summary_enabled: e.target.checked })}
                />
                Send evening daily summary
              </label>
              <button
                onClick={saveAlerts}
                disabled={savingAlerts}
                className="mt-1 flex items-center gap-1.5 rounded-lg bg-flock-harvest px-4 py-2 font-sans text-[14px] font-semibold text-flock-soil disabled:opacity-60"
              >
                <Save className="h-4 w-4" /> {savingAlerts ? "Saving…" : "Save alerts"}
              </button>
            </div>
          ) : (
            <p className="font-sans text-[13px] text-flock-stone">
              Set up your farm first to configure alerts.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
