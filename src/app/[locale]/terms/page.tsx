import { getTranslations, setRequestLocale } from "next-intl/server";
import { Markdown } from "@/components/markdown";
import { getTerms } from "@/lib/legal";

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");
  const terms = await getTerms(locale);
  return (
    <main className="wrap page">
      <article className="reader">
        <p className="label">{t("termsVersion", { version: terms.version })}</p>
        <h1>{terms.titulo}</h1>
        <Markdown>{terms.body}</Markdown>
      </article>
    </main>
  );
}
