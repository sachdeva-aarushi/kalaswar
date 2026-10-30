/**
 * /dev/whatsapp — Developer Artisan WhatsApp Bot Simulator
 *
 * Simulates the artisan conversational listing journey:
 * 1. Upload Craft Photo (calls POST /api/v1/internal/whatsapp/media)
 * 2. Record/Send Voice Note (calls POST /api/v1/internal/whatsapp/voice)
 * 3. Review FairPrice & Press Approve (calls POST /api/v1/internal/whatsapp/approve)
 *
 * Authenticates with internal service token from env.
 * Enforces unique whatsapp_message_id per outgoing action.
 * Strictly adheres to coordinator-validation rule: approval leaves draft in pending_validation.
 */

import React, { useState, useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  uploadArtisanMedia,
  processArtisanVoice,
  approveArtisanDraft,
  getArtisanSession,
  type MediaUploadResponse,
  type VoiceProcessResponse,
  type ApproveResponse,
  type SessionDetailResponse,
} from "@/features/whatsapp/api";
import {
  Send,
  Mic,
  Camera,
  Image as ImageIcon,
  Check,
  CheckCheck,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Key,
  Phone,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Coins,
  Play,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import kwAppCss from "@/kw-app.css?url";

export const Route = createFileRoute("/dev/whatsapp")({
  head: () => ({
    meta: [
      { title: "Dev — WhatsApp Artisan Simulator | Kalaswar" },
      { name: "description", content: "Developer-only sandbox to simulate the WhatsApp artisan listing pipeline." },
    ],
  }),
  component: DevWhatsAppComponent,
});

// Helper to generate fresh WhatsApp Meta Message IDs (wamid)
function generateWamid(): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  return `wamid.HBgL${timestamp}.${randomSuffix}`;
}

interface ChatMessage {
  id: string;
  sender: "artisan" | "bot" | "system";
  text?: string;
  imageUrl?: string;
  isAudio?: boolean;
  audioDuration?: string;
  timestamp: string;
  wamid?: string;
  buttons?: Array<{ id: string; title: string }>;
  fairPrice?: {
    suggested: number;
    artisanEarnings: number;
    materialCost: number;
  };
  watermarkedImage?: string;
  newStatus?: string;
}

const DEFAULT_PHONE = "+919876543210";

// Preset photos for rapid testing
const PRESET_PHOTOS = [
  {
    name: "Kantha Silk Cushion Cover",
    url: "https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/cushion_01.jpg",
    caption: "हाथ से बना कांथा सिल्क कुशन कवर (Hand-embroidered Kantha silk cushion cover)",
  },
  {
    name: "Bidriware Silver Inlay Vase",
    url: "https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/bidri_01.jpg",
    caption: "बिदरी हस्तशिल्प फूलदान (Bidriware handcrafted floral vase)",
  },
  {
    name: "Chanderi Handloom Scarf",
    url: "https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/sari_01.jpg",
    caption: "चंदेरी रेशम दुपट्टा (Chanderi handloom silk dupatta)",
  },
];

// Preset voice transcripts for testing
const PRESET_VOICE_NOTES = [
  {
    label: "Complete Information (Bengali/Hindi)",
    transcript:
      "नमस्ते, मैंने हाथ से कढ़ाया हुआ कांथा सिल्क कुशन कवर बनाया है। इसमें शुद्ध मुर्शिदाबाद रेशम और सूती धागे का काम है। रंग लाल और नीला है। इसे पूरा करने में 4 घंटे लगे।",
    desc: "Provides craft, materials, colour, and 4 hours labour.",
  },
  {
    label: "Honesty Gate Test (Missing Materials)",
    transcript:
      "नमस्ते, यह एक बहुत सुंदर हस्तनिर्मित उत्पाद है।",
    desc: "Missing materials and craft details. Bot will honestly ask a follow-up question.",
  },
];

