import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clearance } from "@/components/clearance";
import { ModuleProgress } from "@/components/lesson-progress";
import { Link } from "@/i18n/navigation";
import { listModules } from "@/lib/content";

export default async function ModulesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Modules");
  const modules = await listModules(locale);

  return (
    <main className="wrap page">
      <header className="page-head">
        <p className="label">
          <b>●</b> {t("kicker")}
        </p>
        <h1>{t("title")}</h1>
      </header>
      {modules.length === 0 && <p className="muted">{t("empty")}</p>}
      <ul className="cards">
        {modules.map((m) => (
          <li key={m.slug}>
            <Link href={`/modules/${m.slug}`} className="panel module-card" data-nivel={m.nivel}>
              <span className="mid">{m.id}</span>
              <h2>{m.titulo}</h2>
              <p>{m.descripcion}</p>
              <div className="meta">
                <Clearance nivel={m.nivel} label={t(`level.${m.nivel}`)} />
                <span className="label">{t("minutes", { n: m.tiempoMin })}</span>
                <ModuleProgress keys={m.lecciones.map((l) => `${m.slug}/${l.slug}`)} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
