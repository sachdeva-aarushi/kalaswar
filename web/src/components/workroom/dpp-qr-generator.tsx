/**
 * Digital Product Passport (DPP) QR Generator
 *
 * Generates dynamic, verifiable QR codes pointing to the craft's
 * Digital Product Passport provenance anchor.
 */

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, Download, Copy, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DppQrGeneratorProps {
  productId: string;
  productTitle?: string;
  className?: string;
}

export function DppQrGenerator({ productId, productTitle = "Craft Product", className = "" }: DppQrGeneratorProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Construct URL to passport page
  const passportUrl = typeof window !== "undefined"
    ? `${window.location.origin}/passport/${productId}`
    : `https://kalaswar.in/passport/${productId}`;

  useEffect(() => {
    QRCode.toDataURL(passportUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: "#2A1810", // Kalaswar Terracotta Dark
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error("QR generation failed", err));
  }, [passportUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(passportUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Clipboard copy not supported or permitted", err);
    }
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `dpp-qr-${productId.slice(0, 8)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={`rounded-xl border border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] p-5 text-center shadow-sm ${className}`}>
      <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--kw-primary-container)]">
        <ShieldCheck className="size-4" />
        <span>Digital Product Passport (DPP)</span>
      </div>
      <h4 className="mt-1 text-sm font-bold text-[var(--kw-on-surface)]">Cryptographic Provenance QR</h4>
      <p className="mt-0.5 text-xs text-[var(--kw-on-surface-variant)]">
        Scan to view GI certification, artisan biography & ledger audit
      </p>

      {/* QR Code Canvas */}
      <div className="mt-4 flex justify-center">
        <div className="rounded-xl border border-[var(--kw-outline-variant)] bg-white p-3 shadow-inner">
          {dataUrl ? (
            <img src={dataUrl} alt={`DPP QR for ${productTitle}`} className="size-44 object-contain" />
          ) : (
            <div className="flex size-44 items-center justify-center text-muted-foreground text-xs">
              <QrCode className="size-8 animate-pulse text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground truncate max-w-xs mx-auto">
        ID: {productId}
      </p>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="h-8 gap-1 text-xs"
        >
          {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
          {copied ? "Copied!" : "Copy Link"}
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={handleDownload}
          disabled={!dataUrl}
          className="h-8 gap-1 text-xs bg-[var(--kw-primary-container)] text-white hover:bg-[var(--kw-primary-container)]/90"
        >
          <Download className="size-3.5" />
          Download QR
        </Button>
      </div>
    </div>
  );
}

