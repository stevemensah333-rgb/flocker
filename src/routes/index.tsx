import { createFileRoute } from "@tanstack/react-router";
import FarmioLanding from "@/components/landing/FarmioLanding";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flocker — The Poultry Farm Operating System" },
      {
        name: "description",
        content:
          "Every bird, every batch, every cedi. Flocker is the AI farm OS for Ghanaian poultry farmers — feed formulation, flock intelligence and health alerts in one app.",
      },
      { property: "og:title", content: "Flocker — The Poultry Farm Operating System" },
      {
        property: "og:description",
        content:
          "Every bird, every batch, every cedi. Flocker is the AI farm OS for Ghanaian poultry farmers — feed formulation, flock intelligence and health alerts in one app.",
      },
    ],
  }),
  component: FarmioLanding,
});
