import { useLang, type Lang } from "@/lib/i18n";

/**
 * Kalaswar wordmark: Devanagari name over a letterspaced Latin wordmark,
 * with a restrained peacock-feather motif. Pure text + inline SVG so the
 * mark stays crisp at every size and follows the language of the interface.
 */

const TONES = {
  burgundy: { main: "text-primary", dev: "text-terracotta", feather: "var(--color-primary)" },
  light: { main: "text-[oklch(0.96_0.012_85)]", dev: "text-gold", feather: "var(--color-gold)" },
} as const;

export function FeatherMark({ className, color }: { className?: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 24 44"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
    >
      {/* stem */}
      <path
        d="M12 42 C12 30 12 20 12 8"
        stroke={color ?? "currentColor"}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* plume */}
      <path
        d="M12 10 C5 12 3 20 8 26 C11 29.4 12 30 12 30 C12 30 13 29.4 16 26 C21 20 19 12 12 10 Z"
        stroke={color ?? "currentColor"}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* eye */}
      <circle cx="12" cy="20" r="3.2" fill={color ?? "currentColor"} />
      <circle cx="12" cy="20" r="1.3" fill="var(--color-background)" opacity="0.85" />
      {/* barbs */}
      <path
        d="M7 16 L4.6 13.4 M8.6 22.8 L5.6 21.6 M17 16 L19.4 13.4 M15.4 22.8 L18.4 21.6"
        stroke={color ?? "currentColor"}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({
  tone = "burgundy",
  size = "md",
  withFeather = true,
}: {
  tone?: keyof typeof TONES;
  size?: "sm" | "md" | "lg";
  withFeather?: boolean;
}) {
  const { lang } = useLang();
  const t = TONES[tone];
  const main =
    size === "lg" ? "text-3xl md:text-4xl" : size === "sm" ? "text-base" : "text-xl";
  const featherH = size === "lg" ? "h-9" : size === "sm" ? "h-5" : "h-6";

  return (
    <span className="inline-flex items-center gap-2.5 align-middle">
      {withFeather && (
        <FeatherMark className={`${featherH} w-auto shrink-0`} color={t.feather} />
      )}
      <span className="inline-flex flex-col leading-none">
        <span
          className={`font-display font-semibold tracking-[0.08em] ${main} ${t.main}`}
          lang={lang}
        >
          {lang === "hi" ? "कलास्वर" : "KALASWAR"}
        </span>
        <span
          className={`mt-1 text-[0.6rem] tracking-[0.34em] uppercase ${t.dev}`}
          aria-hidden="true"
        >
          {lang === "hi" ? "Her craft · Her voice" : "कला · स्वर"}
        </span>
      </span>
    </span>
  );
}

export function langName(lang: Lang): string {
  return lang === "hi" ? "हिंदी" : "English";
}
