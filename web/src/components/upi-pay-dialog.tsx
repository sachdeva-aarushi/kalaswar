import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Smartphone } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { buildUpiUri } from "@/lib/upi";
import { formatINR } from "@/lib/money";
import { DemoNote } from "@/components/demo-note";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Generates a scannable UPI QR from the collective's own UPI ID.
 * The customer pays in her own UPI app; Kalaswar shows the QR but never
 * processes or verifies the money (clearly labelled in demonstration mode).
 */
export function UpiPayDialog({
  upiId,
  payeeName,
  amount,
  note,
  triggerLabel,
  tone = "outline",
}: {
  upiId: string | null | undefined;
  payeeName: string;
  amount: number;
  note: string;
  triggerLabel?: string;
  tone?: "outline" | "default";
}) {
  const { t } = useLang();
  const [qr, setQr] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const uri = upiId ? buildUpiUri({ upiId, payeeName, amount, note }) : null;

  useEffect(() => {
    if (!uri) return;
    let alive = true;
    QRCode.toDataURL(uri, {
      width: 480,
      margin: 1,
      color: { dark: "#1a1a1aff", light: "#ffffffff" },
    })
      .then((dataUrl) => {
        if (alive) setQr(dataUrl);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [uri]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" variant={tone} className="h-12 px-7">
          <Smartphone className="size-4" aria-hidden="true" />
          {triggerLabel ?? t("pay_upi")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t("pay_upi")}</DialogTitle>
          <DialogDescription>{t("pay_upi_sub")}</DialogDescription>
        </DialogHeader>
        {upiId ? (
          <div className="flex flex-col items-center gap-4 py-2">
            <p className="text-2xl font-medium tabular-nums text-foreground">{formatINR(amount)}</p>
            {qr && !failed ? (
              <img
                src={qr}
                alt={t("pay_qr_alt")}
                className="size-56 rounded-md border border-border bg-white p-2"
              />
            ) : (
              <div
                role="status"
                className="flex size-56 items-center justify-center rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground"
              >
                {t("common_error")}
              </div>
            )}
            <p className="text-center text-sm text-muted-foreground">
              {t("pay_to")} <span className="font-medium text-foreground">{payeeName}</span>
              <br />
              <span className="tabular-nums">{upiId}</span>
            </p>
            <a href={uri ?? "#"} className="w-full sm:w-auto">
              <Button className="w-full">{t("pay_open_app")}</Button>
            </a>
            <DemoNote>{t("pay_demo_note")}</DemoNote>
          </div>
        ) : (
          <div className="rounded-md border border-border bg-secondary p-4 text-sm text-secondary-foreground">
            {t("pay_not_configured")}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