function DevWhatsAppComponent() {
  // Service token resolution from env or override
  const envServiceToken =
    (typeof import.meta !== "undefined" &&
      (import.meta.env?.VITE_INTERNAL_SERVICE_TOKEN ||
        import.meta.env?.VITE_INTERNAL_SERVICE_KEY)) ||
    "kalaswar_internal_service_secret_token";

  const [serviceToken, setServiceToken] = useState<string>(envServiceToken);
  const [phone, setPhone] = useState<string>(DEFAULT_PHONE);
  const [showConfig, setShowConfig] = useState(false);

  // Workflow state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0);
  const [caption, setCaption] = useState(PRESET_PHOTOS[0].caption);
  const [customPhotoUrl, setCustomPhotoUrl] = useState("");
  const [selectedVoiceIdx, setSelectedVoiceIdx] = useState(0);
  const [customVoiceText, setCustomVoiceText] = useState("");
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<unknown>(null);

  // Messages thread
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init-system",
      sender: "system",
      text: "🔒 Kalaswar Karigar Saathi Internal Pipeline Active. Connected to FastAPI /api/v1/internal/whatsapp endpoints.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
    {
      id: "bot-greeting",
      sender: "bot",
      text: "नमस्ते! कलास्वर कारीगर साथी में आपका स्वागत है। अपने नए हस्तशिल्प की लिस्टिंग शुरू करने के लिए कृपया उत्पाद की एक साफ़ फोटो भेजें। 📸",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update caption when preset changes
  const handleSelectPresetPhoto = (idx: number) => {
    setSelectedPhotoIdx(idx);
    setCaption(PRESET_PHOTOS[idx].caption);
    setCustomPhotoUrl("");
  };

  // STEP 1: Send Photo to WhatsApp Bot
  const handleSendPhoto = async () => {
    setLastError(null);
    setIsSubmitting(true);

    const wamid = generateWamid();
    const photoUrl = customPhotoUrl.trim() || PRESET_PHOTOS[selectedPhotoIdx].url;
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Append outgoing message
    const outgoingMsg: ChatMessage = {
      id: `artisan-photo-${Date.now()}`,
      sender: "artisan",
      imageUrl: photoUrl,
      text: caption,
      timestamp: nowTime,
      wamid,
    };
    setMessages((prev) => [...prev, outgoingMsg]);

    try {
      const res = await uploadArtisanMedia(
        {
          phone,
          media_url: photoUrl,
          caption,
          whatsapp_message_id: wamid,
        },
        serviceToken,
      );

      setLastResponse(res);

      // Bot prompt reply
      const botReply: ChatMessage = {
        id: `bot-reply-${Date.now()}`,
        sender: "bot",
        text: res.prompt_text_hi || "नमस्ते! तस्वीर मिल गई है। कृपया वॉइस नोट भेजकर बताएं कि यह क्या है?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        wamid: res.whatsapp_message_id,
      };

      setMessages((prev) => [...prev, botReply]);
      setCurrentStep(2);
    } catch (err: unknown) {
      const errMsg = (err as { detail?: string; message?: string })?.detail || (err as Error)?.message || "Failed to upload media via internal endpoint.";
      setLastError(errMsg);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "system",
          text: `⚠️ API Error: ${errMsg}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 2: Send Voice Note to WhatsApp Bot
  const handleSendVoice = async () => {
    setLastError(null);
    setIsSubmitting(true);

    const wamid = generateWamid();
    const voiceText = customVoiceText.trim() || PRESET_VOICE_NOTES[selectedVoiceIdx].transcript;
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Outgoing audio message bubble
    const outgoingMsg: ChatMessage = {
      id: `artisan-voice-${Date.now()}`,
      sender: "artisan",
      isAudio: true,
      audioDuration: "0:14",
      text: `🎤 "${voiceText}"`,
      timestamp: nowTime,
      wamid,
    };
    setMessages((prev) => [...prev, outgoingMsg]);

    try {
      const res = await processArtisanVoice(
        {
          phone,
          audio_id: "demo_audio",
          language: "hi",
          whatsapp_message_id: wamid,
        },
        serviceToken,
      );

      setLastResponse(res);
      if (res.draft_id) {
        setActiveDraftId(res.draft_id);
      }

      // Check if honesty gate triggered clarification
      if (res.needs_clarification || res.step === "needs_clarification") {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-clarification-${Date.now()}`,
            sender: "bot",
            text: res.hindi_text,
            buttons: res.interactive_buttons,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            wamid: res.whatsapp_message_id,
          },
        ]);
        return;
      }

      // Bot draft summary with fair price card and interactive buttons
      const botReply: ChatMessage = {
        id: `bot-voice-reply-${Date.now()}`,
        sender: "bot",
        text: res.hindi_text,
        buttons: res.interactive_buttons,
        fairPrice: res.fair_price
          ? {
              suggested: res.fair_price.suggested_price,
              artisanEarnings: res.fair_price.artisan_earnings,
              materialCost: res.fair_price.material_cost,
            }
          : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        wamid: res.whatsapp_message_id,
      };

      setMessages((prev) => [...prev, botReply]);
      setCurrentStep(3);
    } catch (err: unknown) {
      const errMsg = (err as { detail?: string; message?: string })?.detail || (err as Error)?.message || "Failed to process voice note.";
      setLastError(errMsg);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "system",
          text: `⚠️ API Error: ${errMsg}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 3: Press Approve Button
  const handleApproveDraft = async (buttonId: string = "btn_approve") => {
    setLastError(null);
    setIsSubmitting(true);

    const wamid = generateWamid();
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Outgoing button click
    const outgoingMsg: ChatMessage = {
      id: `artisan-btn-${Date.now()}`,
      sender: "artisan",
      text: buttonId === "btn_approve" ? "✅ मंजूर करें / Approve & Publish" : "✏️ बदलाव करें / Edit",
      timestamp: nowTime,
      wamid,
    };
    setMessages((prev) => [...prev, outgoingMsg]);

    try {
      const res = await approveArtisanDraft(
        {
          phone,
          button_id: buttonId,
          draft_id: activeDraftId || undefined,
          whatsapp_message_id: wamid,
        },
        serviceToken,
      );

      setLastResponse(res);

      // Bot confirmation reply
      const botReply: ChatMessage = {
        id: `bot-approve-reply-${Date.now()}`,
        sender: "bot",
        text: `${res.hindi_text}\n\n🏷️ स्थिति: ${res.new_status} (समन्वयक समीक्षा प्रतीक्षित)\n🛡️ GI वॉटरमार्क तैयार है।`,
        watermarkedImage: res.watermarked_image_url || undefined,
        newStatus: res.new_status,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        wamid: res.whatsapp_message_id,
      };

      setMessages((prev) => [...prev, botReply]);
      setCurrentStep(4);
    } catch (err: unknown) {
      const errMsg = (err as { detail?: string; message?: string })?.detail || (err as Error)?.message || "Failed to process draft approval.";
      setLastError(errMsg);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "system",
          text: `⚠️ API Error: ${errMsg}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset conversation to initial state
  const handleResetConversation = () => {
    setCurrentStep(1);
    setActiveDraftId(null);
    setLastError(null);
    setLastResponse(null);
    setMessages([
      {
        id: "init-system",
        sender: "system",
        text: "🔒 Kalaswar Karigar Saathi Internal Pipeline Active. Connected to FastAPI /api/v1/internal/whatsapp endpoints.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      {
        id: "bot-greeting",
        sender: "bot",
        text: "नमस्ते! कलास्वर कारीगर साथी में आपका स्वागत है। अपने नए हस्तशिल्प की लिस्टिंग शुरू करने के लिए कृपया उत्पाद की एक साफ़ फोटो भेजें। 📸",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <>
      <link rel="stylesheet" href={kwAppCss} />
      <div className="kw-app min-h-screen bg-[#F0EDE9] text-[var(--kw-on-surface)] flex flex-col font-sans">
        {/* Top Developer Navigation Banner */}
        <div className="bg-[#1C1C19] text-white px-4 py-2.5 flex items-center justify-between text-xs flex-wrap gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold uppercase tracking-wider text-[10px]">
              DEV TOOL
            </span>
            <span className="font-semibold">WhatsApp Artisan Bot Simulator</span>
            <span className="text-white/60">·</span>
            <span className="text-white/80 font-mono text-[11px]">Phone: {phone}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowConfig((c) => !c)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-white text-[11px]"
            >
              <Key className="size-3" />
              <span>Service Token &amp; Phone</span>
            </button>

            <button
              type="button"
              onClick={handleResetConversation}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-white text-[11px]"
              title="Reset Chat Session"
            >
              <RotateCcw className="size-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Expandable Configuration Drawer */}
        {showConfig && (
          <div className="bg-white border-b border-[var(--kw-outline-variant)] p-4 max-w-4xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs shadow-md animate-in slide-in-from-top duration-150">
            <div>
              <label className="font-semibold block mb-1 text-[var(--kw-on-surface)]">
                X-Service-Token (from env or custom)
              </label>
              <input
                type="text"
                aria-label="X-Service-Token"
                value={serviceToken}
                onChange={(e) => setServiceToken(e.target.value)}
                className="w-full h-8 px-2.5 rounded border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-low)] font-mono text-xs"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1 text-[var(--kw-on-surface)]">
                Artisan E.164 Phone Number
              </label>
              <input
                type="text"
                aria-label="Artisan E.164 Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-8 px-2.5 rounded border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-low)] font-mono text-xs"
              />
            </div>
          </div>
        )}

        {/* Main Workspace: Simulator Grid */}
        <main className="flex-1 max-w-[1200px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Realistic WhatsApp Phone Mockup (7 cols) */}
          <div className="lg:col-span-7 flex flex-col h-[750px] bg-[#EFEAE2] rounded-2xl shadow-xl overflow-hidden border border-[#D1D7DB]">
            {/* WhatsApp Phone Header Bar */}
            <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-white shadow-xs border border-white/20">
                  कला
                </div>
                <div>
                  <h3 className="font-semibold text-sm leading-tight">
                    कलास्वर कारीगर साथी (Kalaswar)
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    Online · Internal Pipeline Active
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-200 border border-emerald-600/50">
                  Step {currentStep} of 3
                </span>
              </div>
            </div>

            {/* Chat Thread Messages Area */}
            <div
              data-testid="whatsapp-chat-thread"
              className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#EFEAE2] bg-[radial-gradient(#DFD8CE_1px,transparent_1px)] [background-size:16px_16px]"
            >
              {messages.map((msg) => {
                if (msg.sender === "system") {
                  return (
                    <div key={msg.id} className="text-center my-2">
                      <span className="inline-block px-3 py-1 rounded-lg bg-[#FFF3C4] text-[#7A5B04] text-[11px] shadow-2xs max-w-sm">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                const isArtisan = msg.sender === "artisan";

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isArtisan ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-lg p-2.5 shadow-xs text-xs space-y-2 ${
                        isArtisan
                          ? "bg-[#DCF8C6] text-[#111B21] rounded-tr-none"
                          : "bg-white text-[#111B21] rounded-tl-none border border-[#E9EDEF]"
                      }`}
                    >
                      {/* Image asset if sent */}
                      {msg.imageUrl && (
                        <div className="rounded overflow-hidden border border-black/10">
                          <img
                            src={msg.imageUrl}
                            alt="Uploaded craft"
                            className="w-full max-h-48 object-cover"
                          />
                        </div>
                      )}

                      {/* Audio note indicator */}
                      {msg.isAudio && (
                        <div className="flex items-center gap-2 p-1.5 rounded bg-emerald-100/60 text-emerald-950">
                          <div className="size-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <Play className="size-3.5 fill-current ml-0.5" />
                          </div>
                          <div className="flex-1">
                            <div className="h-1.5 w-full bg-emerald-300 rounded-full overflow-hidden">
                              <div className="h-full w-2/3 bg-emerald-700 rounded-full" />
                            </div>
                            <span className="text-[10px] text-emerald-800">{msg.audioDuration}</span>
                          </div>
                        </div>
                      )}

                      {/* Text content */}
                      {msg.text && (
                        <p className="whitespace-pre-line leading-relaxed text-[12.5px]">
                          {msg.text}
                        </p>
                      )}

                      {/* FairPrice card if bot sent pricing breakdown */}
                      {msg.fairPrice && (
                        <div className="mt-2 p-2.5 rounded bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                          <div className="flex items-center justify-between font-semibold text-emerald-900 border-b border-emerald-200 pb-1">
                            <span>उचित मूल्य अनुमान (FairPrice)</span>
                            <span className="tabular-nums">₹{msg.fairPrice.suggested}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-emerald-800">
                            <span>कारीगर की सीधी आय (Artisan Earnings):</span>
                            <span className="font-bold tabular-nums">₹{msg.fairPrice.artisanEarnings}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-emerald-700">
                            <span>कच्ची सामग्री लागत (Materials):</span>
                            <span className="tabular-nums">₹{msg.fairPrice.materialCost}</span>
                          </div>
                        </div>
                      )}

                      {/* Watermarked preview image on approval */}
                      {msg.watermarkedImage && (
                        <div className="mt-2 rounded overflow-hidden border border-emerald-300 shadow-xs">
                          <img
                            src={msg.watermarkedImage}
                            alt="Watermarked approved listing"
                            className="w-full max-h-44 object-cover"
                          />
                          <div className="bg-emerald-900 text-white text-[10px] px-2 py-1 flex items-center justify-between">
                            <span>GI Watermark Overlay Applied</span>
                            <span>Pending Validation</span>
                          </div>
                        </div>
                      )}

                      {/* Interactive Buttons (e.g. [मंजूर करें / Approve]) */}
                      {msg.buttons && msg.buttons.length > 0 && currentStep === 3 && (
                        <div className="pt-2 border-t border-[#E9EDEF] flex flex-col gap-1.5">
                          {msg.buttons.map((btn) => (
                            <button
                              key={btn.id}
                              type="button"
                              onClick={() => handleApproveDraft(btn.id)}
                              disabled={isSubmitting}
                              className={`w-full py-2 px-3 rounded font-medium text-xs text-center transition-colors shadow-2xs ${
                                btn.id === "btn_approve"
                                  ? "bg-[#00A884] hover:bg-[#069373] text-white font-semibold"
                                  : "bg-[#F0F2F5] hover:bg-[#E9EDEF] text-[#111B21]"
                              }`}
                            >
                              {btn.title}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Footer: Timestamp & Blue Ticks */}
                      <div className="flex items-center justify-end gap-1 text-[10px] text-[#667781] pt-0.5">
                        <span>{msg.timestamp}</span>
                        {isArtisan && <CheckCheck className="size-3.5 text-[#53BDEB]" />}
                      </div>
                    </div>

                    {/* Unique WAMID tracking badge under bubble */}
                    {msg.wamid && (
                      <span className="text-[9px] font-mono text-[#8696A0] px-1 mt-0.5 select-all">
                        {msg.wamid}
                      </span>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Input Preview Bar */}
            <div className="bg-[#F0F2F5] px-4 py-2.5 border-t border-[#D1D7DB] flex items-center gap-2 text-xs text-[#667781]">
              <span className="font-medium text-[#111B21]">Simulated Input:</span>
              <span className="italic">
                {currentStep === 1
                  ? "Select craft photo on the right to trigger Step 1."
                  : currentStep === 2
                  ? "Select or record voice note on the right to trigger Step 2."
                  : currentStep === 3
                  ? "Click [मंजूर करें / Approve] to trigger Step 3."
                  : "Listing pipeline complete! Draft submitted for coordinator review."}
              </span>
            </div>
          </div>

          {/* RIGHT: Pipeline Simulation Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Step Controls Card */}
            <div className="bg-white rounded-xl border border-[var(--kw-outline-variant)] shadow-sm p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-[var(--kw-outline-variant)]/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="size-6 rounded-full bg-[var(--kw-primary-container)] text-white text-xs font-bold flex items-center justify-center">
                    {currentStep}
                  </span>
                  <h2 className="kw-headline-sm text-sm font-semibold text-[var(--kw-on-surface)]">
                    {currentStep === 1
                      ? "Step 1: Ingest Artisan Photo"
                      : currentStep === 2
                      ? "Step 2: Parse Voice Note & Auto-Draft"
                      : currentStep === 3
                      ? "Step 3: Approve & GI Watermark"
                      : "Listing Pipeline Completed"}
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-[var(--kw-secondary)]">
                  Phone: {phone}
                </span>
              </div>

              {/* STEP 1 CONTROLS */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <p className="text-xs text-[var(--kw-on-surface-variant)] leading-relaxed">
                    Ingests product photo from WhatsApp. Generates authentic Hindi audio prompt asking for craft and materials.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--kw-on-surface)]">
                      Select Specimen Preset Photo:
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {PRESET_PHOTOS.map((p, idx) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => handleSelectPresetPhoto(idx)}
                          className={`p-2.5 rounded-[var(--kw-radius)] text-left border flex items-center gap-3 transition-colors ${
                            selectedPhotoIdx === idx && !customPhotoUrl
                              ? "border-[var(--kw-primary-container)] bg-[var(--kw-surface-container-low)]"
                              : "border-[var(--kw-outline-variant)]/60 hover:bg-[var(--kw-surface-container-low)]"
                          }`}
                        >
                          <img src={p.url} alt={p.name} className="size-10 rounded object-cover shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate text-[var(--kw-on-surface)]">{p.name}</p>
                            <p className="text-[11px] text-[var(--kw-on-surface-variant)] truncate">{p.caption}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="whatsapp-custom-photo" className="text-xs font-semibold text-[var(--kw-on-surface)]">
                      Or Custom Image URL:
                    </label>
                    <input
                      id="whatsapp-custom-photo"
                      type="text"
                      placeholder="https://..."
                      value={customPhotoUrl}
                      onChange={(e) => setCustomPhotoUrl(e.target.value)}
                      aria-label="Custom image URL"
                      className="w-full h-8 px-2.5 rounded border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-low)] text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="whatsapp-photo-caption" className="text-xs font-semibold text-[var(--kw-on-surface)]">
                      Caption:
                    </label>
                    <input
                      id="whatsapp-photo-caption"
                      type="text"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      aria-label="Photo caption in Hindi or English"
                      className="w-full h-8 px-2.5 rounded border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-low)] text-xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSendPhoto}
                    disabled={isSubmitting}
                    data-testid="send-whatsapp-photo-btn"
                    className="w-full py-2.5 rounded-[6px] bg-[#075E54] hover:bg-[#128C7E] text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Camera className="size-4" />
                    <span>{isSubmitting ? "Uploading via internal API…" : "Send Photo to Bot 📸"}</span>
                  </button>
                </div>
              )}

              {/* STEP 2 CONTROLS */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <p className="text-xs text-[var(--kw-on-surface-variant)] leading-relaxed">
                    Simulate artisan audio note in Hindi. Transcribes via STT, extracts structured craft attributes via LLM, enforces honesty gate, and generates FairPrice breakdown.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--kw-on-surface)]">
                      Select Voice Note Script:
                    </label>
                    <div className="space-y-2">
                      {PRESET_VOICE_NOTES.map((vn, idx) => (
                        <button
                          key={vn.label}
                          type="button"
                          onClick={() => {
                            setSelectedVoiceIdx(idx);
                            setCustomVoiceText("");
                          }}
                          className={`w-full p-2.5 rounded text-left border transition-colors ${
                            selectedVoiceIdx === idx && !customVoiceText
                              ? "border-[var(--kw-primary-container)] bg-[var(--kw-surface-container-low)]"
                              : "border-[var(--kw-outline-variant)]/60 hover:bg-[var(--kw-surface-container-low)]"
                          }`}
                        >
                          <p className="text-xs font-semibold text-[var(--kw-on-surface)]">{vn.label}</p>
                          <p className="text-[11px] text-[var(--kw-on-surface-variant)] italic mt-0.5">
                            "{vn.transcript}"
                          </p>
                          <p className="text-[10px] text-[var(--kw-secondary)] mt-1">{vn.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendVoice}
                    disabled={isSubmitting}
                    data-testid="send-whatsapp-voice-btn"
                    className="w-full py-2.5 rounded-[6px] bg-[#075E54] hover:bg-[#128C7E] text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Mic className="size-4" />
                    <span>{isSubmitting ? "Transcribing & calculating FairPrice…" : "Send Voice Note 🎤"}</span>
                  </button>
                </div>
              )}

              {/* STEP 3 CONTROLS */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <p className="text-xs text-[var(--kw-on-surface-variant)] leading-relaxed">
                    Artisan reviews FairPrice suggestion and presses <strong>"Approve"</strong>. Enforces the <strong>Coordinator-Validation rule</strong> (transitions to <code>pending_validation</code>).
                  </p>

                  {activeDraftId && (
                    <div className="p-3 rounded bg-[var(--kw-surface-container-low)] text-xs font-mono space-y-1">
                      <p className="text-[var(--kw-on-surface-variant)] text-[10px] uppercase">Active Draft ID:</p>
                      <p className="font-semibold text-[var(--kw-primary-container)] select-all">{activeDraftId}</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleApproveDraft("btn_approve")}
                      disabled={isSubmitting}
                      data-testid="approve-whatsapp-draft-btn"
                      className="w-full py-2.5 rounded-[6px] bg-[#00A884] hover:bg-[#069373] text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="size-4" />
                      <span>{isSubmitting ? "Approving draft…" : "Press [मंजूर करें / Approve]"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApproveDraft("btn_edit")}
                      disabled={isSubmitting}
                      className="w-full py-2 rounded-[6px] border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-lowest)] text-xs text-[var(--kw-on-surface)] hover:bg-[var(--kw-surface-container-low)] transition-colors"
                    >
                      Press [बदलाव करें / Edit Details]
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: COMPLETED SUMMARY */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <CheckCircle2 className="size-5 text-emerald-600" />
                      <span>Artisan Submission Completed!</span>
                    </div>
                    <p className="leading-relaxed">
                      The listing draft was approved by the artisan and strictly transitioned to{" "}
                      <code className="font-bold bg-emerald-100 px-1 rounded">pending_validation</code>.
                      It is now awaiting cluster coordinator validation before publishing.
                    </p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p className="font-semibold text-[var(--kw-on-surface)]">Next Verification Steps:</p>
                    <Link
                      to="/workroom/products"
                      className="w-full p-2.5 rounded bg-[var(--kw-primary-container)] hover:bg-[#84485A] text-white flex items-center justify-between font-semibold transition-colors shadow-xs"
                    >
                      <span>1. Go to Coordinator Validation Queue</span>
                      <ArrowRight className="size-4" />
                    </Link>

                    <Link
                      to="/passport/$token"
                      params={{ token: "dpp-demo-kantha-001" }}
                      className="w-full p-2.5 rounded border border-[var(--kw-outline-variant)] bg-white hover:bg-[var(--kw-surface-container-low)] text-[var(--kw-on-surface)] flex items-center justify-between font-semibold transition-colors"
                    >
                      <span>2. View Public Craft Passport Demo</span>
                      <ExternalLink className="size-4 text-[var(--kw-secondary)]" />
                    </Link>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetConversation}
                    className="w-full py-2 rounded text-xs text-[var(--kw-secondary)] hover:underline flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Simulate another artisan conversation</span>
                  </button>
                </div>
              )}
            </div>

            {/* API Diagnostic Inspector Card */}
            <div className="bg-white rounded-xl border border-[var(--kw-outline-variant)] shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="kw-label-eyebrow uppercase text-[var(--kw-on-surface-variant)] text-xs font-semibold tracking-wider">
                  Live API Diagnostic Output
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                  HTTP 200
                </span>
              </div>

              {lastError ? (
                <div className="p-3 rounded bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2">
                  <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" />
                  <p>{lastError}</p>
                </div>
              ) : lastResponse ? (
                <pre className="p-3 rounded bg-[var(--kw-surface-container-lowest)] border border-[var(--kw-outline-variant)]/60 text-[11px] font-mono text-[var(--kw-on-surface)] overflow-x-auto max-h-48">
                  {JSON.stringify(lastResponse, null, 2)}
                </pre>
              ) : (
                <p className="text-xs text-[var(--kw-on-surface-variant)] italic">
                  Run a step above to inspect JSON response payloads from the FastAPI backend.
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
