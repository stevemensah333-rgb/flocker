// Hosted desktop app builds (offline Flocker). Externalized via lovable-assets.
export const DOWNLOADS = {
  mac: "/__l5e/assets-v1/96142cb8-1d71-4837-9bb3-06f1160f0878/Flocker-macOS.zip",
  windows: "/__l5e/assets-v1/904cfd38-2adb-40d9-8529-632071e0c893/Flocker-Windows.zip",
};

export type DesktopOS = "mac" | "windows";

export function detectOS(): DesktopOS {
  if (typeof navigator === "undefined") return "mac";
  const ua = `${navigator.platform} ${navigator.userAgent}`.toLowerCase();
  if (ua.includes("win")) return "windows";
  return "mac";
}
