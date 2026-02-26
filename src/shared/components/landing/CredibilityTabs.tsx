import { useState } from 'react'
import classNames from "clsx"
import { useTranslations } from "@/i18n/useTranslations"
import styles from "./CredibilityTabs.module.scss"

const TAB_IDS = ['users', 'brands'] as const
const ITEM_KEYS = ['item1', 'item2', 'item3', 'item4'] as const

export function CredibilityTabs() {
    const t = useTranslations('landing.credibility')
    const [activeTab, setActiveTab] = useState('users')

    const activeContent = ITEM_KEYS.map((itemKey) => ({
        title: t(`tabs.${activeTab}.${itemKey}.title`),
        description: t(`tabs.${activeTab}.${itemKey}.description`),
    }))

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                {/* Title */}
                <h2 className={styles.title}>
                    {t('title.line1')}<br />
                    {t('title.line2')}
                </h2>

                {/* Tabs */}
                <div className={styles.tabsContainer}>
                    {TAB_IDS.map((tabId) => (
                        <button
                            key={tabId}
                            onClick={() => setActiveTab(tabId)}
                            className={classNames(styles.tab, {
                                [styles.active]: activeTab === tabId
                            })}
                        >
                            <span className={styles.tabLabelFull}>
                                {t(`tabs.${tabId}.label`)}
                            </span>
                            <span className={styles.tabLabelShort}>
                                {t(`tabs.${tabId}.shortLabel`)}
                            </span>
                            {activeTab === tabId && (
                                <span className={styles.tabIndicator} />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <ul className={styles.contentList}>
                    {activeContent.map((item, index) => (
                        <li key={index} className={styles.contentItem}>
                            <span className={styles.bullet} />
                            <p className={styles.contentText}>
                                <span className={styles.contentTitle}>{item.title}</span>{' '}
                                <span className={styles.contentDescription}>{item.description}</span>
                            </p>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    )
}
