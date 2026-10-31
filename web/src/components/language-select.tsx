import { useLang, type Lang } from "@/lib/i18n";
import { useAuth } from "@/features/auth";
import { useUpdateProfile } from "@/features/auth/hooks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

const OPTIONS: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिंदी" },
  { value: "mr", label: "मराठी" },
];

const SHORT: Record<Lang, string> = { en: "EN", hi: "हिंदी", mr: "मराठी" };

export function LanguageSelect({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { lang, setLang, t } = useLang();
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();

  const handleSelectLang = (newLang: Lang) => {
    setLang(newLang);
    if (user?.id) {
      updateProfile.mutate({ preferred_language: newLang });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t("language")}
          className={
            tone === "light"
              ? "text-[oklch(0.94_0.015_85)] hover:bg-white/10 hover:text-white"
              : "text-foreground hover:bg-accent"
          }
        >
          <Languages className="size-4" aria-hidden="true" />
          <span>{SHORT[lang]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onClick={() => handleSelectLang(o.value)}
            className={o.value === lang ? "bg-accent" : undefined}
            lang={o.value}
          >
            {o.label}
            {o.value === lang ? <span className="ml-auto text-muted-foreground">✓</span> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
