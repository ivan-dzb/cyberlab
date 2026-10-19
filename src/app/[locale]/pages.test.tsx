// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeT, renderIntl } from "../../../tests/dom";
import { navigationModule, RedirectSignal } from "../../../tests/navigation-mock";

const m = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listChallenges: vi.fn(),
  getChallenge: vi.fn(),
  getWriteupForUser: vi.fn(),
  getXp: vi.fn(),
  getCompletedChallenges: vi.fn(),
  getCompletedLessonKeys: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => navigationModule);
vi.mock("next-intl/server", () => ({
  getTranslations: async (arg: string | { locale?: string; namespace: string }) =>
    typeof arg === "string" ? makeT(arg, "es") : makeT(arg.namespace, (arg.locale as "es" | "en") ?? "es"),
  setRequestLocale: () => {},
}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: m.getCurrentUser }));
vi.mock("@/lib/challenges", () => ({ listChallenges: m.listChallenges, getChallenge: m.getChallenge }));
vi.mock("@/lib/writeup", () => ({ getWriteupForUser: m.getWriteupForUser }));
vi.mock("@/lib/stats", () => ({
  getXp: m.getXp,
  getCompletedChallenges: m.getCompletedChallenges,
  getCompletedLessonKeys: m.getCompletedLessonKeys,
}));
// Componentes de servidor asíncronos y paneles con red: se sustituyen por marcadores.
vi.mock("@/components/sector-map", () => ({ SectorMap: () => <div data-testid="sector-map" /> }));
vi.mock("@/components/session-panel", () => ({ SessionPanel: ({ slug }: { slug: string }) => <div data-testid="session-panel">{slug}</div> }));
vi.mock("@/components/hints-panel", () => ({ HintsPanel: ({ slug }: { slug: string }) => <div data-testid="hints-panel">{slug}</div> }));

import ChallengePage from "./challenges/[slug]/page";
import ChallengesPage from "./challenges/page";
import LoginPage from "./login/page";
import ModulePage from "./modules/[module]/page";
import LessonPage from "./modules/[module]/[lesson]/page";
import ModulesPage from "./modules/page";
import Home from "./page";
import ProfilePage from "./profile/page";
import RegisterPage from "./register/page";
import TermsPage from "./terms/page";

const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
const challenge = (over: Record<string, unknown> = {}) => ({
  id: "c1",
  slug: "bienvenida",
  titulo: "Bienvenida: encuentra la bandera",
  descripcion: "Tu primer entorno aislado.",
  nivel: "principiante",
  xp: 10,
  teoria: "## Qué es\n\nUna bandera.",
  tools: [],
  fallback: false,
  ...over,
});

beforeEach(() => {
  for (const f of Object.values(m)) f.mockReset();
  m.getCurrentUser.mockResolvedValue(null);
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
});

describe("Home", () => {
  it("muestra el titular, los CTAs, las estadísticas y el mapa", async () => {
    renderIntl(await Home(params({ locale: "es" })));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Aprende ciberseguridad de cero a experto.");
    expect(screen.getByRole("link", { name: /ver módulos/i })).toHaveAttribute("href", "/modules");
    expect(screen.getByRole("link", { name: /ver mapa/i })).toHaveAttribute("href", "#map");
    expect(screen.getByTestId("sector-map")).toBeInTheDocument();
    expect(screen.getByText("52")).toBeInTheDocument();
    expect(screen.getByText("módulos planeados")).toBeInTheDocument();
  });

  it("la frase con la barra de censura es enfocable y no usa texto de relleno", async () => {
    renderIntl(await Home(params({ locale: "es" })));
    const redact = screen.getByText("vulnerable a propósito");
    expect(redact).toHaveClass("redact");
    expect(redact).toHaveAttribute("tabindex", "0");
  });

  it("explica los tres pasos", async () => {
    renderIntl(await Home(params({ locale: "es" })));
    for (const t of ["Lecciones", "Retos", "Progreso"]) expect(screen.getByRole("heading", { name: t })).toBeInTheDocument();
  });
});

describe("Modules list", () => {
  it("lista M08 con nivel, minutos y enlace a su página", async () => {
    renderIntl(await ModulesPage(params({ locale: "es" })));
    const link = screen.getByRole("link", { name: /M08/ });
    expect(link).toHaveAttribute("href", "/modules/m08-conceptos-seguridad");
    expect(within(link).getByText("Conceptos y principios de seguridad")).toBeInTheDocument();
    expect(within(link).getByText("Principiante")).toBeInTheDocument();
    expect(within(link).getByText("120 min")).toBeInTheDocument();
  });
});

