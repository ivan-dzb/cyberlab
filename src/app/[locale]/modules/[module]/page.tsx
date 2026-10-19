import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clearance } from "@/components/clearance";
import { LessonCheck, ModuleProgress } from "@/components/lesson-progress";
import { Link } from "@/i18n/navigation";
import { getModule } from "@/lib/content";

export default async function ModulePage({
  params,
}: {
  params: Promise<{ locale: string; module: string }>;
}) {
  const { locale, module: slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Modules");
  const mod = await getModule(slug, locale);
  if (!mod) notFound();

  return (
    <main className="wrap page">
      <p>
        <Link href="/modules" className="crumb">
          ← {t("title")}
        </Link>
      </p>
      <header className="page-head" data-nivel={mod.nivel}>
        <p className="label">
          <b>{mod.id}</b> · {t("stage", { n: mod.etapa })}
        </p>
        <h1>{mod.titulo}</h1>
        <p className="muted" style={{ maxWidth: "40rem", fontSize: "1.15rem" }}>
          {mod.descripcion}
        </p>
        <div className="meta">
          <Clearance nivel={mod.nivel} label={t(`level.${mod.nivel}`)} />
          <span className="label">{t("minutes", { n: mod.tiempoMin })}</span>
          <span className="label">{t("reviewed", { date: mod.ultimaRevision })}</span>
          <ModuleProgress keys={mod.lecciones.map((l) => `${mod.slug}/${l.slug}`)} />
        </div>
        {mod.prerrequisitos.length > 0 && (
          <p className="label">
            {t("prerequisites")}: {mod.prerrequisitos.join(", ")}
          </p>
        )}
      </header>
      <ol className="lessons">
        {mod.lecciones.map((l) => (
          <li key={l.slug}>
            <Link href={`/modules/${mod.slug}/${l.slug}`}>
              {l.titulo}
              <span className="check">
                <LessonCheck lessonKey={`${mod.slug}/${l.slug}`} />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
