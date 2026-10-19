"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export function LogoutButton() {
  const t = useTranslations("Auth");
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    router.push("/");
    router.refresh();
  }

  return (
    <button type="button" className="linklike" onClick={logout}>
      {t("logout")}
    </button>
  );
}
