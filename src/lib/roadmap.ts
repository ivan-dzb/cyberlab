// Estructura del roadmap (docs/roadmap-aprendizaje.md): etapas y rango de módulos.
// Solo para el mapa; el contenido real vive en content/modules/.
export const STAGES = [
  { n: 0, from: 1, to: 7 },
  { n: 1, from: 8, to: 13 },
  { n: 2, from: 14, to: 19 },
  { n: 3, from: 20, to: 26 },
  { n: 4, from: 27, to: 34 },
  { n: 5, from: 35, to: 37 },
  { n: 6, from: 38, to: 41 },
  { n: 7, from: 42, to: 46 },
  { n: 8, from: 47, to: 52 },
] as const;

export const TOTAL_MODULES = 52;

export const moduleId = (n: number) => `M${String(n).padStart(2, "0")}`;
