import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/auth-form";
import { Link } from "@/i18n/navigation";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");
  return (
    <main className="wrap page narrow">
      <h1>{t("loginTitle")}</h1>
      <AuthForm mode="login" />
      <p className="muted">
        {t("noAccount")} <Link href="/register">{t("registerLink")}</Link>
      </p>
    </main>
  );
}