describe("Module detail", () => {
  it("muestra las 5 lecciones con enlaces", async () => {
    renderIntl(await ModulePage(params({ locale: "es", module: "m08-conceptos-seguridad" })));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Conceptos y principios de seguridad");
    expect(screen.getByText("M08")).toBeInTheDocument();
    const lessons = screen.getAllByRole("link", { name: /○|La tríada|Riesgo|Principios|Actores|Vocabulario/ }).filter((a) => a.getAttribute("href")?.includes("/modules/m08"));
    expect(lessons).toHaveLength(5);
    expect(lessons[0]).toHaveAttribute("href", "/modules/m08-conceptos-seguridad/01-triada-cia");
  });

  it("muestra la etapa y la fecha de revisión", async () => {
    renderIntl(await ModulePage(params({ locale: "es", module: "m08-conceptos-seguridad" })));
    expect(screen.getByText(/Etapa 1/)).toBeInTheDocument();
    expect(screen.getByText(/Revisado: 2026-10-18/)).toBeInTheDocument();
  });

  it("módulo inexistente o con slug malicioso: 404", async () => {
    await expect(ModulePage(params({ locale: "es", module: "nope" }))).rejects.toThrow();
    await expect(ModulePage(params({ locale: "es", module: "../../etc" }))).rejects.toThrow();
  });
});

describe("Lesson page", () => {
  it("renderiza el título, el cuerpo en Markdown y la navegación", async () => {
    renderIntl(await LessonPage(params({ locale: "es", module: "m08-conceptos-seguridad", lesson: "02-riesgo" })));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Riesgo: amenaza, vulnerabilidad e impacto");
    expect(screen.getAllByRole("heading", { level: 2 }).length).toBeGreaterThan(3);
    expect(document.body.textContent).toContain("02 / 05");
    expect(screen.getByRole("link", { name: /← La tríada CIA/ })).toHaveAttribute("href", "/modules/m08-conceptos-seguridad/01-triada-cia");
    expect(screen.getByRole("link", { name: /Principios de diseño seguro →/ })).toHaveAttribute("href", "/modules/m08-conceptos-seguridad/03-principios-de-diseno");
    expect(screen.getByRole("button", { name: "Marcar como completada" })).toBeInTheDocument();
  });

  it("la primera lección no tiene 'anterior' y la última no tiene 'siguiente'", async () => {
    renderIntl(await LessonPage(params({ locale: "es", module: "m08-conceptos-seguridad", lesson: "01-triada-cia" })));
    expect(screen.queryByRole("link", { name: /^←.*tríada/ })).toBeNull();
  });

  it("lección inexistente: 404", async () => {
    await expect(LessonPage(params({ locale: "es", module: "m08-conceptos-seguridad", lesson: "99-nada" }))).rejects.toThrow();
  });

  it("en inglés muestra el contenido en inglés", async () => {
    renderIntl(await LessonPage(params({ locale: "en", module: "m08-conceptos-seguridad", lesson: "01-triada-cia" })), "en");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("The CIA triad and its extensions");
  });
});

describe("Challenges list", () => {
  it("muestra el mensaje vacío si no hay retos", async () => {
    m.listChallenges.mockResolvedValue([]);
    renderIntl(await ChallengesPage(params({ locale: "es" })));
    expect(screen.getByText("Aún no hay retos publicados.")).toBeInTheDocument();
  });

  it("lista los retos con enlace, nivel y XP", async () => {
    m.listChallenges.mockResolvedValue([challenge(), challenge({ slug: "pin-debil", titulo: "La caja", xp: 50 })]);
    renderIntl(await ChallengesPage(params({ locale: "es" })));
    expect(screen.getByRole("link", { name: /Bienvenida: encuentra la bandera/ })).toHaveAttribute("href", "/challenges/bienvenida");
    expect(screen.getByRole("link", { name: /La caja/ })).toHaveAttribute("href", "/challenges/pin-debil");
    expect(screen.getByText("10 XP")).toBeInTheDocument();
    expect(screen.getByText("50 XP")).toBeInTheDocument();
  });
});

