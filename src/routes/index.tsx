import { createFileRoute } from "@tanstack/react-router";
import FarmioLanding from "@/components/landing/FarmioLanding";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://flocker.lovable.app/" }],
  }),
  component: FarmioLanding,
});
