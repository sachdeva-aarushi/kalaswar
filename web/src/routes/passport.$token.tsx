/**
 * /passport/$token — Digital Product Passport (DPP) Public Route
 *
 * Implements Stitch screens:
 * - Desktop Adaptation (C-01): `af53a0ca754c460eaa46a7924051fa19`
 * - Mobile Passport (C-01): `317239eac0a74f958badfa9117830aa4`
 * - Verification and Proof Details (C-04): `35990adbbe4c49f2ba6871c6fac6b970`
 * - Passport Not Found & Unverified (C-05): `86a967ee5846487caf394e7314c2fe3c`
 *
 * Public route: works without authentication.
 * All styling scoped under .kw-app.
 */

import React, { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  useDppPassport,
  useDppVerification,
  useDppProduct,
} from "@/features/dpp/hooks";
import { ProvenanceCertificate } from "@/components/passport/ProvenanceCertificate";
import { FairWageDonut } from "@/components/passport/FairWageDonut";
import { MerkleProofCard } from "@/components/passport/MerkleProofCard";
import { VerificationDetailsModal } from "@/components/passport/VerificationDetailsModal";
import { KwLoadingState, KwErrorState, KwSkeleton } from "@/components/kw-primitives";
import {
  Shield,
  QrCode,
  Layers,
  Sparkles,
  ArrowLeft,
  Search,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import kwAppCss from "@/kw-app.css?url";

export const Route = createFileRoute("/passport/$token")({
  head: () => ({
    meta: [
      { title: "Craft Passport — Kalaswar" },
      {
        name: "description",
        content:
          "Public immutable Digital Product Passport: maker story, craft origin, coarse GPS region, wage split, and Layer-2 blockchain provenance.",
      },
    ],
  }),
  component: PassportPage,
});

// Fallback high-res craft specimen photography for atelier presentation
const SPECIMEN_PHOTOS = [
  {
    src: "https://lh3.googleusercontent.com/aida/AEtjO1XmfT7nbzggA8hLLB_Qhx216L4CBZpekgFpISDbbF4MUN3eGM-AsCEzcilvw7FSi6hdpA6GvgKCptBKFgOIkUMlb_2zJa5Or62tmyf350vUUtif9ATiHW3VoRGkb4KtV4vvBlTb8kRmSefkPXhWlyrpWc9IPGUJNT9AhXQAP7yxi-_aFcokDOoR9aRwvidfhEI_QOlSRNVpGRzek66M-AMfhaodc4mONf6sgGdjDueA0A",
    caption: "Front embroidery angle with traditional Nakshi running stitches",
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBKtHuiMr7NyZtK5W4Kwn_5tgLKT7jdvDqTpdJ953pZf0EzksnIH10960y2aNaWxjUKmWTKUCn8DtQlwxDlTO7Q4M8rAXinA6PqqsMX_ZOIn3CQ6TX_LMOBY5tnWmnrprXQged9LSa0xeKpiFvnVOIzada575wv_IFiX0a8fP7A_tlW8gspQoY5tGilftuqCLg0IrcT7epbNuM58DD-i39b-0zd4z5H8RLS5fq1F8q7",
    caption: "Macro close-up of vegetable-dyed silk threads into organic cotton",
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAud7qO078OoSe3nUo91fyKbRTff5vs0zo2R9BLAd0Mq-FKsmVcLES-4ET-HSYwq7nWfPgoOQvbdDl81X2885nj6XNAYuncFvrBvASLzWkhJI73g_u0fBc4Yslu6zHSVyL_448O4EZv9dN35llOVBk7GT-8iiRAm7hK9qRNfQ43QVekMgXFwEJ6dDYK7cZaBto3lROk6G4fLM30Dr1q88qColrUg-_JYJ5w3tQ4Baps",
    caption: "Selvedge border finish and artisan workshop hand tools",
  },
];

function PassportPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();

  // Queries
  const { data: passport, isLoading, isError, error, refetch } = useDppPassport(token);
  const { data: verification, isLoading: isVerifying } = useDppVerification(token);
  const { data: product } = useDppProduct(passport?.product_id);

  // UI States
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [lang, setLang] = useState<"en" | "hi">("en");

  // Choose display image: product live image if provided, else specimen photos
  const activeImage =
    selectedImageIdx === 0 && product?.image_url
      ? product.image_url
      : SPECIMEN_PHOTOS[selectedImageIdx]?.src || SPECIMEN_PHOTOS[0].src;

  const handleSearchToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      navigate({ to: `/passport/$token`, params: { token: tokenInput.trim() } });
    }
  };

  return (
    <>
      <link rel="stylesheet" href={kwAppCss} />
      <div className="kw-app min-h-screen bg-[var(--kw-background)] text-[var(--kw-on-surface)] flex flex-col">
        {/* Public Header Bar */}
        <header className="sticky top-0 z-40 w-full bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[var(--kw-outline-variant)]/50 shadow-xs">
          <div className="max-w-[1280px] mx-auto h-14 px-4 sm:px-8 flex items-center justify-between">
            {/* Wordmark */}
            <div className="flex items-center gap-4">
              <Link to="/shop" className="flex items-baseline gap-1.5 group">
                <span className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-[var(--kw-primary-container)]">
                  Kalaswar
                </span>
                <span className="kw-label-eyebrow uppercase text-[10px] tracking-[0.18em] text-[var(--kw-secondary)] font-semibold ml-1">
                  Craft Passport
                </span>
              </Link>
            </div>

            {/* Public Navigation */}
            <nav className="hidden md:flex items-center gap-6 text-xs font-medium">
              <span className="text-[var(--kw-primary-container)] font-semibold border-b-2 border-[var(--kw-primary-container)] pb-0.5">
                Provenance
              </span>
              <Link to="/shop" className="text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)] transition-colors">
                Artisans
              </Link>
              <Link to="/shop" className="text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)] transition-colors">
                Catalog
              </Link>
              <Link to="/gift" className="text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)] transition-colors">
                Gift Concierge
              </Link>
            </nav>

            {/* Actions: Lang toggle & Help */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setLang((l) => (l === "en" ? "hi" : "en"))}
                aria-label="Toggle language"
                className="h-8 px-2.5 rounded-[var(--kw-radius)] border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-low)] hover:bg-[var(--kw-surface-container)] text-xs font-semibold text-[var(--kw-on-surface)] transition-colors"
              >
                {lang === "en" ? "हि / English" : "English / हि"}
              </button>

              <a
                href="/shop"
                className="h-8 px-3 rounded-[var(--kw-radius)] bg-[var(--kw-primary-container)] hover:bg-[#84485A] text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <span>Shop Crafts</span>
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-8 py-8 sm:py-10">
          {isLoading ? (
            <div
              className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start"
              role="status"
              aria-busy="true"
              aria-label="Resolving on-chain Craft Passport ledger"
            >
              <div className="lg:col-span-5 space-y-4">
                <KwSkeleton className="aspect-[4/5] w-full rounded-[var(--kw-radius-lg)]" />
                <div className="grid grid-cols-3 gap-3">
                  <KwSkeleton className="aspect-[4/3] rounded-[var(--kw-radius)]" />
                  <KwSkeleton className="aspect-[4/3] rounded-[var(--kw-radius)]" />
                  <KwSkeleton className="aspect-[4/3] rounded-[var(--kw-radius)]" />
                </div>
              </div>
              <div className="lg:col-span-7 space-y-6">
                <KwSkeleton className="h-8 w-3/4 rounded" />
                <KwSkeleton className="h-4 w-1/2 rounded" />
                <KwSkeleton className="h-28 w-full rounded-[var(--kw-radius-lg)]" />
                <KwSkeleton className="h-44 w-full rounded-[var(--kw-radius-lg)]" />
                <KwSkeleton className="h-40 w-full rounded-[var(--kw-radius-lg)]" />
              </div>
              <span className="sr-only">Resolving on-chain Craft Passport ledger…</span>
            </div>
          ) : isError || !passport ? (
            /* Stitch C-05: Passport Not Found & Unverified State */
            <div className="max-w-xl mx-auto py-12 text-center space-y-6">
              <div className="size-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
                <Shield className="size-8" aria-hidden="true" />
              </div>

              <div className="space-y-2">
                <span className="kw-label-eyebrow uppercase text-amber-800 tracking-wider font-semibold text-xs">
                  UNVERIFIED RECORD
                </span>
                <h1 className="kw-headline-lg font-serif text-[var(--kw-on-surface)]">
                  Passport Not Found
                </h1>
                <p className="kw-body-md text-[var(--kw-on-surface-variant)] max-w-md mx-auto">
                  The passport token{" "}
                  <code className="font-mono text-xs font-semibold bg-[var(--kw-surface-container-high)] px-1.5 py-0.5 rounded">
                    "{token}"
                  </code>{" "}
                  could not be resolved on the Polygon Amoy craft registry. It may have expired or is awaiting coordinator batch anchoring.
                </p>
              </div>

              {/* Try Demo Passports */}
              <div className="rounded-[var(--kw-radius-lg)] border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-lowest)] p-5 space-y-3 text-left">
                <p className="text-xs font-semibold text-[var(--kw-on-surface)] uppercase tracking-wider">
                  Try verified demo craft passports:
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/passport/$token", params: { token: "dpp-demo-kantha-001" } })}
                    className="p-3 rounded-[var(--kw-radius)] bg-[var(--kw-surface-container-low)] hover:bg-[var(--kw-surface-container-high)] transition-colors flex items-center justify-between text-left"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[var(--kw-on-surface)]">
                        Handcrafted Kantha Silk Cushion Cover
                      </p>
                      <p className="text-[11px] text-[var(--kw-on-surface-variant)]">
                        Token: dpp-demo-kantha-001 · Radha D. (Santiniketan)
                      </p>
                    </div>
                    <span className="text-xs text-[var(--kw-primary-container)] font-semibold">
                      View →
                    </span>
                  </button>
                </div>
              </div>

              {/* Search Another Token Form */}
              <form onSubmit={handleSearchToken} className="flex gap-2 max-w-md mx-auto">
                <input
                  type="text"
                  placeholder="Enter passport token (e.g. dpp-demo-kantha-001)"
                  aria-label="Enter craft passport token"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-[var(--kw-radius)] border border-[var(--kw-outline-variant)] bg-white text-xs text-[var(--kw-on-surface)] focus:outline-hidden focus:ring-2 focus:ring-[var(--kw-primary-container)]"
                />
                <button
                  type="submit"
                  className="h-10 px-4 rounded-[var(--kw-radius)] bg-[var(--kw-primary-container)] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Verify
                </button>
              </form>
            </div>
          ) : (
            /* Stitch C-01: Two-Column Master Grid Layout */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              {/* LEFT COLUMN: Sticky Specimen Imagery & Technique DNA (5 cols) */}
              <aside className="lg:col-span-5 lg:sticky lg:top-20 space-y-5">
                {/* Primary Craft Specimen Viewport */}
                <div className="relative bg-[var(--kw-surface-container-low)] rounded-[var(--kw-radius-lg)] border border-[var(--kw-outline-variant)]/60 shadow-sm overflow-hidden aspect-[4/5] flex items-center justify-center">
                  <img
                    id="main-craft-image"
                    data-testid="passport-main-image"
                    src={activeImage}
                    alt={passport.product_title}
                    className="w-full h-full object-cover transition-opacity duration-300"
                  />

                  {/* Tactile Counter Pill */}
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-xs rounded-full text-[11px] text-[var(--kw-on-surface)] font-medium tracking-wider shadow-xs">
                    <span>{selectedImageIdx + 1} of {SPECIMEN_PHOTOS.length}</span>
                  </div>

                  {/* Discrete Specimen Token Overlay */}
                  <div className="absolute top-3 right-3 px-2.5 py-1 bg-white/90 backdrop-blur-xs rounded-full text-[10px] text-[#B86B4B] font-mono uppercase tracking-[0.12em] font-semibold shadow-xs">
                    Token: {passport.token}
                  </div>
                </div>

                {/* Thumbnail Sequence Strip */}
                <div className="grid grid-cols-3 gap-3">
                  {SPECIMEN_PHOTOS.map((photo, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIdx(idx)}
                      aria-label={`View specimen angle ${idx + 1}: ${photo.caption}`}
                      className={`relative aspect-[4/3] rounded-[var(--kw-radius)] overflow-hidden border transition-all ${
                        selectedImageIdx === idx
                          ? "ring-2 ring-[var(--kw-primary-container)] border-transparent opacity-100 shadow-sm"
                          : "border-[var(--kw-outline-variant)]/60 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={photo.src}
                        alt={`Specimen angle ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>

                {/* Curator Caption */}
                <p className="kw-body-sm text-xs text-[var(--kw-on-surface-variant)] italic">
                  {SPECIMEN_PHOTOS[selectedImageIdx]?.caption}
                </p>

                {/* Technical Textile Matrix Mini-Panel */}
                <div className="rounded-[var(--kw-radius-lg)] bg-[var(--kw-surface-container-low)] border border-[var(--kw-outline-variant)]/60 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="kw-label-eyebrow uppercase text-[var(--kw-on-surface-variant)] text-[10px] font-semibold tracking-widest">
                      Technique Matrix
                    </span>
                    <span className="text-[10px] font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                      GI Registered
                    </span>
                  </div>
                  <p className="kw-body-sm text-xs text-[var(--kw-on-surface)] leading-relaxed">
                    Authentic {passport.craft_category}. Unbleached organic cotton base with traditional{" "}
                    <em className="font-medium text-[var(--kw-primary-container)]">kheta</em> and{" "}
                    <em className="font-medium text-[var(--kw-primary-container)]">dorokha</em> reverse-stitch.
                  </p>
                </div>

                {/* QR Code Anchor Card */}
                <div className="rounded-[var(--kw-radius-lg)] bg-[var(--kw-surface-container-lowest)] border border-[var(--kw-outline-variant)]/60 p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--kw-on-surface)]">
                      Physical Garment Tag
                    </p>
                    <p className="text-[11px] text-[var(--kw-on-surface-variant)] truncate">
                      Scanned from woven QR sewn inside hem
                    </p>
                  </div>
                  <div className="size-10 rounded-[var(--kw-radius)] bg-[var(--kw-surface-container-high)] flex items-center justify-center shrink-0">
                    <QrCode className="size-6 text-[var(--kw-primary-container)]" aria-hidden="true" />
                  </div>
                </div>
              </aside>

              {/* RIGHT COLUMN: Provenance Ledger & On-Chain Verification (7 cols) */}
              <section className="lg:col-span-7 space-y-8">
                {/* 1. Provenance Certificate Component */}
                <ProvenanceCertificate
                  passport={passport}
                  onOpenVerificationModal={() => setIsVerificationModalOpen(true)}
                />

                {/* 2. Fair Wage Split Donut & Breakdown Component */}
                <FairWageDonut
                  wageSplitPct={passport.wage_split_pct}
                  productPrice={product?.price}
                />

                {/* 3. On-Chain Merkle Proof Verification Card */}
                <MerkleProofCard
                  passport={passport}
                  verification={verification}
                  isLoadingVerification={isVerifying}
                />
              </section>
            </div>
          )}
        </main>

        {/* Verification Details Modal Overlay */}
        {passport && (
          <VerificationDetailsModal
            isOpen={isVerificationModalOpen}
            onClose={() => setIsVerificationModalOpen(false)}
            passport={passport}
          />
        )}

        {/* Public Footer */}
        <footer className="w-full bg-[#FAF7F2] border-t border-[var(--kw-outline-variant)]/40 mt-12 py-6">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-xs text-[var(--kw-on-surface-variant)]">
            <p>
              Kalaswar Craft Passport · Anchored to Polygon Layer-2 for women artisan collectives across India.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/shop" className="hover:text-[var(--kw-on-surface)] transition-colors underline">
                Browse Shop
              </Link>
              <Link to="/gift" className="hover:text-[var(--kw-on-surface)] transition-colors underline">
                Gift Concierge
              </Link>
              <a href="#help" className="hover:text-[var(--kw-on-surface)] transition-colors">
                Need Help?
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
