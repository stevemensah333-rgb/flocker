import { useEffect, useRef, useState } from "react";
import { Bell, Check, CheckCheck, X, Trash2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  category: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const unread = items.filter((n) => !n.read_at).length;

  async function load() {
    const { data } = await supabase
      .from("notifications")
      .select("id, title, body, category, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    setItems(data ?? []);
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      await load();
      channel = supabase
        .channel("notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `owner_id=eq.${u.user.id}`,
          },
          () => load(),
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markAllRead() {
    if (!userId || unread === 0) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .is("read_at", null)
      .eq("owner_id", userId);
  }

  async function openItem(n: Notification) {
    if (!n.read_at) {
      const now = new Date().toISOString();
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: now } : x)));
      await supabase.from("notifications").update({ read_at: now }).eq("id", n.id);
    }
    setOpen(false);
    if (n.link) navigate({ to: n.link });
  }

  async function removeItem(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  }

  async function clearAll() {
    if (!userId || items.length === 0) return;
    setItems([]);
    await supabase.from("notifications").delete().eq("owner_id", userId);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded border bg-flock-fog text-flock-soil transition hover:bg-flock-mist"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-flock-red px-1 font-sans text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-lg border bg-flock-paper shadow-lg">
          <div className="flex items-center justify-between border-b border-flock-line px-4 py-2.5">
            <span className="font-sans text-[13px] font-semibold text-flock-soil">
              Notifications
            </span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 font-sans text-[12px] text-flock-field transition hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center font-sans text-[13px] text-flock-stone">
                You're all caught up.
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`flex w-full gap-3 border-b border-flock-line px-4 py-3 text-left transition hover:bg-flock-mist/40 ${
                    n.read_at ? "" : "bg-flock-harvest/[0.06]"
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.read_at ? "bg-transparent" : "bg-flock-red"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-sans text-[13px] font-medium text-flock-soil">
                      {n.title}
                    </span>
                    {n.body && (
                      <span className="mt-0.5 block truncate font-sans text-[12px] text-flock-stone">
                        {n.body}
                      </span>
                    )}
                    <span className="mt-0.5 block font-sans text-[11px] text-flock-stone/70">
                      {timeAgo(n.created_at)}
                    </span>
                  </span>
                  {n.read_at && (
                    <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-flock-stone/50" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
