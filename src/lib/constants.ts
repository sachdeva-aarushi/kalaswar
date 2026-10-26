import bagsPointer from "@/assets/image.png.asset.json";
import shgGroupPointer from "@/assets/image-2.png.asset.json";
import workingPointer from "@/assets/image-3.png.asset.json";

/** Shared photograph URLs (CDN-hosted) and category metadata. */
export const IMG = {
  bags: bagsPointer.url,
  shgGroup: shgGroupPointer.url,
  working: workingPointer.url,
};

export const CATEGORIES = [
  "Baskets & Bags",
  "Home & Storage",
  "Textiles & Table",
  "Paintings & Wall Art",
  "Clay & Terracotta",
  "Toys & Little Things",
] as const;

/** The demonstration artisan signed into the artisan experience by default (Meena Kumari). */
export const DEMO_ARTISAN_ID = "11111111-0000-0000-0000-000000000004";

export const CLOUDINARY_CLOUD_NAME: string | undefined =
  import.meta.env["VITE_CLOUDINARY_CLOUD_NAME"];
export const CLOUDINARY_UPLOAD_PRESET: string | undefined =
  import.meta.env["VITE_CLOUDINARY_UPLOAD_PRESET"];

export function cloudinaryConfigured(): boolean {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);
}
