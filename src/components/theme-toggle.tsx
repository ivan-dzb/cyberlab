"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Theme = "system" | "light" | "dark";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  document.cookie = `theme=${theme}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeToggle({ initial }: { initial: Theme }) {
  const t = useTranslations("Nav");
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <select
      aria-label={t("theme")}
      value={theme}
      onChange={(e) => setTheme(e.target.value as Theme)}
    >
      <option value="system">{t("themeSystem")}</option>
      <option value="light">{t("themeLight")}</option>
      <option value="dark">{t("themeDark")}</option>
    </select>
  );
}
