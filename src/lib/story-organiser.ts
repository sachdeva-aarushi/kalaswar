import { createServerFn } from "@tanstack/react-start";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * Organises a maker's own raw notes into a readable story draft.
 * Strict honesty contract (enforced in the system prompt): the draft uses
 * only facts present in the notes — no invented history, traditions,
 * origins, certifications, materials, techniques or ethical claims. The
 * result is a DRAFT: the maker reviews, edits and approves every word
 * before anything is saved or published.
 */

const GATEWAY = "https://ai.gateway.lovable.dev";
const MODEL = "openai/gpt-6-astra";

const LANG_NAME: Record<string, string> = {
  en: "English",
  hi: "Hindi (Devanagari script)",
  mr: "Marathi (मराठी, Devanagari script)",
};

export interface OrganisedStory {
  title: string;
  body: string;
}

export const organiseStoryNotes = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    (d ?? {}) as { notes?: string; lang?: string; craft?: string },
  )
  .handler(async ({ data }): Promise<OrganisedStory> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured on the server.");

    const notes = (data.notes ?? "").trim();
    if (!notes) throw new Error("No notes to organise.");
    const langName = LANG_NAME[data.lang ?? "en"] ? LANG_NAME[data.lang ?? "en"] : "English";

    const provider = createOpenAI({
      baseURL: `${GATEWAY}/v1`,
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const system = [
      `You organise a craft maker's own spoken or typed notes into a short story for a marketplace product page.`,
      `HARD RULES: use ONLY facts present in the notes; never invent personal history, community traditions,`,
      `geographic origins, certifications, materials, techniques, sales numbers, or environmental or ethical claims.`,
      `If a detail is missing, simply do not mention it. Write simple sentences in ${langName} that a non-technical`,
      `reader can follow. Keep the story under 220 words. Reply in exactly this format:`,
      `TITLE: <a plain title, max 8 words>`,
      `BODY: <the story>`,
    ].join(" ");

    const result = await generateText({
      model: provider.responses(MODEL) as unknown as Parameters<typeof generateText>[0]["model"],
      system,
      prompt: `Maker's craft: ${data.craft ?? "handcraft"}\n\nRaw notes from the maker:\n${notes}`,
      maxOutputTokens: 700,
    });

    const text = result.text.trim();
    const titleMatch = text.match(/^TITLE:\s*(.+)$/m);
    const bodyMatch = text.match(/^BODY:\s*([\s\S]+)$/m);
    const title = (titleMatch?.[1] ?? text.split("\n")[0] ?? "").trim();
    const body = (bodyMatch?.[1] ?? text.replace(/^TITLE:.*$/m, "")).trim();
    if (!body) throw new Error("The draft came back empty — try again with a bit more detail.");
    return { title: title.slice(0, 90), body };
  });
