import { createFileRoute, Link } from "@tanstack/react-router";
import { Bird } from "lucide-react";

const URL = "https://flocker.lovable.app/guides/poultry-breeds";
const TITLE = "Poultry Breeds Guide: Best Layer & Broiler Chickens for Farmers";
const DESCRIPTION =
  "A guide to popular poultry breeds for chicken farming — layers like Isa Brown and broilers like Ross 308 — with performance targets to help you choose the right flock.";

export const Route = createFileRoute("/guides/poultry-breeds")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          author: { "@type": "Organization", name: "Flocker" },
          publisher: { "@type": "Organization", name: "Flocker" },
          mainEntityOfPage: URL,
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "What is the best chicken breed for eggs?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Commercial layer hybrids like the Isa Brown and Lohmann Brown are the most productive egg breeds, laying 300 or more eggs per year on efficient feed intake.",
              },
            },
            {
              "@type": "Question",
              name: "What is the best chicken breed for meat?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Broiler hybrids such as the Ross 308 and Cobb 500 are the leading meat breeds, reaching about 2 kg live weight in roughly 35 days with a feed conversion ratio near 1.6.",
              },
            },
            {
              "@type": "Question",
              name: "What are dual-purpose chicken breeds?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Dual-purpose breeds like the Kuroiler and Sasso are hardy birds raised for both eggs and meat. They grow slower than commercial hybrids but tolerate local free-range and backyard conditions well.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: GuidePage,
});

const LAYERS = [
  {
    name: "Isa Brown",
    eggs: "~320 eggs/yr",
    weight: "~2.0 kg",
    notes: "The most popular commercial layer worldwide. Calm, hardy and highly feed-efficient with large brown eggs.",
  },
  {
    name: "Lohmann Brown",
    eggs: "~315 eggs/yr",
    weight: "~2.0 kg",
    notes: "A robust brown-egg layer known for consistent lay and long production cycles. Excellent shell quality.",
  },
  {
    name: "Hy-Line Brown",
    eggs: "~340 eggs/yr",
    weight: "~1.9 kg",
    notes: "One of the highest-yielding layers with strong persistency and low mortality in warm climates.",
  },
];

const BROILERS = [
  {
    name: "Ross 308",
    target: "~2.0 kg in 35 days",
    fcr: "~1.6",
    notes: "The global benchmark broiler. Fast, uniform growth and efficient feed conversion, ideal for commercial meat production.",
  },
  {
    name: "Cobb 500",
    target: "~2.0 kg in 36 days",
    fcr: "~1.6",
    notes: "A low-cost broiler with excellent feed efficiency and good performance on lower-density diets.",
  },
];

const DUAL = [
  {
    name: "Kuroiler",
    eggs: "~150 eggs/yr",
    weight: "~3.0 kg (male)",
    notes: "A hardy dual-purpose hybrid bred for backyard and free-range systems. Scavenges well and resists local diseases.",
  },
  {
    name: "Sasso",
    eggs: "~180 eggs/yr",
    weight: "~2.5 kg",
    notes: "A coloured free-range bird prized for flavourful meat and adaptability to extensive systems.",
  },
];

