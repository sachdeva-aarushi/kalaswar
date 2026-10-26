import { useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoNote } from "@/components/demo-note";
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
  cloudinaryConfigured,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export interface UploadedImage {
  url: string;
  publicId: string;
}

/**
 * Real Cloudinary unsigned-upload workflow. The cloud name and a *restricted*
 * upload preset come from environment configuration; the API secret is never
 * used client-side. When not configured, this shows a clear configuration
 * error and never simulates success.
 */
export function CloudinaryUploader({
  value,
  onChange,
  className,
}: {
  value: UploadedImage | null;
  onChange: (image: UploadedImage | null) => void;
  className?: string;
}) {
  const { t } = useLang();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<"invalid" | "fail" | "config" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const configured = cloudinaryConfigured();

  const upload = (file: File) => {
    setError(null);
    if (!ACCEPTED.includes(file.type) || file.size > MAX_BYTES) {
      setError("invalid");
      return;
    }
    if (!configured) {
      setError("config");
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    );
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setProgress(null);
      try {
        const body = JSON.parse(xhr.responseText) as {
          secure_url?: string;
          public_id?: string;
          error?: { message?: string };
        };
        if (xhr.status >= 200 && xhr.status < 300 && body.secure_url && body.public_id) {
          onChange({ url: body.secure_url, publicId: body.public_id });
        } else {
          setError("fail");
          console.error("Cloudinary upload failed:", body.error?.message ?? xhr.status);
        }
      } catch {
        setError("fail");
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      setError("fail");
    };
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET!);
    setProgress(0);
    xhr.send(form);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
      <div className="flex items-center gap-3">
        {value ? (
          <img
            src={value.url}
            alt=""
            className="size-16 rounded-md border border-border object-cover"
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
            <ImagePlus className="size-5" aria-hidden="true" />
          </div>
        )}
        <div className="space-y-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={progress !== null}
            onClick={() => {
              if (!configured) setError("config");
              else inputRef.current?.click();
            }}
          >
            {progress !== null && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            <span>{value ? t("upload_change") : t("upload_choose")}</span>
          </Button>
          {progress !== null && (
            <p className="text-xs tabular-nums text-muted-foreground">
              {t("upload_progress", { p: progress })}
            </p>
          )}
        </div>
      </div>
      {error && <DemoNote className="text-destructive">{t(`upload_${error === "invalid" ? "invalid" : error === "fail" ? "fail" : "config"}`)}</DemoNote>}
    </div>
  );
}
