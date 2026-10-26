import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, LogOut } from "lucide-react";
import { getSessionUser, performSignOut, type SessionUser } from "@/lib/auth-client";
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
import logoWhite from "@/assets/kalaswar-logo-white.png.asset.json";
import logoBurgundy from "@/assets/kalaswar-logo-burgundy.png.asset.json";

const NAV = [
  { to: "/explore", key: "nav_explore" },
  { to: "/artisans", key: "nav_artisans" },
  { to: "/stories", key: "nav_stories" },
  { to: "/b2b", key: "nav_b2b" },
  { to: "/", hash: "mission", key: "nav_mission" },
] as const;

const ON_DARK = "text-[oklch(0.977_0.009_84.6)]";

function AccountArea({
  compact = false,
  tone = "dark",
}: {
  compact?: boolean;
  tone?: "dark" | "light";
}) {
  const { t } = useLang();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    getSessionUser().then((u) => {
      if (alive) {
        setUser(u);
        setReady(true);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!ready) return null;

  const light = tone === "light";

  if (!user) {
    return (
      <Button
        asChild
        variant="ghost"
        size="sm"
        className={light ? `${ON_DARK} hover:bg-white/10` : undefined}
      >
        <Link to="/auth" search={{ redirect: undefined }}>{t("nav_signin")}</Link>
      </Button>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${compact ? "px-3" : ""}`}>
      <span
        className={`max-w-36 truncate text-sm ${light ? "text-[oklch(0.977_0.009_84.6)]/85" : "text-foreground/80"}`}
        title={user.name ?? user.email}
      >
        {user.name ?? user.email}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void performSignOut(queryClient, navigate)}
        aria-label={t("nav_signout")}
        className={light ? `${ON_DARK} hover:bg-white/10` : undefined}
      >
        <LogOut className="size-4" aria-hidden="true" />
        <span className="hidden lg:inline">{t("nav_signout")}</span>
      </Button>
    </div>
  );
}

export function SiteHeader() {
  const { t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const overlay = !scrolled && location.pathname === "/";
  const light = overlay;

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
        light
          ? "border-transparent bg-primary/0"
          : "border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link to="/" aria-label="Kalaswar home" className="shrink-0">
          <img
            src={light ? logoWhite.url : logoBurgundy.url}
            alt="Kalaswar — कलास्वर"
            className="h-9 w-auto md:h-10"
          />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              {...("hash" in item ? { hash: item.hash } : {})}
              className={`text-sm transition-colors ${
                light
                  ? "text-[oklch(0.977_0.009_84.6)]/85 hover:text-[oklch(0.977_0.009_84.6)]"
                  : "text-foreground/80 hover:text-primary"
              }`}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-1 md:flex">
          <AccountArea tone={light ? "light" : "dark"} />
          <Separator orientation="vertical" className={`mx-2 h-5 ${light ? "bg-white/25" : ""}`} />
          <LanguageSelect tone={light ? "light" : "dark"} />
          <Separator orientation="vertical" className={`mx-2 h-5 ${light ? "bg-white/25" : ""}`} />
          <Button
            asChild
            size="sm"
            className={
              light
                ? "bg-[oklch(0.977_0.009_84.6)] text-primary hover:bg-white"
                : "bg-primary hover:bg-primary/90"
            }
          >
            <Link to="/explore">{t("hero_cta_explore")}</Link>
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`shrink-0 md:hidden ${light ? `${ON_DARK} hover:bg-white/10` : ""}`}
              aria-label={t("nav_menu")}
            >
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
                to="/concierge"
                className="rounded-md px-3 py-2.5 text-base text-foreground hover:bg-accent"
              >
                {t("nav_concierge")}
              </Link>
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
              <Separator className="my-3" />
              <div className="px-3">
                <AccountArea compact />
              </div>
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
