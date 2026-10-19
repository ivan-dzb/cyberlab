import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectorMap } from "@/components/sector-map";
import { Link } from "@/i18n/navigation";
import { listModules } from "@/lib/content";
import { STAGES, TOTAL_MODULES } from "@/lib/roadmap";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const modules = await listModules(locale);
  const published = Object.fromEntries(modules.map((m) => [m.id, m.slug]));

  return (
    <main className="wrap">
      <section className="hero">
        <p className="label">
          <b>●</b> {t("kicker")}
        </p>
        <h1>
          {t("h1a")} <em>{t("h1b")}</em>{" "}
          <br />
          {t("h1c")}
        </h1>
        <p className="lead">
          {t("lead1")} <span className="redact" tabIndex={0}>{t("redacted")}</span> {t("lead2")}
        </p>
        <div className="actions">
          <Link href="/modules" className="btn">
            {t("cta")} →
          </Link>
          <a href="#map" className="btn ghost">
            {t("ctaMap")}
          </a>
        </div>
      </section>

      <div className="stats">
        <div>
          <span className="num">{TOTAL_MODULES}</span>
          <span className="label">{t("statModules")}</span>
        </div>
        <div>
          <span className="num">{STAGES.length}</span>
          <span className="label">{t("statStages")}</span>
        </div>
        <div>
          <span className="num">4</span>
          <span className="label">{t("statLevels")}</span>
        </div>
        <div>
          <span className="num">{modules.length}</span>
          <span className="label">{t("statLive")}</span>
        </div>
      </div>

      <section className="section" id="map">
        <div className="section-head">
          <h2>{t("mapTitle")}</h2>
          <p className="label">{t("mapHint")}</p>
        </div>
        <div className="map-scroll">
          <SectorMap published={published} />
        </div>
        <div className="legend label">
          <span>
            <span className="dot on" />
            {t("legendOn")}
          </span>
          <span>
            <span className="dot" />
            {t("legendOff")}
          </span>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>{t("howTitle")}</h2>
        </div>
        <div className="steps">
          {(["1", "2", "3"] as const).map((n) => (
            <div className="panel" key={n}>
              <span className="big">{n}</span>
              <h3>{t(`step${n}t`)}</h3>
              <p>{t(`step${n}d`)}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
