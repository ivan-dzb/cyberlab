// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { navigationModule, router } from "../../tests/navigation-mock";
import { renderIntl } from "../../tests/dom";

vi.mock("@/i18n/navigation", () => navigationModule);

import { LogoutButton } from "./logout-button";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetchMock);
  router.push.mockReset();
  router.refresh.mockReset();
});

describe("LogoutButton", () => {
  it("llama a POST /api/auth/logout con JSON, vuelve al inicio y refresca", async () => {
    renderIntl(<LogoutButton />);
    await userEvent.click(screen.getByRole("button", { name: "Salir" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/"));
    expect(router.refresh).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/logout");
    expect(init.method).toBe("POST");
    expect(init.headers["content-type"]).toBe("application/json");
  });

  it("muestra el texto en inglés", () => {
    renderIntl(<LogoutButton />, "en");
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });
});
