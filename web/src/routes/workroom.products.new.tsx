/**
 * /workroom/products/new — Kalaswar New Product Onboarding with Real Photo Upload & Voice/Text AI Draft
 * Feature 3: create a product (photo upload plus voice or text description -> AI draft -> submit for SHG validation)
 */

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  FileAudio,
  Loader2,
  Mic,
  Plus,
  Sparkles,
  Square,
  Upload,
  AlertCircle,
} from "lucide-react";
import {
  useCreateProduct,
  useFairPriceEstimate,
  useProductAiDraft,
  useProductAiDraftVoice,
  useUploadMedia,
  type FairPriceEstimateResponse,
} from "@/features/products/hooks";
import { useBackendProfile } from "@/features/auth/hooks";
import { useAuth } from "@/features/auth";
import { PricingBreakdownCard } from "@/components/workroom/pricing-breakdown-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/workroom/products/new")({
  head: () => ({
    meta: [{ title: "New Craft Listing — Kalaswar Workroom" }],
  }),
  component: WorkroomNewProductPage,
});

function WorkroomNewProductPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useBackendProfile();

  const createProduct = useCreateProduct();
  const estimatePricing = useFairPriceEstimate();
  const aiDraftText = useProductAiDraft();
  const aiDraftVoice = useProductAiDraftVoice();
  const uploadMedia = useUploadMedia();

  // Photo state
  const [uploadedImages, setUploadedImages] = useState<{ url: string; public_id?: string }[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Raw description prompt for AI
  const [rawDescription, setRawDescription] = useState("");
  const [aiDraftNotice, setAiDraftNotice] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Home Decor");
  const [description, setDescription] = useState("");
  const [materials, setMaterials] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [estimatedHours, setEstimatedHours] = useState(8);
  const [priceInr, setPriceInr] = useState(1200);

  // Pricing & submit state
  const [pricingData, setPricingData] = useState<FairPriceEstimateResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Compute live FairPrice estimate when title/materials change
  useEffect(() => {
    if (title.trim()) {
      estimatePricing.mutate(
        {
          product_title: title,
          materials: [
            { name: materials || "Artisanal Raw Materials", quantity: 1, unit: "units", unit_cost_inr: 400 },
          ],
          labour_stages: [
            { stage_name: "Handcrafting & Assembly", hours: estimatedHours, hourly_rate_inr: 150 },
          ],
          packaging_inr: 50,
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
    }
  }, [title, materials, estimatedHours]);

  // Handle Photo File Upload
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setSubmitError(null);
    try {
      const res = await uploadMedia.mutateAsync(file);
      setUploadedImages((prev) => [...prev, { url: res.secure_url || res.url, public_id: res.public_id }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Image upload failed";
      setSubmitError(`Image upload error: ${msg}`);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Generate AI Draft from typed description
  const handleGenerateAiDraftFromText = async () => {
    if (!rawDescription.trim()) return;
    setSubmitError(null);
    try {
      const draft = await aiDraftText.mutateAsync({
        text_description: rawDescription,
      });

      setTitle(draft.title);
      setDescription(draft.description);
      if (draft.category) setCategory(draft.category);
      if (draft.materials?.length) setMaterials(draft.materials.join(", "));
      if (draft.estimated_hours) setEstimatedHours(draft.estimated_hours);
      if (draft.suggested_price) setPriceInr(draft.suggested_price);

      setAiDraftNotice("AI draft generated from craft description. Verify details below.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate AI draft";
      setSubmitError(msg);
    }
  };

  // Start Audio Recording
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        stream.getTracks().forEach((track) => track.stop());

        setIsRecording(false);
        setSubmitError(null);
        try {
          const draft = await aiDraftVoice.mutateAsync(audioBlob);
          setTitle(draft.title);
          setDescription(draft.description);
          if (draft.category) setCategory(draft.category);
          if (draft.materials?.length) setMaterials(draft.materials.join(", "));
          if (draft.estimated_hours) setEstimatedHours(draft.estimated_hours);
          if (draft.suggested_price) setPriceInr(draft.suggested_price);

          setAiDraftNotice("AI draft transcribed and structured from voice note.");
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Failed to process voice note";
          setSubmitError(msg);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      setSubmitError("Could not access microphone. Please ensure microphone permissions are granted.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  // Submit product for SHG validation
  const handlePublish = async () => {
    if (!title.trim()) {
      setSubmitError("Product title is required.");
      return;
    }
    if (uploadedImages.length === 0) {
      setSubmitError("Please upload at least one craft photo.");
      return;
    }

    const artisanId = profile?.artisan_id || user?.id;
    if (!artisanId) {
      setSubmitError("Artisan identity not detected. Please sign in again.");
      return;
    }

    setSubmitError(null);
    try {
      await createProduct.mutateAsync({
        artisan_id: artisanId,
        title,
        description,
        category,
        price: priceInr,
        image_url: uploadedImages[0].url,
        cloudinary_public_id: uploadedImages[0].public_id,
        materials,
        dimensions,
        production_lead_time_days: 7,
      });

      void navigate({ to: "/workroom/products" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit listing";
      setSubmitError(msg);
    }
  };

  const isArtisanRole = profile?.roles?.includes("artisan") && !profile?.roles?.includes("coordinator");
  const isUnapproved = isArtisanRole && profile?.onboarding_status !== "approved" && profile?.onboarding_status !== "completed";

  return (
    <div className="space-y-6 pb-28 mx-auto max-w-5xl">
      {/* ── Top Header Row ────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[var(--kw-outline-variant)] pb-4">
        <div className="space-y-1">
          <Link
            to="/workroom/products"
            className="inline-flex items-center gap-1.5 text-[var(--kw-primary)] kw-body-sm hover:underline w-fit"
          >
            <ArrowLeft className="size-4" />
            <span>Craft Catalog</span>
          </Link>
          <div className="flex items-baseline gap-4 mt-0.5">
            <h1 className="kw-headline-xl text-[var(--kw-primary)]">New Craft Listing</h1>
            <span className="text-xs text-[var(--kw-on-surface-variant)] flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-[var(--kw-primary)]" />
              Photo + Voice/Text AI Draft
            </span>
          </div>
        </div>
      </header>

      {/* Unapproved Warning */}
      {isUnapproved && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 border border-amber-200 text-amber-900 text-sm">
          <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">SHG Coordinator Approval Pending</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Your artisan account is currently awaiting validation from your Self-Help Group coordinator. You can prepare drafts, but final publication requires SHG validation.
            </p>
          </div>
        </div>
      )}

      {submitError && (
        <div className="rounded-xl bg-rose-50 p-4 border border-rose-200 text-rose-800 text-sm font-medium">
          {submitError}
        </div>
      )}

      {aiDraftNotice && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 border border-emerald-200 text-emerald-800 text-sm font-medium">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <span>{aiDraftNotice}</span>
        </div>
      )}

      {/* ── Main Two-Column Workspace ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (5/12): Craft Photo Upload & Voice/Text AI Assist */}
        <div className="lg:col-span-5 space-y-6">
          {/* Photo Upload Zone */}
          <section className="kw-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="kw-label-sm uppercase tracking-wider text-[var(--kw-on-surface-variant)] font-bold text-xs">
                Product Photos ({uploadedImages.length}/5)
              </span>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploadingPhoto || uploadedImages.length >= 5}
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-[var(--kw-primary)] flex items-center gap-1 font-semibold h-8"
              >
                {isUploadingPhoto ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                <span>Upload Photo</span>
              </Button>
            </div>

            {/* Main preview */}
            {uploadedImages.length > 0 ? (
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-[var(--kw-surface-container)] border border-[var(--kw-outline-variant)] shadow-sm">
                <img
                  src={uploadedImages[0].url}
                  alt="Uploaded craft preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-full shadow-sm text-[11px] font-semibold text-[var(--kw-primary)]">
                  ★ Primary photo (Cloudinary)
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-low)] flex flex-col items-center justify-center cursor-pointer hover:border-[var(--kw-primary)] transition-colors p-6 text-center"
              >
                <div className="size-12 rounded-full bg-[var(--kw-surface-container)] flex items-center justify-center text-[var(--kw-primary)] mb-2">
                  <Camera className="size-6" />
                </div>
                <p className="text-sm font-semibold text-[var(--kw-on-surface)]">Upload Craft Photo</p>
                <p className="text-xs text-[var(--kw-on-surface-variant)] mt-1">
                  Supports JPEG, PNG, or WebP. Optimized via Cloudinary CDN.
                </p>
              </div>
            )}

            {/* Additional Thumbnails */}
            {uploadedImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2 pt-1">
                {uploadedImages.map((img, i) => (
                  <div
                    key={i}
                    className="relative aspect-square rounded-lg overflow-hidden border border-[var(--kw-outline-variant)]"
                  >
                    <img src={img.url} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Voice / Text AI Draft Assistant */}
          <section className="kw-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-[var(--kw-primary)]" />
              <h2 className="kw-label-sm uppercase tracking-wider text-[var(--kw-on-surface-variant)] font-bold text-xs">
                AI Craft Assistant
              </h2>
            </div>
            <p className="text-xs text-[var(--kw-on-surface-variant)]">
              Record a voice note or describe the craft materials, hours, and technique to auto-generate the listing fields.
            </p>

            {/* Voice record action */}
            <div className="rounded-xl bg-[var(--kw-surface-container-low)] p-4 border border-[var(--kw-outline-variant)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant={isRecording ? "destructive" : "default"}
                  size="sm"
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  disabled={aiDraftVoice.isPending}
                  className="size-10 rounded-full flex items-center justify-center p-0 shrink-0"
                >
                  {aiDraftVoice.isPending ? (
                    <Loader2 className="size-4 animate-spin text-white" />
                  ) : isRecording ? (
                    <Square className="size-4 text-white" />
                  ) : (
                    <Mic className="size-4 text-white" />
                  )}
                </Button>
                <div>
                  <p className="text-xs font-semibold text-[var(--kw-on-surface)]">
                    {isRecording ? "Listening... click to finish" : "Voice Note AI Draft"}
                  </p>
                  <p className="text-[11px] text-[var(--kw-on-surface-variant)]">
                    Speak in Hindi, Marathi, or English.
                  </p>
                </div>
              </div>
            </div>

            {/* Text description prompt */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--kw-on-surface-variant)] uppercase tracking-wider">
                Or Type Craft Description
              </label>
              <textarea
                value={rawDescription}
                onChange={(e) => setRawDescription(e.target.value)}
                rows={3}
                placeholder="e.g. Pure raw silk cushion hand-embroidered with botanical flora, dyed with natural madder and indigo floss, took 12 hours..."
                className="w-full p-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-lowest)] text-xs text-[var(--kw-on-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--kw-primary)]"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateAiDraftFromText}
                disabled={!rawDescription.trim() || aiDraftText.isPending}
                className="w-full text-xs flex items-center justify-center gap-1.5"
              >
                {aiDraftText.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5 text-[var(--kw-primary)]" />
                )}
                <span>Generate AI Draft from Text</span>
              </Button>
            </div>
          </section>
        </div>

        {/* Right Column (7/12): Product Review & FairPrice Details */}
        <div className="lg:col-span-7 space-y-6">
          <div className="kw-card p-6 space-y-4">
            <h2 className="kw-headline-sm text-[var(--kw-on-surface)] border-b border-[var(--kw-outline-variant)] pb-3">
              Craft Listing Details
            </h2>

            <div className="space-y-1.5">
              <label className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px]">
                Product Title *
              </label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Botanical Madder Hand-Embroidered Silk Cushion"
                required
                className="h-11"
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
                  className="w-full h-10 px-3 rounded-md border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-lowest)] text-xs text-[var(--kw-on-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--kw-primary)]"
                >
                  <option value="Home Decor">Home Decor (Cushions & Throws)</option>
                  <option value="Textiles & Apparel">Textiles & Apparel (Stoles & Sarees)</option>
                  <option value="Paintings & Folk Art">Paintings & Folk Art (Warli / Pattachitra)</option>
                  <option value="Pottery & Clay">Pottery & Terracotta</option>
                  <option value="Jewelry & Accessories">Jewelry & Metal Craft</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px]">
                  Estimated Crafting Hours
                </label>
                <Input
                  type="number"
                  min="1"
                  max="500"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(parseInt(e.target.value, 10) || 1)}
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px]">
                Description & Technique
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Detailed craft description and provenance technique..."
                className="w-full p-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-lowest)] text-xs text-[var(--kw-on-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--kw-primary)] resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px]">
                  Materials Used
                </label>
                <Input
                  type="text"
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                  placeholder="e.g. Raw silk, madder root dye, cotton floss"
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px]">
                  Dimensions / Size
                </label>
                <Input
                  type="text"
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                  placeholder="e.g. 40 x 40 cm"
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px]">
                Price (INR ₹)
              </label>
              <Input
                type="number"
                min="50"
                value={priceInr}
                onChange={(e) => setPriceInr(parseInt(e.target.value, 10) || 0)}
                className="h-10"
              />
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
            Transparent FairPrice calculation included.
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/workroom/products"
            className="kw-btn kw-btn-secondary h-11 text-xs px-4"
          >
            Cancel
          </Link>
          <Button
            type="button"
            disabled={createProduct.isPending || !title.trim() || uploadedImages.length === 0}
            onClick={() => void handlePublish()}
            className="kw-btn kw-btn-primary h-11 text-xs shadow-sm flex items-center gap-2 px-6"
          >
            {createProduct.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            <span>
              {isArtisanRole ? "Submit for SHG Validation" : "Publish to Catalog"}
            </span>
          </Button>
        </div>
      </footer>
    </div>
  );
}