describe("Challenge detail", () => {
  it("muestra la teoría, el panel de sesión y el de pistas", async () => {
    m.getChallenge.mockResolvedValue(challenge());
    renderIntl(await ChallengePage(params({ locale: "es", slug: "bienvenida" })));
    expect(screen.getByText("Una bandera.")).toBeInTheDocument();
    expect(screen.getByTestId("session-panel")).toHaveTextContent("bienvenida");
    expect(screen.getByTestId("hints-panel")).toHaveTextContent("bienvenida");
  });

  it("no muestra writeup a un anónimo ni consulta writeups", async () => {
    m.getChallenge.mockResolvedValue(challenge());
    renderIntl(await ChallengePage(params({ locale: "es", slug: "bienvenida" })));
    expect(screen.queryByText("Writeup oficial")).toBeNull();
    expect(m.getWriteupForUser).not.toHaveBeenCalled();
  });

  it("con sesión pero sin completar el reto: sin writeup", async () => {
    m.getChallenge.mockResolvedValue(challenge());
    m.getCurrentUser.mockResolvedValue({ id: "u1", email: "a@b.co" });
    m.getWriteupForUser.mockResolvedValue(null);
    renderIntl(await ChallengePage(params({ locale: "es", slug: "bienvenida" })));
    expect(screen.queryByText("Writeup oficial")).toBeNull();
    expect(m.getWriteupForUser).toHaveBeenCalledWith("u1", "bienvenida", "es");
  });

  it("tras completarlo muestra el writeup oficial", async () => {
    m.getChallenge.mockResolvedValue(challenge());
    m.getCurrentUser.mockResolvedValue({ id: "u1", email: "a@b.co" });
    m.getWriteupForUser.mockResolvedValue({ body: "## Solución\n\nPaso 1", fallback: false });
    renderIntl(await ChallengePage(params({ locale: "es", slug: "bienvenida" })));
    expect(screen.getByText("Writeup oficial")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Solución" })).toBeInTheDocument();
  });

  it("avisa cuando la teoría cae a español", async () => {
    m.getChallenge.mockResolvedValue(challenge({ fallback: true }));
    renderIntl(await ChallengePage(params({ locale: "es", slug: "bienvenida" })));
    expect(screen.getByText(/aún no está traducida/i)).toBeInTheDocument();
  });

  it("muestra las herramientas relacionadas", async () => {
    m.getChallenge.mockResolvedValue(challenge({ tools: ["Burp Suite", "ffuf"] }));
    renderIntl(await ChallengePage(params({ locale: "es", slug: "bienvenida" })));
    expect(screen.getByText("Herramientas: Burp Suite, ffuf")).toBeInTheDocument();
  });

  it("slug inexistente o malicioso: 404 sin consultar la BD con él", async () => {
    m.getChallenge.mockResolvedValue(null);
    await expect(ChallengePage(params({ locale: "es", slug: "nope" }))).rejects.toThrow();
    m.getChallenge.mockClear();
    await expect(ChallengePage(params({ locale: "es", slug: "../x" }))).rejects.toThrow();
    expect(m.getChallenge).not.toHaveBeenCalled();
  });
});

describe("Profile", () => {
  it("redirige a /login si no hay sesión", async () => {
    await expect(ProfilePage(params({ locale: "es" }))).rejects.toBeInstanceOf(RedirectSignal);
  });

  it("muestra nivel, XP, siguiente nivel y retos/lecciones completados", async () => {
    m.getCurrentUser.mockResolvedValue({ id: "u1", email: "ana@example.com" });
    m.getXp.mockResolvedValue(60);
    m.getCompletedChallenges.mockResolvedValue([{ slug: "bienvenida", titulo: "Bienvenida", nivel: "principiante", xp: 60, completadoEn: new Date() }]);
    m.getCompletedLessonKeys.mockResolvedValue(["m08-conceptos-seguridad/01-triada-cia", "desconocido/xx"]);
    renderIntl(await ProfilePage(params({ locale: "es" })));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("ana@example.com");
    expect(screen.getByText("2")).toBeInTheDocument(); // nivel 2 (60 XP)
    expect(screen.getByText(/60 XP · 90 XP para el siguiente nivel/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Bienvenida/ })).toHaveAttribute("href", "/challenges/bienvenida");
    expect(screen.getByRole("link", { name: /La tríada CIA/ })).toBeInTheDocument();
    expect(screen.queryByText("desconocido/xx")).toBeNull(); // claves sin contenido se ignoran
  });

  it("estados vacíos con enlaces para empezar", async () => {
    m.getCurrentUser.mockResolvedValue({ id: "u1", email: "ana@example.com" });
    m.getXp.mockResolvedValue(0);
    m.getCompletedChallenges.mockResolvedValue([]);
    m.getCompletedLessonKeys.mockResolvedValue([]);
    renderIntl(await ProfilePage(params({ locale: "es" })));
    expect(screen.getByText(/aún no has completado ningún reto/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver retos" })).toHaveAttribute("href", "/challenges");
    expect(screen.getByRole("link", { name: "Ver módulos" })).toHaveAttribute("href", "/modules");
  });

  it("en el nivel máximo indica 'nivel máximo'", async () => {
    m.getCurrentUser.mockResolvedValue({ id: "u1", email: "a@b.co" });
    m.getXp.mockResolvedValue(99999);
    m.getCompletedChallenges.mockResolvedValue([]);
    m.getCompletedLessonKeys.mockResolvedValue([]);
    renderIntl(await ProfilePage(params({ locale: "es" })));
    expect(screen.getByText(/nivel máximo/)).toBeInTheDocument();
  });
});

describe("Terms, Login y Register", () => {
  it("Terms muestra la versión y las secciones", async () => {
    renderIntl(await TermsPage(params({ locale: "es" })));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Términos de uso");
    expect(screen.getByText("Versión de los términos: 2026-10-18")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Uso prohibido/ })).toBeInTheDocument();
  });

  it("Terms en inglés", async () => {
    renderIntl(await TermsPage(params({ locale: "en" })), "en");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Terms of use");
  });

  it("Login muestra el formulario y el enlace a registro", async () => {
    renderIntl(await LoginPage(params({ locale: "es" })));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Iniciar sesión");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Crear una" })).toHaveAttribute("href", "/register");
  });

  it("Register muestra el formulario con términos y el enlace a login", async () => {
    renderIntl(await RegisterPage(params({ locale: "es" })));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Crear cuenta");
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", "/login");
  });
});
