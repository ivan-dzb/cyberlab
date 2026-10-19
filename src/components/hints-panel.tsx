"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Markdown } from "@/components/markdown";
import { xpFor } from "@/lib/xp";

type State = { total: number; unlocked: number; hints: string[]; completed: boolean };

export function HintsPanel({ slug, baseXp }: { slug: string; baseXp: number }) {
  const t = useTranslations("Hints");
  const locale = useLocale();
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/challenges/${slug}/hints?locale=${locale}`);
    if (res.ok) setState(await res.json());
  }, [slug, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  async function unlock() {
    if (!state || !window.confirm(t("confirm", { xp: xpFor(baseXp, state.unlocked + 1) }))) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/challenges/${slug}/hints/unlock`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      if (res.ok) setState(await res.json());
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (!state || state.total === 0) return null; // sin sesión iniciada o sin pistas: no se muestra

  return (
    <section className="panel hints-panel">
      <p className="label">
        {t("title")} · {state.unlocked}/{state.total}
      </p>
      {state.hints.map((h, i) => (
        <div key={i} className="hint">
          <span className="label">{t("hint", { n: i + 1 })}</span>
          <Markdown>{h}</Markdown>
        </div>
      ))}
      {!state.completed && state.unlocked < state.total && (
        <button className="btn ghost" onClick={unlock} disabled={busy}>
          {t("reveal", { xp: xpFor(baseXp, state.unlocked + 1) })}
        </button>
      )}
      {error && <p role="alert" className="form-error">{t("error")}</p>}
    </section>
  );
}
