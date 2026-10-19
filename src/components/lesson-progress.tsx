"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

/*
  Progreso de lecciones. Con sesión iniciada vive en la BD (/api/progress); sin sesión,
  en localStorage. Al iniciar sesión, el progreso local se importa una vez y se limpia.
*/
const LS_KEY = "cyberlab:progress";

type State = { keys: ReadonlySet<string>; mode: "loading" | "server" | "local" };
const EMPTY: State = { keys: new Set(), mode: "loading" };

let state: State = EMPTY;
let started = false;
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

function readLocal(): string[] {
  try {
    return Object.keys(JSON.parse(localStorage.getItem(LS_KEY) ?? "{}"));
  } catch {
    return [];
  }
}

function writeLocal(keys: ReadonlySet<string>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(Object.fromEntries([...keys].map((k) => [k, true]))));
  } catch {
    // almacenamiento no disponible
  }
}

const json = { "content-type": "application/json" };

async function init() {
  if (started) return;
  started = true;
  try {
    const res = await fetch("/api/progress");
    if (res.ok) {
      const local = readLocal();
      if (local.length) {
        await fetch("/api/progress", { method: "POST", headers: json, body: JSON.stringify({ keys: local }) });
        try {
          localStorage.removeItem(LS_KEY);
        } catch {
          // ignorar
        }
      }
      const data = local.length ? await (await fetch("/api/progress")).json() : await res.json();
      set({ keys: new Set<string>(data.keys), mode: "server" });
      return;
    }
  } catch {
    // sin red: modo local
  }
  set({ keys: new Set(readLocal()), mode: "local" });
}

async function toggle(key: string) {
  const done = !state.keys.has(key);
  const keys = new Set(state.keys);
  if (done) keys.add(key);
  else keys.delete(key);
  const prev = state;
  set({ ...state, keys });
  if (state.mode === "local") return writeLocal(keys);
  try {
    const res = await fetch("/api/progress", { method: "PUT", headers: json, body: JSON.stringify({ key, done }) });
    if (!res.ok) set(prev);
  } catch {
    set(prev);
  }
}

function useProgress(): State {
  const s = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => EMPTY,
  );
  useEffect(() => {
    void init();
  }, []);
  return s;
}

export function LessonDoneButton({ lessonKey }: { lessonKey: string }) {
  const t = useTranslations("Modules");
  const done = useProgress().keys.has(lessonKey);
  return (
    <button type="button" className="btn" onClick={() => toggle(lessonKey)} aria-pressed={done}>
      {done ? t("markUndone") : t("markDone")}
    </button>
  );
}

export function ModuleProgress({ keys }: { keys: string[] }) {
  const t = useTranslations("Modules");
  const p = useProgress();
  const done = keys.filter((k) => p.keys.has(k)).length;
  return <span className="label">{t("progress", { done, total: keys.length })}</span>;
}

export function LessonCheck({ lessonKey }: { lessonKey: string }) {
  const done = useProgress().keys.has(lessonKey);
  return <span aria-hidden="true">{done ? "✓" : "○"}</span>;
}

/** Solo para tests: reinicia el estado del módulo entre casos. */
export function __resetProgressStoreForTests() {
  state = EMPTY;
  started = false;
  listeners.clear();
}
