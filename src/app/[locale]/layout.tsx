import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { routing } from "@/i18n/routing";
import "../globals.css";

const display = Instrument_Serif({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--f-display" });
const body = Geist({ subsets: ["latin"], variable: "--f-body" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--f-mono" });

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
  const tFooter = await getTranslations("Footer");

  const cookieTheme = (await cookies()).get("theme")?.value;
  const theme: Theme = cookieTheme === "light" || cookieTheme === "dark" ? cookieTheme : "system";

  return (
    <html
      lang={locale}
      data-theme={theme === "system" ? undefined : theme}
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>
        <NextIntlClientProvider>
          <SiteHeader theme={theme} />
          {children}
          <footer className="site-footer">
            <div className="wrap">
              <p className="label">{tFooter("tag")}</p>
              <p className="muted">{tFooter("disclaimer")}</p>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
