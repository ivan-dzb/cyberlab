import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clearance } from "@/components/clearance";
import { Link } from "@/i18n/navigation";
import { listChallenges } from "@/lib/challenges";

export const dynamic = "force-dynamic";

export default async function ChallengesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Challenges");
  const tm = await getTranslations("Modules");
  const challenges = await listChallenges(locale);

  return (
    <main className="wrap page">
      <header className="page-head">
        <p className="label">
          <b>●</b> {t("kicker")}
        </p>
        <h1>{t("title")}</h1>
      </header>
      {challenges.length === 0 && <p className="muted">{t("empty")}</p>}
      <ul className="cards">
        {challenges.map((c) => (
          <li key={c.slug}>
            <Link href={`/challenges/${c.slug}`} className="panel module-card" data-nivel={c.nivel}>
              <h2>{c.titulo}</h2>
              <p>{c.descripcion}</p>
              <div className="meta">
                <Clearance nivel={c.nivel} label={tm(`level.${c.nivel}`)} />
                <span className="label">{t("xp", { n: c.xp })}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
