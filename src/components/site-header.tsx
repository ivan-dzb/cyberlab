import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LocaleSwitcher } from "./locale-switcher";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "./theme-toggle";

type Theme = "system" | "light" | "dark";

function Mark() {
  // Retícula: anillo + cruz con hueco central. Se lee como "objetivo" sin ser un cliché de candado/escudo.
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 1.5v6M12 16.5v6M1.5 12h6M16.5 12h6" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export async function SiteHeader({ theme }: { theme: Theme }) {
  const t = await getTranslations("Nav");
  const user = await getCurrentUser();
  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/" className="wordmark" aria-label="CyberLab">
          <Mark />
          <span>CYBERLAB</span>
        </Link>
        <nav className="nav">
          <Link href="/modules">{t("modules")}</Link>
        </nav>
        <div className="tools">
          {user ? (
            <>
              <span className="label account" title={user.email}>{user.email}</span>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login" className="nav-link">{t("login")}</Link>
          )}
          <LocaleSwitcher />
          <ThemeToggle initial={theme} />
        </div>
      </div>
    </header>
  );
}
