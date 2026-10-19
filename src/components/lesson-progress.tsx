"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

// Progreso provisional en localStorage hasta que exista autenticación (luego pasa a BD).
const KEY = "cyberlab:progress";
const EVENT = "cyberlab:progress-change";

function read(): Record<string, true> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function snapshot(): string {
  try {
    return localStorage.getItem(KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

function useProgress(): Record<string, true> {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "{}");
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function LessonDoneButton({ lessonKey }: { lessonKey: string }) {
  const t = useTranslations("Modules");
  const done = !!useProgress()[lessonKey];

  function toggle() {
    const p = read();
    if (p[lessonKey]) delete p[lessonKey];
    else p[lessonKey] = true;
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      return;
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button type="button" className="btn" onClick={toggle} aria-pressed={done}>
      {done ? t("markUndone") : t("markDone")}
    </button>
  );
}

export function ModuleProgress({ keys }: { keys: string[] }) {
  const t = useTranslations("Modules");
  const p = useProgress();
  const done = keys.filter((k) => p[k]).length;
  return (
    <span className="label">
      {t("progress", { done, total: keys.length })}
    </span>
  );
}

export function LessonCheck({ lessonKey }: { lessonKey: string }) {
  const done = !!useProgress()[lessonKey];
  return <span aria-hidden="true">{done ? "✓" : "○"}</span>;
}
