// Client-side helpers for public download tracking + feedback submission.
import { supabase } from "@/integrations/supabase/client";
import type { DesktopOS } from "@/lib/flock/downloads";

/** Fire-and-forget: record a download click. Never blocks the actual download. */
export async function recordDownload(platform: DesktopOS) {
  try {
    await supabase.from("downloads").insert({ platform });
  } catch {
    // ignore — tracking must never break the download
  }
}

/** Submit user feedback (rating 1-5 + message). */
export async function submitFeedback(rating: number, message: string) {
  const { error } = await supabase.from("feedback").insert({ rating, message });
  if (error) throw error;
}
