// Utilidades para tests de componentes: proveedor de next-intl con los mensajes reales
// y un traductor equivalente para componentes de servidor.
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import en from "../messages/en.json";
import es from "../messages/es.json";

export const messages = { es, en } as const;
export type Locale = keyof typeof messages;

export function renderIntl(ui: ReactElement, locale: Locale = "es") {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      {ui}
    </NextIntlClientProvider>,
  );
}

/** Traductor mínimo (claves anidadas y {variables}) para mockear `getTranslations` en componentes de servidor. */
export function makeT(namespace: string, locale: Locale = "es") {
  return (key: string, values: Record<string, string | number> = {}) => {
    const path = `${namespace}.${key}`.split(".");
    let node: unknown = messages[locale];
    for (const p of path) node = (node as Record<string, unknown> | undefined)?.[p];
    if (typeof node !== "string") throw new Error(`Falta la traducción ${locale}:${path.join(".")}`);
    return node.replace(/\{(\w+)\}/g, (_m, k) => String(values[k] ?? `{${k}}`));
  };
}

/** Todas las claves de un objeto de mensajes, como rutas "a.b.c". */
export function flattenKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => flattenKeys(v, prefix ? `${prefix}.${k}` : k));
}
