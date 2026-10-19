// Reglas de XP y niveles. Un único lugar para que UI y API calculen lo mismo.

/** XP acumulado necesario para alcanzar cada nivel (índice 0 = nivel 1). */
const THRESHOLDS = [0, 50, 150, 300, 500, 800, 1200, 1800, 2600, 3600];

/** Cada pista usada reduce el XP un 20 %, con un mínimo del 40 %. */
export function xpFor(baseXp: number, hintsUsed: number): number {
  const factor = Math.max(0.4, 1 - 0.2 * hintsUsed);
  return Math.round(baseXp * factor);
}

export function levelFor(xp: number) {
  let level = 1;
  for (let i = 0; i < THRESHOLDS.length; i++) if (xp >= THRESHOLDS[i]) level = i + 1;
  const floor = THRESHOLDS[level - 1];
  const next = THRESHOLDS[level] ?? null; // null = nivel máximo
  return { level, xp, floor, next, progress: next === null ? 1 : (xp - floor) / (next - floor) };
}
