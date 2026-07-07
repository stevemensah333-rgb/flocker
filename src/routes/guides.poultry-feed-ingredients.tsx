import { createFileRoute, Link } from "@tanstack/react-router";
import { Bird } from "lucide-react";

const URL = "https://flocker.lovable.app/guides/poultry-feed-ingredients";
const TITLE = "Poultry Feed Ingredients & Ration Formulation Guide";
const DESCRIPTION =
  "A practical guide to common poultry feed ingredients — maize, soya and fish meal — and how to formulate balanced, least-cost rations by crude protein and energy.";

export const Route = createFileRoute("/guides/poultry-feed-ingredients")({
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
    ],
  }),
  component: GuidePage,
});

const INGREDIENTS = [
  {
    name: "Maize (Corn)",
    cp: "8–9%",
    me: "3,350 kcal/kg",
    role: "The primary energy source in most poultry rations. High in metabolizable energy but low in protein, so it is balanced with protein-rich ingredients.",
  },
  {
    name: "Soybean Meal (Soya)",
    cp: "44–48%",
    me: "2,230 kcal/kg",
    role: "The workhorse protein source, rich in the amino acids lysine and methionine. Usually the largest protein contributor in layer and broiler feeds.",
  },
  {
    name: "Fish Meal",
    cp: "60–72%",
    me: "2,800 kcal/kg",
    role: "A premium animal protein with an excellent amino acid profile. Used in smaller inclusions to lift protein quality, especially for young birds.",
  },
  {
    name: "Wheat Bran",
    cp: "15–16%",
    me: "1,300 kcal/kg",
    role: "A fibrous, low-energy filler that adds bulk and modest protein. Useful for diluting energy in layer diets and improving gut health.",
  },
  {
    name: "Limestone / Oyster Shell",
    cp: "0%",
    me: "0 kcal/kg",
    role: "The main calcium source for eggshell formation. Layers need far more calcium than growers or broilers.",
  },
];

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
          Poultry Feed Ingredients &amp; Ration Formulation
        </h1>
        <p className="mt-3 font-sans text-[15px] leading-relaxed text-flock-stone">
          Feed is the single largest cost on almost every poultry farm — often 60–70% of total
          expenses. Understanding what each ingredient contributes lets you build rations that hit
          your birds' nutritional targets without overspending. This guide covers the most common
          chicken feed ingredients and how to balance them.
        </p>

        <h2 className="mt-8 font-display text-2xl text-flock-soil">
          Two numbers that drive every ration
        </h2>
        <p className="mt-2 font-sans text-[15px] leading-relaxed text-flock-stone">
          Almost all formulation decisions come down to two values:
        </p>
        <ul className="mt-3 space-y-2 font-sans text-[15px] text-flock-stone">
          <li>
            <strong className="text-flock-soil">Crude Protein (CP)</strong> — the total protein
            content, driving growth, egg output and feathering. Broiler starters need ~22% CP;
            layers typically need ~16–18%.
          </li>
          <li>
            <strong className="text-flock-soil">Metabolizable Energy (ME)</strong> — the usable
            energy in the feed, measured in kcal/kg. Birds eat to meet their energy needs, so ME
            controls how much feed they consume.
          </li>
        </ul>

        <h2 className="mt-8 font-display text-2xl text-flock-soil">
          Common ingredients at a glance
        </h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-flock-fog bg-flock-fog">
          <table className="w-full border-collapse text-left font-sans text-[14px]">
            <thead>
              <tr className="border-b border-flock-fog text-flock-soil">
                <th className="px-4 py-3">Ingredient</th>
                <th className="px-4 py-3">Crude Protein</th>
                <th className="px-4 py-3">Energy (ME)</th>
                <th className="px-4 py-3">Role in the ration</th>
              </tr>
            </thead>
            <tbody>
              {INGREDIENTS.map((i) => (
                <tr key={i.name} className="border-b border-flock-fog/60 align-top">
                  <td className="px-4 py-3 font-semibold text-flock-soil">{i.name}</td>
                  <td className="px-4 py-3 text-flock-stone">{i.cp}</td>
                  <td className="px-4 py-3 text-flock-stone">{i.me}</td>
                  <td className="px-4 py-3 text-flock-stone">{i.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-8 font-display text-2xl text-flock-soil">
          How to formulate a balanced ration
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 font-sans text-[15px] leading-relaxed text-flock-stone">
          <li>Start from your birds' target CP and ME for their stage (starter, grower, layer).</li>
          <li>Use maize as the energy base, then add soya to reach your protein target.</li>
          <li>Add a small fish meal inclusion to lift amino acid quality where budget allows.</li>
          <li>Balance calcium with limestone — critical for layers producing shells daily.</li>
          <li>Adjust ingredient weights until CP and ME both land in range at the lowest cost.</li>
        </ol>

        <h2 className="mt-8 font-display text-2xl text-flock-soil">
          Do the math automatically with RationPro
        </h2>
        <p className="mt-2 font-sans text-[15px] leading-relaxed text-flock-stone">
          Balancing protein, energy and cost by hand is slow and error-prone. Flocker's{" "}
          <strong className="text-flock-soil">RationPro</strong> tool lets you pick ingredients,
          enter live local prices and batch size up to 5 tonnes, and instantly see the weighted CP,
          ME and cost per kilogram — so you can tweak the mix until it is both balanced and
          affordable.
        </p>

        <div className="mt-8 rounded-lg border border-flock-fog bg-flock-fog p-6">
          <p className="font-sans text-[15px] text-flock-soil">
            Ready to formulate your own least-cost rations?
          </p>
          <Link
            to="/auth"
            className="mt-3 inline-flex rounded-lg bg-flock-harvest px-4 py-2.5 font-sans text-[15px] font-semibold text-flock-soil"
          >
            Try RationPro free
          </Link>
        </div>
      </article>
    </main>
  );
}
