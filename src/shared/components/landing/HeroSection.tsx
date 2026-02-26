import { useTranslations } from "@/i18n/useTranslations"
import styles from "./HeroSection.module.scss"

export function HeroSection() {
    const t = useTranslations('landing.hero')

    return (
        <section className={styles.section}>
            {/* Background Image */}
            <div className={styles.backgroundContainer}>
                <div className={styles.backgroundImage}>
                    <img
                        src="/BRND Hero 1.jpg"
                        alt="BRND Background"
                        className={styles.heroImage}
                        loading="eager"
                    />
                </div>
                {/* Overlay for better text readability */}
                <div className={styles.backgroundOverlay} />
            </div>

            {/* Hero Content */}
            <div className={styles.content}>
                <h1 className={styles.headline}>
                    {t('headline')}
                </h1>
            </div>
        </section>
    )
}
