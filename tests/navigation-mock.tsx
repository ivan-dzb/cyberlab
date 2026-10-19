// Mock de `@/i18n/navigation` compartido por los tests de componentes.
import { vi } from "vitest";
import type { AnchorHTMLAttributes, ReactNode } from "react";

export const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() };
export const pathnameMock = { value: "/modules" };

export function Link({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode }) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

export class RedirectSignal extends Error {
  constructor(public args: unknown) {
    super("redirect");
  }
}

export const navigationModule = {
  Link,
  useRouter: () => router,
  usePathname: () => pathnameMock.value,
  redirect: (args: unknown) => {
    throw new RedirectSignal(args);
  },
};
