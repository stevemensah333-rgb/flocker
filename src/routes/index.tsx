import { createFileRoute } from "@tanstack/react-router";
import CinematicScroll from "@/components/landing/CinematicScroll";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flock — The Poultry Farm Operating System" },
      {
        name: "description",
        content:
          "Every bird, every batch, every cedi. Flock is the AI farm OS for Ghanaian poultry farmers — feed formulation, flock intelligence and health alerts in one app.",
      },
      { property: "og:title", content: "Flock — The Poultry Farm Operating System" },
      {
        property: "og:description",
        content:
          "AI feed formulation, flock intelligence and health alerts, built for Ghanaian poultry farms.",
      },
    ],
  }),
  component: CinematicScroll,
});
