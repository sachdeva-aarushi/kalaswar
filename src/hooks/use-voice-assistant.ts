import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { recordWav } from "@/lib/record-wav";
import { streamSpeech } from "@/lib/stream-speech";
import { speak, clearSpeech } from "@/lib/speech";

export type AssistantStatus = "idle" | "recording" | "transcribing" | "thinking" | "speaking";
export type AssistantError = "unsupported" | "permission" | "listen" | "assistant";

export interface HistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export interface NavigateAction {
  screen: string;
  productId: string | null;
}

interface Options {
  lang: Lang;
  artisanId: string;
  onNavigate?: (screen: string, productId?: string | null) => void;
}

/**
 * Voice-first agent pipeline: record → transcribe → act → speak → listen again.
 * Hands-free by default: after speaking a reply the microphone opens itself,
 * so she can hold a continuous conversation (adding a product, asking about
 * shipments) without touching the phone. "End conversation" closes the loop.
 * A typed question uses the same pipeline — voice is never the only path.
 * Audio is uploaded for transcription only, never stored.
 */
export function useVoiceAssistant({ lang, artisanId, onNavigate }: Options) {
  const [status, setStatus] = useState<AssistantStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState<AssistantError | null>(null);
  const [handsFree, setHandsFree] = useState(false);
  const recorderRef = useRef<{ stop: () => Promise<File> } | null>(null);
  const speechAbort = useRef<AbortController | null>(null);
  const historyRef = useRef<HistoryTurn[]>([]);
  const langRef = useRef(lang);
  langRef.current = lang;
  const artisanRef = useRef(artisanId);
  artisanRef.current = artisanId;
  const navigateRef = useRef(onNavigate);
  navigateRef.current = onNavigate;
  const handsFreeRef = useRef(false);
  const startRef = useRef<() => void>(() => {});

  const start = useCallback(() => {
    if (recorderRef.current) return; // already recording
    handsFreeRef.current = true;
    setHandsFree(true);
    void (async () => {
      try {
        recorderRef.current = await recordWav();
        setStatus("recording");
      } catch (err) {
        const name = (err as Error)?.name ?? "";
        if (name === "NotAllowedError" || name === "SecurityError") setError("permission");
        else setError("unsupported");
        handsFreeRef.current = false;
        setHandsFree(false);
        setStatus("idle");
      }
    })();
  }, []);

  startRef.current = start;

  const submit = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTranscript(trimmed);
    setError(null);
    setStatus("thinking");
    try {
      const res = await fetch("/api/public/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artisanId: artisanRef.current,
          lang: langRef.current,
          text: trimmed,
          history: historyRef.current,
        }),
      });
      if (!res.ok) throw new Error(`assistant ${res.status}`);
      const data = (await res.json()) as { reply: string; navigate: NavigateAction | null };
      const turn: HistoryTurn[] = [
        { role: "user", content: trimmed },
        { role: "assistant", content: data.reply },
      ];
      historyRef.current = [...historyRef.current, ...turn].slice(-12);
      setReply(data.reply);
      if (data.navigate) navigateRef.current?.(data.navigate.screen, data.navigate.productId);
      setStatus("speaking");
      speechAbort.current = new AbortController();
      try {
        await streamSpeech(data.reply, langRef.current, speechAbort.current.signal);
      } catch (speechErr) {
        if ((speechErr as Error)?.name === "AbortError") throw speechErr;
        // Browser synthesis fallback — the answer text is always visible too.
        speak(data.reply, langRef.current);
      }
      setStatus("idle");
      // Hands-free: open the microphone again so she can simply keep talking.
      if (handsFreeRef.current) startRef.current();
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setError("assistant");
      handsFreeRef.current = false;
      setHandsFree(false);
      setStatus("idle");
    }
  }, []);

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;
    setStatus("transcribing");
    try {
      const file = await recorder.stop();
      const form = new FormData();
      form.append("file", file);
      form.append("languages", langRef.current);
      const res = await fetch("/api/public/stt", { method: "POST", body: form });
      if (!res.ok) throw new Error(`stt ${res.status}`);
      const data = (await res.json()) as { text?: string; error?: string };
      if (!data.text) throw new Error(data.error ?? "empty transcript");
      await submit(data.text);
    } catch {
      setError("listen");
      handsFreeRef.current = false;
      setHandsFree(false);
      setStatus("idle");
    }
  }, [submit]);

  /** Close the hands-free loop: stop listening and stay quiet. */
  const end = useCallback(() => {
    handsFreeRef.current = false;
    setHandsFree(false);
    clearSpeech();
    speechAbort.current?.abort();
    const recorder = recorderRef.current;
    if (recorder) {
      recorderRef.current = null;
      recorder
        .stop()
        .then(() => setStatus("idle"))
        .catch(() => setStatus("idle"));
    }
    setStatus((s) => (s === "idle" ? "idle" : s));
    if (!recorderRef.current && !speechAbort.current) setStatus("idle");
  }, []);

  /** Stop speaking immediately (mic doubles as an interrupt while talking). */
  const hush = useCallback(() => {
    clearSpeech();
    speechAbort.current?.abort();
  }, []);

  useEffect(
    () => () => {
      clearSpeech();
      speechAbort.current?.abort();
    },
    [],
  );

  return {
    busy: status !== "idle",
    listening: status === "recording",
    status,
    transcript,
    reply,
    error,
    handsFree,
    start,
    stop,
    submit,
    end,
    hush,
    clearError: () => setError(null),
  };
}
