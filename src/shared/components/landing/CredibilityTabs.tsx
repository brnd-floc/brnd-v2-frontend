import { useState } from 'react'
import classNames from "clsx"
import styles from "./CredibilityTabs.module.scss"

const TABS = [
    {
        id: 'users',
        label: 'FOR USERS (BRAND LOVERS)',
        shortLabel: 'FOR USERS',
        content: [
            {
                title: 'Create & collect podiums:',
                description: 'Build your own brand rankings → Podiums, and showcase your takes. → Shape what matters: Create podiums that reflect what brands mean to you. Your taste, your community, onchain.'
            },
            {
                title: 'Earn $BRND:',
                description: 'Receive rewards for creating, sharing, and interacting with podiums.'
            },
            {
                title: 'Signal value:',
                description: 'Promote the brands you believe in, and see the community respond.'
            },
            {
                title: 'Track evolution:',
                description: 'Follow how brands climb, drop, or sustain relevance onchain. All in one place.'
            }
        ]
    },
    {
        id: 'brands',
        label: 'FOR BRANDS (THAT LOVE USERS)',
        shortLabel: 'FOR BRANDS',
        content: [
            {
                title: 'Visibility:',
                description: 'Get discovered in podiums created by the community and gain onchain presence.'
            },
            {
                title: 'Community validation:',
                description: 'See where your brand ranks, powered by the same scoring that rewards users. Every vote contributes to your brand\'s perceived value.'
            },
            {
                title: 'Dynamic positioning:',
                description: 'Your place isn\'t fixed. Claims, resets, and new podiums ensure constant movement and real-time relevance.'
            },
            {
                title: 'Trusted context:',
                description: 'Appear in a transparent, community-powered, onchain environment — not behind hidden algorithms.'
            }
        ]
    }
]

export function CredibilityTabs() {
    const [activeTab, setActiveTab] = useState('users')

    const activeContent = TABS.find(tab => tab.id === activeTab)?.content ?? []

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                {/* Title */}
                <h2 className={styles.title}>
                    Turning community activity into<br />
                    measurable, onchain credibility.
                </h2>

                {/* Tabs */}
                <div className={styles.tabsContainer}>
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={classNames(styles.tab, {
                                [styles.active]: activeTab === tab.id
                            })}
                        >
                            <span className={styles.tabLabelFull}>{tab.label}</span>
                            <span className={styles.tabLabelShort}>{tab.shortLabel}</span>
                            {activeTab === tab.id && (
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
