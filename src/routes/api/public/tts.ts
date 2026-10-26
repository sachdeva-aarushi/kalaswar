import { createFileRoute } from "@tanstack/react-router";
import { forwardLovableAiGatewayHeaders } from "@/lib/ai/gateway.server";

/**
 * POST /api/public/tts — { text, lang } → streamed speech audio (SSE).
 * Gemini native body; deltas carry base64 24 kHz 16-bit mono PCM.
 */

const GATEWAY = "https://ai.gateway.lovable.dev";
const SPEECH_MODEL = "google/gemini-3.1-flash-tts-preview";
const VOICE = "Kore";
const MAX_TEXT_CHARS = 4000;

const LANG_CODES: Record<string, string> = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };

export const Route = createFileRoute("/api/public/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return Response.json({ error: "Speech service is not configured." }, { status: 500 });

        let body: { text?: string; lang?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "Invalid request body." }, { status: 400 });
        }

        const text = (body.text ?? "").slice(0, MAX_TEXT_CHARS).trim();
        if (!text) return Response.json({ error: "Nothing to speak." }, { status: 400 });
        const lang = body.lang && LANG_CODES[body.lang] ? body.lang : "en";

        // Put tone/pacing steering in the spoken text itself (gateway strips systemInstruction).
        const spoken = `Say warmly and clearly, at a calm, unhurried pace: ${text}`;

        let upstream: Response;
        try {
          upstream = await fetch(`${GATEWAY}/v1/audio/speech`, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: SPEECH_MODEL,
              contents: [{ role: "user", parts: [{ text: spoken }] }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
              },
              stream_format: "sse",
            }),
            signal: request.signal,
          });
        } catch {
          return Response.json({ error: "Speech service is temporarily unavailable." }, { status: 502 });
        }

        if (!upstream.ok || !upstream.body) {
          const message = await upstream.text().catch(() => "");
          return new Response(message || "Speech failed.", { status: upstream.status || 502 });
        }

        const headers = forwardLovableAiGatewayHeaders(upstream.headers, {
          "Content-Type": upstream.headers.get("content-type") ?? "text/event-stream",
          "Cache-Control": "no-store",
        });
        return new Response(upstream.body, { status: upstream.status, headers });
      },
    },
  },
});
