import { createFileRoute } from "@tanstack/react-router";

/**
 * POST /api/public/stt — multipart audio upload → transcript.
 * Forwards to the Lovable AI transcription endpoint; the key stays server-side.
 * The artisan turn is a single buffered transcript request, so streaming is off.
 */

const MAX_BODY_BYTES = 24 * 1024 * 1024; // endpoint cap is 25 MiB; leave headroom
const TRANSCRIBE_MODEL = "openai/gpt-transcribe";
const GATEWAY = "https://ai.gateway.lovable.dev";

function jsonError(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export const Route = createFileRoute("/api/public/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return jsonError(500, "Speech service is not configured.");

        const declared = Number(request.headers.get("content-length") ?? "0");
        if (declared && declared > MAX_BODY_BYTES) return jsonError(413, "Recording too large.");

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return jsonError(400, "Invalid audio upload.");
        }

        const file = form.get("file");
        if (!(file instanceof File) || file.size === 0) {
          return jsonError(400, "Missing audio recording.");
        }
        if (file.size > MAX_BODY_BYTES) return jsonError(413, "Recording too large.");

        const upstreamForm = new FormData();
        upstreamForm.append("model", TRANSCRIBE_MODEL);
        upstreamForm.append("file", file, file.name || "recording.wav");
        upstreamForm.append("response_format", "json");
        const languages = form.get("languages");
        if (typeof languages === "string" && languages.trim()) {
          for (const code of languages.split(",").map((c) => c.trim()).filter(Boolean)) {
            upstreamForm.append("languages", code);
          }
        }

        let upstream: Response;
        try {
          upstream = await fetch(`${GATEWAY}/v1/audio/transcriptions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: upstreamForm,
          });
        } catch {
          return jsonError(502, "Speech service is temporarily unavailable.");
        }

        // Pass upstream status/body through unchanged; a 400 must not become a 200.
        return new Response(upstream.body, {
          status: upstream.status,
          headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
        });
      },
    },
  },
});
