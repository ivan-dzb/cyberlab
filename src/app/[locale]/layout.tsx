import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { routing } from "@/i18n/routing";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return { title: t("title"), description: t("description") };
}

type Theme = "system" | "light" | "dark";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const cookieTheme = (await cookies()).get("theme")?.value;
  const theme: Theme = cookieTheme === "light" || cookieTheme === "dark" ? cookieTheme : "system";

  return (
    <html lang={locale} data-theme={theme === "system" ? undefined : theme}>
      <body>
        <NextIntlClientProvider>
          <header className="topbar">
            <LocaleSwitcher />
            <ThemeToggle initial={theme} />
          </header>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
