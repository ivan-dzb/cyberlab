"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type Active = { id: string; slug: string; url: string; expiresAt: string };
const json = { "content-type": "application/json" };

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function SessionPanel({ slug }: { slug: string }) {
  const t = useTranslations("Session");
  const [loaded, setLoaded] = useState(false);
  const [authed, setAuthed] = useState(true);
  const [active, setActive] = useState<Active | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.status === 401) {
        setAuthed(false);
      } else if (res.ok) {
        setActive((await res.json()).session);
      }
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);

  const remaining = active ? new Date(active.expiresAt).getTime() - now : 0;
  useEffect(() => {
    if (active && remaining <= 0) void refresh(); // expiró: sincroniza con el servidor
  }, [active, remaining, refresh]);

  async function act(fn: () => Promise<Response>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "server");
      }
      await refresh();
    } catch {
      setError("server");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return null;
  if (!authed) {
    return (
      <div className="panel session-panel">
        <p>
          <Link href="/login">{t("loginToStart")}</Link>
        </p>
      </div>
    );
  }

  const mine = active?.slug === slug;
  return (
    <div className="panel session-panel">
      {!active && (
        <>
          <p className="muted">{t("intro")}</p>
          <button
            className="btn"
            disabled={busy}
            onClick={() => act(() => fetch("/api/sessions", { method: "POST", headers: json, body: JSON.stringify({ slug }) }))}
          >
            {busy ? t("starting") : t("start")}
          </button>
        </>
      )}
      {active && !mine && <p className="muted">{t("otherActive")}</p>}
      {active && mine && (
        <>
          <p className="label">
            {t("remaining")}: <b>{fmt(remaining)}</b>
          </p>
          <p>
            <a className="btn" href={active.url} target="_blank" rel="noopener noreferrer">
              {t("open")} ↗
            </a>
          </p>
          <div className="meta">
            <button
              className="btn ghost"
              disabled={busy}
              onClick={() => act(() => fetch(`/api/sessions/${active.id}/extend`, { method: "POST", headers: json, body: "{}" }))}
            >
              {t("extend")}
            </button>
            <button
              className="btn ghost"
              disabled={busy}
              onClick={() => act(() => fetch(`/api/sessions/${active.id}`, { method: "DELETE", headers: json, body: "{}" }))}
            >
              {t("end")}
            </button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="form-error">
          {t(`errors.${error}` as never)}
        </p>
      )}
    </div>
  );
}
