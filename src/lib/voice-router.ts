/**
 * Bounded voice command router for the artisan experience.
 * Pure function — no data access, no side effects — so it is testable.
 * Used as the offline fallback when the AI assistant is unreachable;
 * the AI assistant itself understands free-form questions in en/hi/mr.
 */

export type VoiceIntent =
  | "show_pending"
  | "show_in_production"
  | "show_ready"
  | "show_delivered"
  | "show_earnings"
  | "show_payments"
  | "open_help"
  | "switch_language_en"
  | "switch_language_hi"
  | "switch_language_mr"
  | "unknown";

const EN: Record<Exclude<VoiceIntent, "unknown">, string[]> = {
  show_pending: ["pending", "new order", "waiting", "unassigned"],
  show_in_production: ["in production", "production", "being made", "working on", "current work", "wip"],
  show_ready: ["ready", "dispatch", "packing", "finished but"],
  show_delivered: ["delivered", "completed", "shipped"],
  show_earnings: ["earning", "earnings", "income", "money", "paid", "payment"],
  show_payments: ["payment", "upi", "qr", "payout", "transfer"],
  open_help: ["help", "what can", "commands", "how do i", "guide"],
  switch_language_en: ["english", "inglish", "angrezi"],
  switch_language_hi: ["hindi", "हिंदी"],
  switch_language_mr: ["marathi", "मराठी"],
};

const HI: Record<Exclude<VoiceIntent, "unknown">, string[]> = {
  show_pending: ["लंबित", "नया ऑर्डर", "प्रतीक्षा", "इंतज़ार", "इंतजार"],
  show_in_production: ["उत्पादन", "बन रहे", "बन रहा", "काम चालू", "चालू ऑर्डर"],
  show_ready: ["तैयार", "भेजने", "रवाना", "पैकिंग"],
  show_delivered: ["डिलीवर", "पहुंच गए", "पहुँच गए", "पूरे हुए", "पूरा हुआ"],
  show_earnings: ["कमाई", "आमदनी", "आय"],
  show_payments: ["भुगतान", "पैसा", "यूपीआई", "क्यूआर"],
  open_help: ["मदद", "सहायता", "क्या कह", "कैसे"],
  switch_language_en: ["अंग्रेज़ी", "अंग्रेजी", "इंग्लिश"],
  switch_language_hi: ["हिंदी"],
  switch_language_mr: ["मराठी", "मराठि"],
};

const MR: Record<Exclude<VoiceIntent, "unknown">, string[]> = {
  show_pending: ["प्रलंबित", "नवीन ऑर्डर", "सुरू नाही", "प्रतीक्षा"],
  show_in_production: ["निर्मिती", "बनत आहे", "काम सुरू", "चालू ऑर्डर"],
  show_ready: ["तयार", "रवानगी", "पाठवणे", "पॅकिंग"],
  show_delivered: ["वितरित", "पोहोचले", "डिलिव्हर", "पूर्ण झाले"],
  show_earnings: ["कमाई", "उत्पन्न", "मिळालेले पैसे"],
  show_payments: ["पेमेंट", "देयक", "यूपीआय", "क्यूआर"],
  open_help: ["मदत", "मार्गदर्शन", "कसे"],
  switch_language_en: ["इंग्रजी", "इंग्लिश"],
  switch_language_hi: ["हिंदी"],
  switch_language_mr: ["मराठी", "मराठि"],
};

export function routeCommand(rawInput: string): VoiceIntent {
  const text = (rawInput || "").toLowerCase().trim();
  if (!text) return "unknown";

  // Language switching is unambiguous enough to check first.
  // Note: \b word boundaries do not work around Devanagari script.
  if (/\b(english|inglish|angrezi)\b/.test(text) || /अंग्रेज़ी|अंग्रेजी|इंग्लिश|इंग्रजी/.test(text)) {
    return "switch_language_en";
  }
  if (/\bhindi\b/.test(text) || text.includes("हिंदी") || text.includes("हिंदि")) {
    return "switch_language_hi";
  }
  if (/\bmarathi\b/.test(text) || text.includes("मराठी") || text.includes("मराठि")) {
    return "switch_language_mr";
  }

  // Priority order matters: "ready for dispatch" must not match "delivered" first.
  const priority: Exclude<VoiceIntent, "unknown">[] = [
    "open_help",
    "show_earnings",
    "show_payments",
    "show_in_production",
    "show_ready",
    "show_delivered",
    "show_pending",
  ];

  for (const intent of priority) {
    const words = [...MR[intent], ...HI[intent], ...EN[intent]];
    if (words.some((w) => text.includes(w))) return intent;
  }

  // Fallback: bare "orders" means the most common question — pending work.
  if (/\borders?\b|ऑर्डर/.test(text)) return "show_pending";
  return "unknown";
}
