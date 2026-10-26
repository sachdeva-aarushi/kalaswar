import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "./i18n";

/* Minimal typings for the Web Speech API (not in the standard DOM lib). */
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
  length: number;
}
interface SpeechRecognitionEventLike {
  results: { length: number; [i: number]: SpeechRecognitionResultLike };
}
interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => RecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type VoiceError = "unsupported" | "permission" | "no-speech" | "network" | "other";

export function useVoiceRecognition(lang: Lang) {
  const [supported] = useState<boolean>(() => getRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<VoiceError | null>(null);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const langRef = useRef(lang);
  langRef.current = lang;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("unsupported");
      return;
    }
    setError(null);
    setFinalTranscript("");
    setInterim("");
    const rec = new Ctor();
    recognitionRef.current = rec;
    rec.lang = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" }[langRef.current] ?? "en-IN";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      let fin = "";
      let inter = "";
      for (let i = 0; i < e.results.length; i += 1) {
        const r = e.results[i];
        if (!r) continue;
        if (r.isFinal) fin += r[0].transcript;
        else inter += r[0].transcript;
      }
      setFinalTranscript((prev) => prev + fin);
      setInterim(inter);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") setError("permission");
      else if (e.error === "no-speech") setError("no-speech");
      else if (e.error === "network") setError("network");
      else setError("other");
      setListening(false);
    };
    rec.onend = () => setListening(false);
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("other");
      setListening(false);
    }
  }, []);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
    },
    [],
  );

  return { supported, listening, finalTranscript, interim, error, start, stop, setError };
}

/** Speak a short response aloud; never records or retains audio. */
export function speak(text: string, lang: Lang): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" }[lang] ?? "en-IN";
    utter.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const prefix = lang === "hi" ? "hi" : lang === "mr" ? "mr" : "en";
    const match = voices.find((v) => v.lang?.toLowerCase().startsWith(prefix));
    if (match) utter.voice = match;
    window.speechSynthesis.speak(utter);
  } catch {
    /* speech synthesis unavailable — the visible text response still shows */
  }
}

export function clearSpeech(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
