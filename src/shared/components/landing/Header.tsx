import { useEffect, useState } from "react";
import { LayoutDashboard, Rocket } from "lucide-react";
import { useTranslations } from "@/i18n/useTranslations";
import classNames from "clsx";
import styles from "./Header.module.scss";
import Logo from "@/assets/images/logo.svg";

export function Header() {
  const t = useTranslations("landing.hero");
  const [isScrolled, setIsScrolled] = useState(false);

  const dashboardUrl = import.meta.env.VITE_DASHBOARD_URL;
  if (!dashboardUrl) {
    throw new Error("VITE_DASHBOARD_URL is required");
  }

  const miniappUrl = import.meta.env.VITE_MINIAPP_URL;
  if (!miniappUrl) {
    throw new Error("VITE_MINIAPP_URL is required");
  }

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={classNames(styles.header, {
        [styles.scrolled]: isScrolled,
      })}
    >
      {/* Left Button - Go to Dashboard (Desktop only) */}
      <div
        className={classNames(styles.leftButton, {
          [styles.scrolled]: isScrolled,
        })}
      >
        <a href={dashboardUrl} className={styles.dashboardLink}>
          <LayoutDashboard className={styles.icon} />
          <span>{t("goToDashboard")}</span>
        </a>
      </div>

      {/* Center Logo */}
      <div className={styles.logoContainer}>
        <img
          src={Logo}
          alt="BRND"
          width={120}
          height={40}
          className={classNames(styles.logo, {
            [styles.scrolled]: isScrolled,
          })}
          loading="eager"
        />
      </div>

      {/* Right Button - Open Miniapp (Desktop only) */}
      <a
        href={miniappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={classNames(styles.rightButton, styles.gradientBackground, {
          [styles.scrolled]: isScrolled,
        })}
      >
        <span className={styles.rightButtonInner}>
          <Rocket className={styles.icon} />
          <span>{t("openMiniapp")}</span>
        </span>
      </a>
    </header>
  );
}
