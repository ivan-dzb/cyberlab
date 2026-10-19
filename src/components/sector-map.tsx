import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { moduleId, STAGES } from "@/lib/roadmap";

const COL_W = 104;
const ROW_H = 40;
const TOP = 78;
const LEFT = 36;

/** Mapa de sectores: una columna por etapa, un nodo por módulo. Encendidos = publicados. */
export async function SectorMap({ published }: { published: Record<string, string> }) {
  const t = await getTranslations("Stages");
  const rows = Math.max(...STAGES.map((s) => s.to - s.from + 1));
  const width = LEFT * 2 + COL_W * (STAGES.length - 1) + 40;
  const height = TOP + rows * ROW_H + 16;

  return (
    <svg className="sector-map" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t("aria")}>
      {STAGES.map((s, ci) => {
        const x = LEFT + ci * COL_W;
        const count = s.to - s.from + 1;
        const next = STAGES[ci + 1];
        return (
          <g key={s.n}>
            <text className="stage-n" x={x - 8} y={36}>
              {String(s.n).padStart(2, "0")}
            </text>
            <text className="stage-t" x={x - 8} y={54}>
              {t(`s${s.n}`)}
            </text>
            <line className="col-line" x1={x} y1={TOP - 8} x2={x} y2={TOP + (count - 1) * ROW_H + 8} />
            {next && (
              <line className="link" x1={x} y1={TOP} x2={x + COL_W} y2={TOP} />
            )}
            {Array.from({ length: count }, (_, i) => {
              const id = moduleId(s.from + i);
              const y = TOP + i * ROW_H;
              const slug = published[id];
              const node = (
                <g className={slug ? "on" : undefined}>
                  {slug && <circle className="halo" cx={x} cy={y} r={14} />}
                  <circle className="node" cx={x} cy={y} r={6} />
                  <text className="id" x={x + 14} y={y + 3}>
                    {id}
                  </text>
                  <title>{slug ? `${id} — ${t("available")}` : `${id} — ${t("soon")}`}</title>
                </g>
              );
              return slug ? (
                <Link key={id} href={`/modules/${slug}`}>
                  {node}
                </Link>
              ) : (
                <g key={id}>{node}</g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
