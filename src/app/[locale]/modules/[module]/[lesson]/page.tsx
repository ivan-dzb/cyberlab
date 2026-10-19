import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LessonDoneButton } from "@/components/lesson-progress";
import { Markdown } from "@/components/markdown";
import { Link } from "@/i18n/navigation";
import { getLesson, getModule } from "@/lib/content";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ locale: string; module: string; lesson: string }>;
}) {
  const { locale, module: moduleSlug, lesson: lessonSlug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Modules");
  const mod = await getModule(moduleSlug, locale);
  const lesson = mod ? await getLesson(moduleSlug, lessonSlug, locale) : null;
  if (!mod || !lesson) notFound();

  const idx = mod.lecciones.findIndex((l) => l.slug === lessonSlug);
  const prev = mod.lecciones[idx - 1];
  const next = mod.lecciones[idx + 1];

  return (
    <main className="wrap page">
      <article className="reader">
        <p>
          <Link href={`/modules/${mod.slug}`} className="crumb">
            ← {mod.id} · {mod.titulo}
          </Link>
        </p>
        {lesson.fallback && <p className="notice">{t("fallbackNotice")}</p>}
        <p className="label">
          <b>{String(idx + 1).padStart(2, "0")}</b> / {String(mod.lecciones.length).padStart(2, "0")} ·{" "}
          {t("minutes", { n: lesson.tiempoMin })} · {t("reviewed", { date: lesson.ultimaRevision })}
        </p>
        <h1>{lesson.titulo}</h1>
        <Markdown>{lesson.body}</Markdown>
        <p style={{ marginTop: "2.5rem" }}>
          <LessonDoneButton lessonKey={`${mod.slug}/${lesson.slug}`} />
        </p>
        <nav className="pager">
          {prev ? <Link href={`/modules/${mod.slug}/${prev.slug}`}>← {prev.titulo}</Link> : <span />}
          {next ? <Link href={`/modules/${mod.slug}/${next.slug}`}>{next.titulo} →</Link> : <span />}
        </nav>
      </article>
    </main>
  );
}
