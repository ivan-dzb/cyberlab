import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clearance } from "@/components/clearance";
import { HintsPanel } from "@/components/hints-panel";
import { Markdown } from "@/components/markdown";
import { SessionPanel } from "@/components/session-panel";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getChallenge } from "@/lib/challenges";
import { getWriteupForUser } from "@/lib/writeup";

export const dynamic = "force-dynamic";

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Challenges");
  const tm = await getTranslations("Modules");
  const c = /^[a-z0-9][a-z0-9-]*$/.test(slug) ? await getChallenge(slug, locale) : null;
  if (!c) notFound();

  const user = await getCurrentUser();
  const writeup = user ? await getWriteupForUser(user.id, c.slug, locale) : null;

  return (
    <main className="wrap page">
      <article className="reader">
        <p>
          <Link href="/challenges" className="crumb">
            ← {t("title")}
          </Link>
        </p>
        {c.fallback && <p className="notice">{tm("fallbackNotice")}</p>}
        <div className="meta" data-nivel={c.nivel}>
          <Clearance nivel={c.nivel} label={tm(`level.${c.nivel}`)} />
          <span className="label">{t("xp", { n: c.xp })}</span>
          {c.tools.length > 0 && <span className="label">{t("tools")}: {c.tools.join(", ")}</span>}
        </div>
        <Markdown>{c.teoria}</Markdown>
        <SessionPanel slug={c.slug} />
        <HintsPanel slug={c.slug} baseXp={c.xp} />
        {writeup && (
          <section className="panel writeup">
            <p className="label">{t("writeup")}</p>
            {writeup.fallback && <p className="notice">{tm("fallbackNotice")}</p>}
            <Markdown>{writeup.body}</Markdown>
          </section>
        )}
      </article>
    </main>
  );
}
