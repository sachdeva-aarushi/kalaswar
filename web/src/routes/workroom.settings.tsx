/**
 * /workroom/settings — Artisan & Coordinator Profile & Settings
 * Feature 1: Profile and language preference management
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useBackendProfile, useUpdateProfile } from "@/features/auth/hooks";
import { useLang, type Lang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Globe, Loader2, Save, User, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/workroom/settings")({
  head: () => ({ meta: [{ title: "Profile & Settings — Kalaswar Workroom" }] }),
  component: WorkroomSettings,
});

function WorkroomSettings() {
  const { data: profile, isLoading } = useBackendProfile();
  const updateProfile = useUpdateProfile();
  const { lang, setLang } = useLang();

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [craftSpecialties, setCraftSpecialties] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<Lang>(lang);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      if (profile.display_name) setDisplayName(profile.display_name);
      if (profile.phone) setPhone(profile.phone);
      if (profile.preferred_language && (profile.preferred_language === "en" || profile.preferred_language === "hi" || profile.preferred_language === "mr")) {
        setSelectedLanguage(profile.preferred_language as Lang);
      }
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateProfile.mutateAsync({
        display_name: displayName,
        phone,
        preferred_language: selectedLanguage,
        bio,
        craft_specialties: craftSpecialties
          ? craftSpecialties.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        shipping_address: shippingAddress,
      });

      setLang(selectedLanguage);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      setSaveError(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[var(--kw-primary)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-20">
      <div>
        <h1 className="kw-headline-xl text-[var(--kw-on-surface)]">Profile & Settings</h1>
        <p className="mt-1 kw-body-md text-[var(--kw-on-surface-variant)]">
          Manage your artisan identity, contact information, and preferred regional language.
        </p>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm font-medium text-emerald-800 border border-emerald-200">
          <Check className="size-4 shrink-0 text-emerald-600" />
          <span>Profile and language preferences updated successfully.</span>
        </div>
      )}

      {saveError && (
        <div className="rounded-lg bg-rose-50 p-4 text-sm font-medium text-rose-800 border border-rose-200">
          {saveError}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Account Info */}
        <section className="kw-card space-y-4 p-6">
          <div className="flex items-center gap-2 border-b border-[var(--kw-outline-variant)] pb-3">
            <User className="size-5 text-[var(--kw-primary)]" />
            <h2 className="kw-headline-sm text-[var(--kw-on-surface)]">Account Details</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-[var(--kw-on-surface-variant)] uppercase tracking-wider">
                Email Address
              </label>
              <Input
                type="email"
                value={profile?.email || ""}
                disabled
                className="mt-1 bg-muted/50 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--kw-on-surface-variant)] uppercase tracking-wider">
                Role & Verification
              </label>
              <div className="mt-1 flex h-10 items-center gap-2 rounded-md border border-[var(--kw-outline-variant)] bg-muted/40 px-3 text-xs font-medium text-[var(--kw-on-surface)]">
                <ShieldCheck className="size-4 text-[var(--kw-primary)]" />
                <span className="capitalize">{profile?.roles?.join(", ") || "Artisan"}</span>
                <span className="ml-auto rounded-full bg-[var(--kw-surface-container)] px-2 py-0.5 text-[10px]">
                  {profile?.onboarding_status || "Active"}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--kw-on-surface-variant)] uppercase tracking-wider">
              Display Name / Artisan Name
            </label>
            <Input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Meenakshi Devi"
              className="mt-1"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--kw-on-surface-variant)] uppercase tracking-wider">
              Phone Number
            </label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--kw-on-surface-variant)] uppercase tracking-wider">
              Craft Specialties (comma-separated)
            </label>
            <Input
              type="text"
              value={craftSpecialties}
              onChange={(e) => setCraftSpecialties(e.target.value)}
              placeholder="e.g. Warli Painting, Terracotta, Kantha"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--kw-on-surface-variant)] uppercase tracking-wider">
              Artisan Bio / Story
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Share a short summary of your artisanal background and heritage craft experience..."
              className="mt-1 w-full rounded-md border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-lowest)] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--kw-primary)]"
            />
          </div>
        </section>

        {/* Language Preference */}
        <section className="kw-card space-y-4 p-6">
          <div className="flex items-center gap-2 border-b border-[var(--kw-outline-variant)] pb-3">
            <Globe className="size-5 text-[var(--kw-primary)]" />
            <h2 className="kw-headline-sm text-[var(--kw-on-surface)]">Language Preference</h2>
          </div>
          <p className="kw-body-sm text-[var(--kw-on-surface-variant)]">
            Choose your preferred interface language. Voice assistance and translation will adapt to this choice.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { code: "en" as const, label: "English", native: "English" },
              { code: "hi" as const, label: "Hindi", native: "हिंदी" },
              { code: "mr" as const, label: "Marathi", native: "मराठी" },
            ].map(({ code, label, native }) => (
              <label
                key={code}
                onClick={() => setSelectedLanguage(code)}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 p-4 text-center transition-all ${
                  selectedLanguage === code
                    ? "border-[var(--kw-primary)] bg-[var(--kw-primary)]/5 font-semibold text-[var(--kw-primary)] shadow-sm"
                    : "border-[var(--kw-outline-variant)] hover:border-[var(--kw-primary)]/40 hover:bg-[var(--kw-surface-container)]"
                }`}
              >
                <span className="text-base font-bold">{native}</span>
                <span className="text-xs text-[var(--kw-on-surface-variant)]">{label}</span>
              </label>
            ))}
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={updateProfile.isPending}
            className="kw-btn kw-btn-primary flex items-center gap-2 px-6"
          >
            {updateProfile.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            <span>Save Profile</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
