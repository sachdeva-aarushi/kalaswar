import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTip } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { speak } from "@/lib/speech";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DemoNote } from "@/components/demo-note";
import { toast } from "sonner";
import { Heart } from "lucide-react";

const PRESETS = [100, 250, 500];

/** Demonstration support (tip) interaction — never implies a real payment. */
export function TipDialog({
  artisanId,
  artisanName,
  tone = "solid",
}: {
  artisanId: string;
  artisanName: string;
  tone?: "solid" | "outline";
}) {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("100");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => createTip(artisanId, Math.max(1, Number(amount) || 0)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artisanSummary", artisanId] });
      toast.success(t("tip_success"));
      speak(t("tip_success"), lang);
      setOpen(false);
    },
    onError: () => toast.error(t("common_error")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {tone === "solid" ? (
          <Button>
            <Heart className="size-4" aria-hidden="true" />
            <span>{t("product_support")}</span>
          </Button>
        ) : (
          <Button variant="outline" className="border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground">
            <Heart className="size-4" aria-hidden="true" />
            <span>{t("product_support")}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="border border-border bg-card p-6 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t("tip_title", { name: artisanName })}</DialogTitle>
          <DialogDescription>{t("tip_sub")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 border border-border bg-secondary p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-lg [&_input]:h-12 [&_input]:border-border [&_input]:bg-background">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p}
                type="button"
                variant={String(p) === amount ? "default" : "outline"}
                size="sm"
                onClick={() => setAmount(String(p))}
                className="flex-1 border border-border transition-colors hover:border-primary/40"
              >
                ₹{p}
              </Button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tip-amount">{t("tip_amount")}</Label>
            <Input
              id="tip-amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
            />
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? t("f_saving") : t("tip_send")}
          </Button>
          <DemoNote>{t("tip_note")}</DemoNote>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
