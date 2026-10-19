import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/auth-form";
import { Link } from "@/i18n/navigation";

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");
  return (
    <main className="wrap page narrow">
      <h1>{t("registerTitle")}</h1>
      <AuthForm mode="register" />
      <p className="muted">
        {t("haveAccount")} <Link href="/login">{t("loginLink")}</Link>
      </p>
    </main>
  );
}
