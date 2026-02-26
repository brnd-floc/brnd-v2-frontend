import { LayoutDashboard, Rocket } from "lucide-react"
import { useTranslations } from "@/i18n/useTranslations"
import styles from "./StickyBottomBar.module.scss"

export function StickyBottomBar() {
    const t = useTranslations('landing.hero')

    const dashboardUrl = import.meta.env.VITE_DASHBOARD_URL || "https://brnd.land"
    const miniappUrl = import.meta.env.VITE_MINIAPP_URL || "https://miniapp.brndland.com"

    return (
        <div className={styles.container}>
            {/* Button container */}
            <div className={styles.buttonContainer}>
                {/* Dashboard Button */}
                <div className={styles.dashboardButton}>
                    <a
                        href={dashboardUrl}
                        className={styles.dashboardLink}
                    >
                        <LayoutDashboard className={styles.icon} />
                        <span>{t('goToDashboard')}</span>
                    </a>
                </div>

                {/* Miniapp Button */}
                <a
                    href={miniappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.miniappButton} ${styles.gradientBackground}`}
                >
                    <span className={styles.miniappButtonInner}>
                        <Rocket className={styles.icon} />
                        <span>{t('openMiniapp')}</span>
                    </span>
                </a>
            </div>
        </div>
    )
}
