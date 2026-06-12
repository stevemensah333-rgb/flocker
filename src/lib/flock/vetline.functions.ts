import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MsgSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
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

const SYSTEM = `You are VetLine, a calm and practical poultry health adviser inside the Flock farm app.
You help small and medium poultry farmers (often in Africa) triage flock health issues.

Rules:
- Be concise and structured. Use short paragraphs or bullet points.
- Ask 1-2 clarifying questions when symptoms are vague before concluding.
- Give: likely causes, immediate actions, biosecurity steps, and when to call a vet.
- Prefer low-cost, locally-available interventions.
- ALWAYS include a brief safety note that this is guidance, not a substitute for an in-person veterinary diagnosis, when giving treatment advice.
- Never invent drug dosages you are unsure of; recommend confirming with a local vet or product label.`;

export const askVetLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured. Missing API key.");

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const { generateText } = await import("ai");

    const gateway = createLovableAiGatewayProvider(key);

    const flockNote = data.flock
      ? `\n\nFarmer's selected flock context: ${JSON.stringify(data.flock)}`
      : "";

    try {
      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system: SYSTEM + flockNote,
        messages: data.messages,
      });
      return { reply: text };
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
