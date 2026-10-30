/**
 * /workroom/products/new — Kalaswar Workroom New Product Onboarding & FairPrice Review
 *
 * Stitch Screen ID: 3026cf650eea4d8197c3b8738758689f
 * (Merged variant: 6fb87e6315814a988edd7a375397a07a Kalaswar Workroom - Review Product)
 * Scoped under .kw-app.
 */

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Play,
  Pause,
  Mic,
  Languages,
  Sparkles,
  Camera,
  Plus,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import {
  useCreateProduct,
  useFairPriceEstimate,
  type FairPriceEstimateResponse,
} from "@/features/products/hooks";
import { PricingBreakdownCard } from "@/components/workroom/pricing-breakdown-card";

export const Route = createFileRoute("/workroom/products/new")({
  head: () => ({
    meta: [{ title: "New Product — Kalaswar Workroom" }],
  }),
  component: WorkroomNewProductPage,
});

function WorkroomNewProductPage() {
  const navigate = useNavigate();
  const createProduct = useCreateProduct();
  const estimatePricing = useFairPriceEstimate();

  // Form fields (pre-filled from voice note AI transcription)
  const [title, setTitle] = useState("Handcrafted Botanical Raw Silk Cushion");
  const [category, setCategory] = useState("Home Decor");
  const [description, setDescription] = useState(
    "Lavish square hand-embroidered artisanal raw silk cushion with delicate botanical flora, dyed using natural madder and forest indigo.",
  );
  const [artisanId, setArtisanId] = useState("cccccccc-0001-0000-0000-000000000001");
  const [materials, setMaterials] = useState("Handspun raw silk, natural indigo dye, cotton lining");
  const [dimensions, setDimensions] = useState("40 × 40 cm (Square)");
  const [priceInr, setPriceInr] = useState(1650);

  // Stepper / Review state
  const [step, setStep] = useState<"describe" | "review">("describe");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeThumb, setActiveThumb] = useState(0);
  const [pricingData, setPricingData] = useState<FairPriceEstimateResponse | null>(null);

  // Compute live FairPrice estimate
  useEffect(() => {
    estimatePricing.mutate(
      {
        product_title: title,
        materials: [
          { name: "Raw Silk Fabric", quantity: 1.2, unit: "meters", unit_cost_inr: 350 },
          { name: "Natural Indigo Dye", quantity: 0.2, unit: "kg", unit_cost_inr: 400 },
        ],
        labour_stages: [
          { stage_name: "Hand Embroidery", hours: 14, hourly_rate_inr: 150 },
        ],
        packaging_inr: 40,
        overhead_percent: 10,
        target_margin_percent: 20,
      },
      {
        onSuccess: (data) => {
          setPricingData(data);
          if (data.suggested_retail_price) {
            setPriceInr(Math.round(data.suggested_retail_price));
          }
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  const images = [
    "https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/cushion_01.jpg",
    "https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/stole_01.jpg",
    "https://res.cloudinary.com/navinfpx/image/upload/v1700000000/kalaswar/demo/warli_01.jpg",
  ];

  const handlePublish = async () => {
    await createProduct.mutateAsync({
      artisan_id: artisanId,
      title,
      description,
      category,
      price: priceInr,
      image_url: images[0],
      materials,
      dimensions,
    });
    void navigate({ to: "/workroom/products" });
  };

  return (
    <div className="space-y-6 pb-28">
      {/* ── Top Header Row ────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[var(--kw-outline-variant)] pb-4">
        <div className="space-y-1">
          <Link
            to="/workroom/products"
            className="inline-flex items-center gap-1.5 text-[var(--kw-primary)] kw-body-sm hover:underline w-fit"
          >
            <ArrowLeft className="size-4" />
            <span>Products</span>
          </Link>
          <div className="flex items-baseline gap-4 mt-0.5">
            <h1 className="kw-headline-xl text-[var(--kw-primary)]">New product</h1>
            <span className="text-xs text-[var(--kw-on-surface-variant)] flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-[var(--kw-primary)]" />
              Draft · Voice AI auto-filled
            </span>
          </div>
        </div>

        {/* Center Stepper */}
        <div className="flex items-center gap-3 text-xs font-semibold self-start md:self-end">
          <span className="inline-flex items-center gap-1 text-[var(--kw-primary-container)]">
            <CheckCircle2 className="size-3.5" />
            <span>Photo</span>
          </span>
          <span className="text-[var(--kw-outline-variant)]">·</span>
          <button
            type="button"
            onClick={() => setStep("describe")}
            className={`inline-flex items-center gap-1 ${
              step === "describe"
                ? "text-[var(--kw-primary)] font-bold border-b-2 border-[var(--kw-primary)] pb-0.5"
                : "text-[var(--kw-on-surface-variant)]"
            }`}
          >
            <CheckCircle2 className="size-3.5" />
            <span>Describe</span>
          </button>
          <span className="text-[var(--kw-outline-variant)]">·</span>
          <button
            type="button"
            onClick={() => setStep("review")}
            className={`inline-flex items-center gap-1 ${
              step === "review"
                ? "text-[var(--kw-primary)] font-bold border-b-2 border-[var(--kw-primary)] pb-0.5"
                : "text-[var(--kw-on-surface-variant)]"
            }`}
          >
            <span>Review & FairPrice</span>
          </button>
        </div>

        {/* Right utility actions */}
        <div className="flex items-center gap-3 self-start md:self-end">
          <Link
            to="/workroom/products"
            className="text-xs text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-error)] px-2 py-1"
          >
            Discard
          </Link>
          <button
            type="button"
            className="size-9 rounded-lg bg-[var(--kw-surface-container)] text-[var(--kw-primary)] font-semibold text-xs flex items-center justify-center hover:bg-[var(--kw-surface-container-high)]"
          >
            हि
          </button>
        </div>
      </header>

      {/* ── Main Two-Column Workspace ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (5/12): Craft Visuals & Voice Note */}
        <div className="lg:col-span-5 space-y-6">
          {/* Photos Zone */}
          <section className="kw-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="kw-label-sm uppercase tracking-wider text-[var(--kw-on-surface-variant)] font-bold text-xs">
                Product Photos (3/5)
              </span>
              <button
                type="button"
                className="text-xs text-[var(--kw-primary)] hover:underline flex items-center gap-1 font-semibold"
              >
                <Plus className="size-3.5" />
                <span>Add photo</span>
              </button>
            </div>

            {/* Main photo */}
            <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-[var(--kw-surface-container)] border border-[var(--kw-outline-variant)] shadow-sm">
              <img
                src={images[activeThumb]}
                alt="Product preview"
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              />
              <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-full shadow-sm text-[11px] font-semibold text-[var(--kw-primary)]">
                ★ Primary photo
              </div>
            </div>

            {/* Thumbnails */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveThumb(i)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    activeThumb === i
                      ? "border-[var(--kw-primary)] ring-2 ring-[var(--kw-primary)]/20"
                      : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
              <div className="aspect-square rounded-lg border border-dashed border-[var(--kw-outline-variant)] flex flex-col items-center justify-center text-[var(--kw-on-surface-variant)] hover:bg-[var(--kw-surface-container-low)] cursor-pointer">
                <Camera className="size-4" />
                <span className="text-[10px] mt-0.5">+ Slot</span>
              </div>
            </div>
          </section>

          {/* Artisan Voice Note Zone */}
          <section className="kw-card p-5 space-y-3">
            <span className="kw-label-sm uppercase tracking-wider text-[var(--kw-on-surface-variant)] font-bold text-xs block">
              Artisan Voice Note
            </span>

            {/* Waveform Player */}
            <div className="rounded-xl bg-[var(--kw-surface-container-low)] p-3.5 border border-[var(--kw-outline-variant)] flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className="size-9 rounded-full bg-[var(--kw-primary-container)] text-white flex items-center justify-center hover:bg-[var(--kw-primary)] transition-colors shrink-0 shadow-sm"
              >
                {isPlayingAudio ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
              </button>

              {/* Fake animated waveform */}
              <div className="flex-1 flex items-center gap-1 h-7">
                {[12, 20, 24, 16, 22, 26, 18, 14, 22, 10, 16, 14, 8, 18, 12].map((h, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full transition-all duration-200 ${
                      isPlayingAudio && i < 8 ? "bg-[var(--kw-primary)] animate-pulse" : "bg-[var(--kw-outline-variant)]"
                    }`}
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
              <span className="text-xs font-mono text-[var(--kw-on-surface-variant)]">0:48 / 1:12</span>
              <Mic className="size-4 text-[var(--kw-on-surface-variant)]" />
            </div>

            {/* Translation Chip */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--kw-surface-container)] text-xs text-[var(--kw-on-surface-variant)]">
              <Languages className="size-3.5 text-[var(--kw-primary)]" />
              <span>Bengali audio translated to English</span>
            </div>

            {/* Transcript */}
            <div className="rounded-lg bg-[var(--kw-surface-container-low)] p-3 text-xs leading-relaxed text-[var(--kw-on-surface)] italic">
              “Used handspun cotton base with natural madder and indigo silk floss. Zardozi floral jaal pattern on front. Took roughly 34 loom hours across two weeks.”
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-[var(--kw-primary)] font-medium">
              <Sparkles className="size-3.5" />
              <span>AI draft generated from voice note & photo analysis.</span>
            </div>
          </section>
        </div>

        {/* Right Column (7/12): Editorial Verification & Pricing */}
        <div className="lg:col-span-7 space-y-6">
          {/* Notification banner */}
          <div className="rounded-xl bg-[rgba(35,76,61,0.12)] p-3.5 flex items-center justify-between text-xs text-[var(--kw-primary)] font-medium">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-[var(--kw-primary)]" />
              <span>AI drafted 4 fields from Lakshmi’s voice note. Review and verify before submitting.</span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="kw-card p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px]">
                Product Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-lowest)] kw-headline-sm text-[var(--kw-primary)] focus:outline-none focus:border-[var(--kw-primary-container)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px]">
                  Craft Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-lowest)] text-xs text-[var(--kw-on-surface)] focus:outline-none focus:border-[var(--kw-primary-container)]"
                >
                  <option value="Home Decor">Home Decor (Cushions & Throws)</option>
                  <option value="Textiles & Apparel">Textiles & Apparel (Stoles & Scarves)</option>
                  <option value="Paintings & Folk Art">Paintings & Folk Art (Warli / Pattachitra)</option>
                  <option value="Pottery & Clay">Pottery & Terracotta</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px]">
                  Lead Artisan
                </label>
                <select
                  value={artisanId}
                  onChange={(e) => setArtisanId(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-lowest)] text-xs text-[var(--kw-on-surface)] focus:outline-none focus:border-[var(--kw-primary-container)]"
                >
                  <option value="cccccccc-0001-0000-0000-000000000001">Radha Devi (Santiniketan · Kantha)</option>
                  <option value="cccccccc-0002-0000-0000-000000000002">Suresh Warli (Dahanu · Warli Art)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px]">
                Product Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-lowest)] kw-body-sm text-[var(--kw-on-surface)] focus:outline-none focus:border-[var(--kw-primary-container)] resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px]">
                  Materials Used
                </label>
                <input
                  type="text"
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-lowest)] text-xs text-[var(--kw-on-surface)] focus:outline-none focus:border-[var(--kw-primary-container)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px]">
                  Dimensions / Specs
                </label>
                <input
                  type="text"
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-lowest)] text-xs text-[var(--kw-on-surface)] focus:outline-none focus:border-[var(--kw-primary-container)]"
                />
              </div>
            </div>
          </div>

          {/* Pricing breakdown card */}
          <PricingBreakdownCard pricing={pricingData} isLoading={estimatePricing.isPending} />
        </div>
      </div>

      {/* ── Fixed Bottom Decision Bar (80px) ───────────────────────────────── */}
      <footer className="fixed bottom-0 left-0 lg:left-64 right-0 h-20 px-8 bg-[var(--kw-surface-container-lowest)] border-t border-[var(--kw-outline-variant)] flex items-center justify-between z-30 shadow-lg">
        <div className="flex flex-col">
          <span className="kw-label-md text-[var(--kw-primary)] font-semibold">
            Selling Price: ₹{priceInr.toLocaleString("en-IN")}
          </span>
          <span className="text-xs text-[var(--kw-on-surface-variant)]">
            Verified FairPrice costing build-up included.
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStep("review")}
            className="kw-btn kw-btn-secondary h-11 text-xs"
          >
            Review Details
          </button>
          <button
            type="button"
            disabled={createProduct.isPending}
            onClick={() => void handlePublish()}
            className="kw-btn kw-btn-primary h-11 text-xs shadow-sm"
          >
            {createProduct.isPending ? "Publishing…" : "Publish to Workroom Catalog"}
          </button>
        </div>
      </footer>
    </div>
  );
}
