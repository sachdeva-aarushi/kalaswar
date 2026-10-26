import { CONSENT_TYPES, type ConsentType, type StoryConsent } from "./types";

export { CONSENT_TYPES };

type ConsentLike = Pick<StoryConsent, "consent_type" | "granted">;

/**
 * Pure consent rules for craft stories — nothing here reads a database, so
 * every rule is testable. Attribution is shown only when the maker granted
 * the specific consent AND the underlying fact actually exists; consent
 * never invents information.
 */

export function consentGranted(
  consents: ConsentLike[] | undefined,
  type: ConsentType,
): boolean {
  return (consents ?? []).some((c) => c.consent_type === type && c.granted);
}

/** Maker attribution requires both the consent and an actual recorded name. */
export function canShowMakerName(
  consents: ConsentLike[] | undefined,
  artisanName: string | null | undefined,
): boolean {
  return consentGranted(consents, "maker_name") && Boolean(artisanName?.trim());
}

export function canShowMakerPhoto(consents: ConsentLike[] | undefined): boolean {
  return consentGranted(consents, "maker_photo");
}

export function canReuseForMarketing(consents: ConsentLike[] | undefined): boolean {
  return consentGranted(consents, "marketing_reuse");
}

/**
 * The maker credit line: only ever built from what exists. With no consent
 * (or no name) the collective is credited instead when a name is supplied.
 */
export function makerCredit(
  consents: ConsentLike[] | undefined,
  artisanName: string | null | undefined,
  shgName: string | null | undefined,
): string | null {
  if (canShowMakerName(consents, artisanName)) return artisanName!.trim();
  if (shgName?.trim()) return shgName.trim();
  return null;
}
