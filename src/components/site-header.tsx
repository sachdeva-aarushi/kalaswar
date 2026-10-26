import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { Wordmark } from "@/components/wordmark";
import { LanguageSelect } from "@/components/language-select";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const NAV = [
  { to: "/explore", key: "nav_explore" },
  { to: "/stories", key: "nav_stories" },
  { to: "/concierge", key: "nav_concierge" },
  { to: "/artisans", key: "nav_artisans" },
  { to: "/", hash: "mission", key: "nav_mission" },
] as const;

export function SiteHeader() {
  const { t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [location.href]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b transition-all duration-500 ${
        scrolled
          ? "border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85"
          : "border-transparent bg-background/0"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link to="/" aria-label="Kalaswar home" className="shrink-0">
          <Wordmark size="sm" withFeather={false} />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              {...("hash" in item ? { hash: item.hash } : {})}
              className="text-sm text-foreground/80 transition-colors hover:text-primary"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-1 md:flex">
          <LanguageSelect />
          <Separator orientation="vertical" className="mx-2 h-5" />
          <Button asChild variant="ghost" size="sm">
            <Link to="/artisan-space">{t("nav_forArtisans")}</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground">
            <Link to="/shg">{t("nav_forSHGs")}</Link>
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("nav_menu")}>
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>
                <Wordmark size="sm" />
              </SheetTitle>
            </SheetHeader>
            <nav className="mt-2 flex flex-col gap-1" aria-label="Mobile">
              {NAV.map((item) => (
                <Link
                  key={item.key}
                  to={item.to}
                  {...("hash" in item ? { hash: item.hash } : {})}
                  className="rounded-md px-3 py-2.5 text-base text-foreground hover:bg-accent"
                >
                  {t(item.key)}
                </Link>
              ))}
              <Separator className="my-3" />
              <Link
                to="/artisan-space"
                className="rounded-md px-3 py-2.5 text-base text-primary hover:bg-accent"
              >
                {t("nav_forArtisans")}
              </Link>
              <Link
                to="/shg"
                className="rounded-md px-3 py-2.5 text-base text-primary hover:bg-accent"
              >
                {t("nav_forSHGs")}
              </Link>
              <div className="mt-3 px-3">
                <LanguageSelect />
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
