"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      if (res.ok) {
        router.push("/modules");
        router.refresh();
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "server");
    } catch {
      setError("server");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form panel">
      <label>
        <span className="label">{t("email")}</span>
        <input name="email" type="email" autoComplete="email" required maxLength={254} />
      </label>
      <label>
        <span className="label">{t("password")}</span>
        <input
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={mode === "register" ? 10 : 1}
          maxLength={128}
        />
        {mode === "register" && <small className="muted">{t("passwordHint")}</small>}
      </label>
      {error && (
        <p role="alert" className="form-error">
          {t(`errors.${error}` as never)}
        </p>
      )}
      <button className="btn" type="submit" disabled={busy}>
        {t(mode === "login" ? "submitLogin" : "submitRegister")}
      </button>
    </form>
  );
}
