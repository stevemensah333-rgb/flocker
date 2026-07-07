import { createFileRoute, redirect } from "@tanstack/react-router";

// The web login entry point is retired — Flocker is a download-only desktop app.
// Any hit to /auth sends visitors back to the landing page.
export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
