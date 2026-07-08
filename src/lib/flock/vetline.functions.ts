import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MsgSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
  imageBase64: z.string().max(15_000_000).optional(),
});

const FlockSchema = z
  .object({
    name: z.string().max(120).optional(),
    breed: z.string().max(120).optional(),
    count: z.number().int().min(0).max(1_000_000).optional(),
    age_weeks: z.number().int().min(0).max(600).optional(),
    production_type: z.string().max(60).optional(),
  })
  .optional();

const InputSchema = z.object({
  messages: z.array(MsgSchema).min(1).max(40),
  flock: FlockSchema,
});

export type VetLineSource = {
  id: number;
  title: string;
  url: string;
  origin: "academic" | "vet-guide";
};

export type VetLineReply = {
  reply: string;
  confidence: "high" | "moderate" | "low";
  grounded: boolean;
  sources: VetLineSource[];
};

const SYSTEM = `You are VetLine, an evidence-grounded poultry health adviser inside the Flocker farm app.
You help small and medium poultry farmers (often in Africa) triage flock health issues.

You will be given EVIDENCE: numbered findings drawn from peer-reviewed research and trusted
veterinary references. Treat that evidence as your primary source of truth.

Rules:
- Ground your reasoning in the EVIDENCE. When a statement is supported by a finding, cite it
  inline with its number in square brackets, e.g. "Newcastle disease is a likely cause [2]."
- You may add standard, well-established husbandry knowledge when the evidence is silent, but do
  NOT invent specific drug names or dosages — recommend confirming with a local vet or product label.
- Be concise and structured: likely causes (ranked), immediate actions, biosecurity steps, and a
  clear "call a vet now" trigger for severe/zoonotic signs.
- Ask 1-2 clarifying questions when symptoms are too vague to triage.
- Always include a one-line note that this is guidance, not a substitute for an in-person vet
  diagnosis, when giving treatment advice.
- Set confidence honestly:
  * "high" only when strong, directly relevant evidence supports the conclusion.
  * "moderate" when evidence is partial or symptoms are somewhat ambiguous.
  * "low" when little/no evidence applies or the picture is unclear.
- In "usedSourceIds" list ONLY the evidence numbers you actually cited in the answer.`;

export const askVetLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<VetLineReply> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured. Missing API key.");

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const { generateText, Output } = await import("ai");
    const { gatherEvidence, formatEvidence } = await import("@/lib/flock/research.server");

    const gateway = createLovableAiGatewayProvider(key);

    // The latest user message drives the literature search.
    const lastUser = [...data.messages].reverse().find((m) => m.role === "user");
    const evidence = lastUser ? await gatherEvidence(lastUser.content) : [];
    const grounded = evidence.length > 0;

    const flockNote = data.flock
      ? `\n\nFarmer's selected flock context: ${JSON.stringify(data.flock)}`
      : "";

    const evidenceBlock = grounded
      ? `\n\nEVIDENCE:\n${formatEvidence(evidence)}`
      : `\n\nEVIDENCE: (none retrieved — answer from established poultry knowledge, keep confidence at most "moderate", and do not fabricate citations.)`;

    try {
      const modelMessages = data.messages.map((m) => {
        if (m.role === "user" && m.imageBase64) {
          return {
            role: "user" as const,
            content: [
              { type: "text" as const, text: m.content },
              { type: "image" as const, image: m.imageBase64 },
            ],
          };
        }
        return { role: m.role, content: m.content };
      });

      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system: SYSTEM + flockNote + evidenceBlock,
        messages: modelMessages,
        output: Output.object({
          schema: z.object({
            reply: z.string(),
            confidence: z.enum(["high", "moderate", "low"]),
            usedSourceIds: z.array(z.number()),
          }),
        }),
      });

      const usedIds = new Set(output.usedSourceIds);
      let sources: VetLineSource[] = evidence
        .filter((e) => usedIds.has(e.id))
        .map((e) => ({ id: e.id, title: e.title, url: e.url, origin: e.origin }));

      // If the model cited nothing specific but evidence exists, surface the top
      // sources anyway so the farmer can verify.
      if (sources.length === 0 && grounded) {
        sources = evidence
          .slice(0, 3)
          .map((e) => ({ id: e.id, title: e.title, url: e.url, origin: e.origin }));
      }

      // Confidence can never be "high" without grounding evidence.
      let confidence = output.confidence;
      if (!grounded && confidence === "high") confidence = "moderate";

      return { reply: output.reply, confidence, grounded, sources };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429")) {
        throw new Error("VetLine is busy right now. Please try again in a moment.");
      }
      if (msg.includes("402")) {
        throw new Error("AI credits are exhausted. Add credits to keep using VetLine.");
      }
      throw new Error("VetLine could not respond. Please try again.");
    }
  });
