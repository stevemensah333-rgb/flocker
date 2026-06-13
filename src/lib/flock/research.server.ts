// VetLine evidence layer — gathers grounded sources from research papers and
// trusted veterinary references before the model answers. Server-only.
//
// Designed to degrade gracefully:
//   - PERPLEXITY_API_KEY present  -> academic / peer-reviewed evidence
//   - FIRECRAWL_API_KEY  present  -> trusted vet-guide web evidence
//   - neither present            -> returns [] and VetLine falls back to
//                                    Lovable AI's own knowledge (still useful,
//                                    just not cited).
//
// No throwing: a failed provider is logged and skipped so one outage never
// breaks the consult.

export type Evidence = {
  id: number; // 1-based, assigned after merge — stable for citations
  title: string;
  url: string;
  snippet: string;
  origin: "academic" | "vet-guide";
};

// Authoritative, low-noise poultry-health domains we trust for grounding.
const TRUSTED_VET_DOMAINS = [
  "merckvetmanual.com",
  "msdvetmanual.com",
  "woah.org", // World Organisation for Animal Health (OIE)
  "thepoultrysite.com",
  "poultrydvm.com",
  "extension.org",
  "vetmed.iastate.edu",
  "gov", // .gov extension / ag departments
  "ncbi.nlm.nih.gov",
];

async function fromPerplexity(query: string): Promise<Evidence[]> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        search_mode: "academic",
        messages: [
          {
            role: "system",
            content:
              "You are a veterinary research librarian. Summarise the strongest peer-reviewed evidence relevant to the poultry-health query in 4-6 tight bullet points. Each bullet must be a concrete, citable finding (cause, sign, treatment, biosecurity, or differential). No preamble.",
          },
          { role: "user", content: query },
        ],
        max_tokens: 700,
      }),
    });

    if (!res.ok) {
      console.error("[research] perplexity", res.status, await res.text().catch(() => ""));
      return [];
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      citations?: string[];
      search_results?: { title?: string; url?: string; snippet?: string }[];
    };

    const summary = data.choices?.[0]?.message?.content?.trim() ?? "";
    const results = data.search_results ?? [];
    const citations = data.citations ?? [];

    // Prefer rich search_results; fall back to bare citation URLs.
    if (results.length > 0) {
      return results.slice(0, 6).map((r, i) => ({
        id: 0,
        title: r.title?.trim() || `Research source ${i + 1}`,
        url: r.url || "",
        snippet: (r.snippet?.trim() || summary).slice(0, 400),
        origin: "academic" as const,
      }));
    }

    return citations.slice(0, 6).map((url, i) => ({
      id: 0,
      title: hostnameOf(url) || `Research source ${i + 1}`,
      url,
      snippet: summary.slice(0, 400),
      origin: "academic" as const,
    }));
  } catch (err) {
    console.error("[research] perplexity error", err);
    return [];
  }
}

async function fromFirecrawl(query: string): Promise<Evidence[]> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `poultry ${query}`,
        limit: 6,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    if (!res.ok) {
      console.error("[research] firecrawl", res.status, await res.text().catch(() => ""));
      return [];
    }

    const data = (await res.json()) as {
      data?: { web?: FirecrawlHit[] } | FirecrawlHit[];
    };

    const hits: FirecrawlHit[] = Array.isArray(data.data)
      ? data.data
      : (data.data?.web ?? []);

    return hits
      .filter((h) => h.url && isTrusted(h.url))
      .slice(0, 6)
      .map((h) => ({
        id: 0,
        title: h.title?.trim() || hostnameOf(h.url!) || "Veterinary guide",
        url: h.url!,
        snippet: (h.description?.trim() || h.markdown?.trim() || "").slice(0, 400),
        origin: "vet-guide" as const,
      }));
  } catch (err) {
    console.error("[research] firecrawl error", err);
    return [];
  }
}

type FirecrawlHit = {
  title?: string;
  url?: string;
  description?: string;
  markdown?: string;
};

function isTrusted(url: string): boolean {
  const host = hostnameOf(url).toLowerCase();
  return TRUSTED_VET_DOMAINS.some((d) => host.includes(d));
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Gather grounding evidence for a poultry-health query. Runs all available
 * providers in parallel, dedupes by URL, and assigns stable 1-based ids.
 */
export async function gatherEvidence(query: string): Promise<Evidence[]> {
  const q = query.trim().slice(0, 600);
  if (!q) return [];

  const [academic, guides] = await Promise.all([fromPerplexity(q), fromFirecrawl(q)]);

  const merged: Evidence[] = [];
  const seen = new Set<string>();
  // Interleave so a single provider can't dominate the citation list.
  const maxLen = Math.max(academic.length, guides.length);
  for (let i = 0; i < maxLen; i++) {
    for (const e of [academic[i], guides[i]]) {
      if (!e) continue;
      const dedupeKey = (e.url || e.title).toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      merged.push(e);
    }
  }

  return merged.slice(0, 8).map((e, i) => ({ ...e, id: i + 1 }));
}

/** Render evidence into a compact, model-readable block. */
export function formatEvidence(evidence: Evidence[]): string {
  if (evidence.length === 0) return "";
  return evidence
    .map((e) => `[${e.id}] (${e.origin}) ${e.title}\n${e.snippet}\nURL: ${e.url}`)
    .join("\n\n");
}
