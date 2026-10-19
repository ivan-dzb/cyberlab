import type { Nivel } from "@/lib/content";

const ORDER: Nivel[] = ["principiante", "intermedio", "avanzado", "experto"];

/** Nivel de acreditación: 4 segmentos, encendidos hasta el nivel. */
export function Clearance({ nivel, label }: { nivel: Nivel; label: string }) {
  const level = ORDER.indexOf(nivel) + 1;
  return (
    <span className="clearance" data-nivel={nivel}>
      <span className="pips" aria-hidden="true">
        {ORDER.map((n, i) => (
          <i key={n} className={i < level ? "on" : undefined} />
        ))}
      </span>
      {label}
    </span>
  );
}