function BreedTable({
  caption,
  col2,
  col3,
  rows,
}: {
  caption: string;
  col2: string;
  col3: string;
  rows: { name: string; a: string; b: string; notes: string }[];
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-flock-fog bg-flock-fog">
      <table className="w-full border-collapse text-left font-sans text-[14px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-flock-fog text-flock-soil">
            <th className="px-4 py-3">Breed</th>
            <th className="px-4 py-3">{col2}</th>
            <th className="px-4 py-3">{col3}</th>
            <th className="px-4 py-3">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-flock-fog/60 align-top">
              <td className="px-4 py-3 font-semibold text-flock-soil">{r.name}</td>
              <td className="px-4 py-3 text-flock-stone">{r.a}</td>
              <td className="px-4 py-3 text-flock-stone">{r.b}</td>
              <td className="px-4 py-3 text-flock-stone">{r.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GuidePage() {
  return (
    <main className="min-h-screen bg-flock-cream">
      <header className="border-b border-flock-fog bg-flock-cream/95 px-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <Bird className="h-6 w-6 text-flock-harvest" />
            <span className="font-display text-2xl text-flock-soil">Flocker</span>
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl text-flock-soil sm:text-4xl">
          Poultry Breeds Guide: Choosing the Right Chickens
        </h1>
        <p className="mt-3 font-sans text-[15px] leading-relaxed text-flock-stone">
          The breed you raise sets the ceiling on what your farm can achieve. A high-yield layer
          hybrid, a fast-growing broiler and a hardy dual-purpose bird each suit very different
          goals, budgets and management systems. This guide covers the most popular poultry breeds
          for chicken farming and the performance targets that separate them, so you can start or
          diversify your flock with confidence.
        </p>

        <h2 className="mt-8 font-display text-2xl text-flock-soil">
          Match the breed to your goal
        </h2>
        <ul className="mt-3 space-y-2 font-sans text-[15px] text-flock-stone">
          <li>
            <strong className="text-flock-soil">Layers</strong> — bred purely for egg output. Choose
            these if selling table eggs is your main business.
          </li>
          <li>
            <strong className="text-flock-soil">Broilers</strong> — bred for rapid, efficient meat
            growth. Choose these for a fast, high-volume meat operation.
          </li>
          <li>
            <strong className="text-flock-soil">Dual-purpose</strong> — hardy birds for both eggs and
            meat. Best for free-range, backyard and lower-input systems.
          </li>
        </ul>

        <h2 className="mt-8 font-display text-2xl text-flock-soil">Best layer breeds for eggs</h2>
        <p className="mt-2 font-sans text-[15px] leading-relaxed text-flock-stone">
          Commercial layer hybrids are the most productive egg breeds, laying 300+ eggs a year on
          modest feed. They peak around 90–95% lay and hold it for months with good management.
        </p>
        <BreedTable
          caption="Popular layer chicken breeds and their egg performance"
          col2="Egg output"
          col3="Body weight"
          rows={LAYERS.map((l) => ({ name: l.name, a: l.eggs, b: l.weight, notes: l.notes }))}
        />

        <h2 className="mt-8 font-display text-2xl text-flock-soil">Best broiler breeds for meat</h2>
        <p className="mt-2 font-sans text-[15px] leading-relaxed text-flock-stone">
          Broiler hybrids convert feed into meat faster than any other bird. Feed conversion ratio
          (FCR) — kilograms of feed per kilogram of body weight — is the number that decides your
          margin, so lower is better.
        </p>
        <BreedTable
          caption="Popular broiler chicken breeds and their meat performance"
          col2="Growth target"
          col3="FCR"
          rows={BROILERS.map((b) => ({ name: b.name, a: b.target, b: b.fcr, notes: b.notes }))}
        />

        <h2 className="mt-8 font-display text-2xl text-flock-soil">Dual-purpose &amp; local breeds</h2>
        <p className="mt-2 font-sans text-[15px] leading-relaxed text-flock-stone">
          For free-range and backyard farms, hardy dual-purpose birds trade peak output for
          resilience, disease tolerance and the ability to scavenge for part of their feed.
        </p>
        <BreedTable
          caption="Popular dual-purpose chicken breeds"
          col2="Egg output"
          col3="Body weight"
          rows={DUAL.map((d) => ({ name: d.name, a: d.eggs, b: d.weight, notes: d.notes }))}
        />

        <h2 className="mt-8 font-display text-2xl text-flock-soil">
          Hit your breed's targets with Flocker
        </h2>
        <p className="mt-2 font-sans text-[15px] leading-relaxed text-flock-stone">
          A great breed only pays off if you feed and manage it to spec. Flocker tracks each batch
          against its breed targets, formulates least-cost rations that meet the protein and energy
          your birds need, and flags health issues early — so your flock delivers the numbers on
          these charts.
        </p>

        <div className="mt-8 rounded-lg border border-flock-fog bg-flock-fog p-6">
          <p className="font-sans text-[15px] text-flock-soil">
            Ready to get the most from your flock?
          </p>
          <Link
            to="/auth"
            className="mt-3 inline-flex rounded-lg bg-flock-harvest px-4 py-2.5 font-sans text-[15px] font-semibold text-flock-soil"
          >
            Start with Flocker free
          </Link>
        </div>

        <p className="mt-8 font-sans text-[14px] text-flock-stone">
          Related:{" "}
          <Link to="/guides/poultry-feed-ingredients" className="font-semibold text-flock-harvest underline">
            Poultry Feed Ingredients &amp; Ration Formulation Guide
          </Link>
        </p>
      </article>
    </main>
  );
}
