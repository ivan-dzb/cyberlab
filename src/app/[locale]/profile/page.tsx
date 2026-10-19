import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clearance } from "@/components/clearance";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listModules, type Nivel } from "@/lib/content";
import { getCompletedChallenges, getCompletedLessonKeys, getXp } from "@/lib/stats";
import { levelFor } from "@/lib/xp";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });

  const t = await getTranslations("Profile");
  const tm = await getTranslations("Modules");
  const [xp, challenges, lessonKeys, modules] = await Promise.all([
    getXp(user.id),
    getCompletedChallenges(user.id, locale),
    getCompletedLessonKeys(user.id),
    listModules(locale),
  ]);
  const lv = levelFor(xp);
  const lessonTitles = new Map<string, { m: (typeof modules)[number]; l: { slug: string; titulo: string } }>(
    modules.flatMap((m) => m.lecciones.map((l): [string, { m: (typeof modules)[number]; l: typeof l }] => [`${m.slug}/${l.slug}`, { m, l }])),
  );
  const lessons = lessonKeys.map((k) => lessonTitles.get(k)).filter((v): v is NonNullable<typeof v> => !!v);
  const segments = 20;

  return (
    <main className="wrap page">
      <header className="page-head">
        <p className="label">
          <b>●</b> {t("kicker")}
        </p>
        <h1>{user.email}</h1>
      </header>

      <section className="panel xp-card">
        <div>
          <span className="label">{t("level")}</span>
          <span className="big-num">{lv.level}</span>
        </div>
        <div className="xp-bar-wrap">
          <p className="label">
            {t("xp", { xp: lv.xp })}
            {lv.next !== null ? ` · ${t("toNext", { n: lv.next - lv.xp })}` : ` · ${t("maxLevel")}`}
          </p>
          <div className="meter xp-meter" role="img" aria-label={`${Math.round(lv.progress * 100)}%`}>
            {Array.from({ length: segments }, (_, i) => (
              <i key={i} className={i < Math.round(lv.progress * segments) ? "on" : undefined} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>{t("challenges")}</h2>
          <p className="label">{challenges.length}</p>
        </div>
        {challenges.length === 0 ? (
          <p className="muted">
            {t("noChallenges")} <Link href="/challenges">{t("goChallenges")}</Link>
          </p>
        ) : (
          <ul className="lessons">
            {challenges.map((c) => (
              <li key={c.slug}>
                <Link href={`/challenges/${c.slug}`} data-nivel={c.nivel}>
                  {c.titulo}
                  <span className="check">
                    <Clearance nivel={c.nivel as Nivel} label={tm(`level.${c.nivel as Nivel}`)} /> · {c.xp} XP
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>{t("lessons")}</h2>
          <p className="label">{lessons.length}</p>
        </div>
        {lessons.length === 0 ? (
          <p className="muted">
            {t("noLessons")} <Link href="/modules">{t("goModules")}</Link>
          </p>
        ) : (
          <ul className="lessons">
            {lessons.map(({ m, l }) => (
              <li key={`${m.slug}/${l.slug}`}>
                <Link href={`/modules/${m.slug}/${l.slug}`}>
                  {l.titulo}
                  <span className="check label">{m.id}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
