import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { Wordmark } from "@/components/wordmark";
import { DemoNote } from "@/components/demo-note";

export function SiteFooter() {
  const { t } = useLang();
  return (
    <footer className="bg-wine text-[oklch(0.94_0.015_85)]">
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className="grid gap-10 md:grid-cols-[1.2fr,1fr,1fr,1fr]">
          <div>
            <Wordmark tone="light" size="sm" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed opacity-80">
              Her craft. Her voice. Her livelihood.
            </p>
          </div>
          <nav aria-label="Explore">
            <h3 className="kicker opacity-60">{t("nav_explore")}</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/explore" className="opacity-85 hover:opacity-100">{t("nav_explore")}</Link></li>
              <li><Link to="/artisans" className="opacity-85 hover:opacity-100">{t("nav_artisans")}</Link></li>
            </ul>
          </nav>
          <nav aria-label="Access">
            <h3 className="kicker opacity-60">{t("nav_forArtisans")}</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/artisan-space" className="opacity-85 hover:opacity-100">{t("nav_forArtisans")}</Link></li>
              <li><Link to="/shg" className="opacity-85 hover:opacity-100">{t("shg_workspace")}</Link></li>
            </ul>
          </nav>
          <nav aria-label="About">
            <h3 className="kicker opacity-60">{t("nav_mission")}</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/" hash="mission" className="opacity-85 hover:opacity-100">{t("nav_mission")}</Link></li>
              <li><Link to="/" className="opacity-85 hover:opacity-100">{t("back_home")}</Link></li>
            </ul>
          </nav>
        </div>
        <div className="mt-12 border-t border-white/15 pt-6">
          <DemoNote tone="onDark">{t("footer_demo")}</DemoNote>
          <p className="mt-3 text-xs opacity-60">© 2026 Kalaswar</p>
        </div>
      </div>
    </footer>
  );
}
