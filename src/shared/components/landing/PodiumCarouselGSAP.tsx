import { useEffect, useState, useCallback, useRef } from "react"
import gsap from "gsap"
import styles from "./PodiumCarouselGSAP.module.scss"

interface Brand {
    id: number
    name: string
    imageUrl: string | null
}

interface Podium {
    id: string
    date: string
    username: string
    userPhoto: string | null
    brand1: Brand | null
    brand2: Brand | null
    brand3: Brand | null
}

const POLLING_INTERVAL = 10000 // 10 segundos
const CAROUSEL_INTERVAL = 6000 // 6 segundos entre rotaciones
const VISIBLE_CARDS = 4 // Número de cards visibles en el stack

interface PodiumCarouselProps {
    initialPodiums?: Podium[]
}

export function PodiumCarouselGSAP({ initialPodiums = [] }: PodiumCarouselProps) {
    const [podiums, setPodiums] = useState<Podium[]>(initialPodiums)
    const [isLoading, setIsLoading] = useState(initialPodiums.length === 0)
    const sliderRef = useRef<HTMLDivElement>(null)
    const isAnimatingRef = useRef(false)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const fetchPodiums = useCallback(async () => {
        try {
            const res = await fetch('/api/landing/podiums')
            if (res.ok) {
                const data = await res.json()
                setPodiums(data.podiums)
            }
        } catch {
            // ignore
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Inicializar posiciones de las cards
    const initializeCards = useCallback(() => {
        if (!sliderRef.current) return
        const cards = Array.from(sliderRef.current.querySelectorAll('.podium-card'))
        
        gsap.to(cards, {
            y: (i: number) => `${-15 + 15 * i}%`,
            z: (i: number) => 15 * i,
            opacity: 1,
            duration: 1,
            ease: "power3.inOut",
            stagger: -0.1
        })
    }, [])

    // Rotar al siguiente podium
    const rotateCards = useCallback(() => {
        if (!sliderRef.current || isAnimatingRef.current) return
        
        isAnimatingRef.current = true
        const slider = sliderRef.current
        const cards = Array.from(slider.querySelectorAll('.podium-card'))
        
        if (cards.length < 2) {
            isAnimatingRef.current = false
            return
        }

        const lastCard = cards[cards.length - 1] as HTMLElement

        // Animar la última card (la del frente) hacia abajo
        gsap.to(lastCard, {
            y: "+=150%",
            opacity: 0,
            duration: 1,
            ease: "power3.inOut",
            onComplete: () => {
                // Ocultar completamente antes de mover
                gsap.set(lastCard, { visibility: 'hidden', opacity: 0 })
                // Mover la card al principio del DOM
                slider.prepend(lastCard)
                // Reinicializar posiciones (esto restaurará opacity: 1)
                initializeCards()
                // Hacer visible de nuevo después de posicionar
                gsap.set(lastCard, { visibility: 'visible' })
                
                setTimeout(() => {
                    isAnimatingRef.current = false
                }, 500)
            }
        })
    }, [initializeCards])

    // Fetch inicial y polling
    useEffect(() => {
        if (initialPodiums.length === 0) {
            fetchPodiums()
        }
        const pollInterval = setInterval(fetchPodiums, POLLING_INTERVAL)
        return () => clearInterval(pollInterval)
    }, [fetchPodiums, initialPodiums.length])

    // Inicializar cards cuando se cargan los podiums
    useEffect(() => {
        if (podiums.length > 0) {
            // Pequeño delay para asegurar que el DOM está listo
            setTimeout(initializeCards, 100)
        }
    }, [podiums, initializeCards])

    // Auto-rotate
    useEffect(() => {
        if (podiums.length <= 1) return

        intervalRef.current = setInterval(rotateCards, CAROUSEL_INTERVAL)

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [podiums.length, rotateCards])

    if (isLoading) {
        return (
            <section className={styles.loadingSection}>
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner} />
                </div>
            </section>
        )
    }

    if (podiums.length === 0) {
        return null
    }

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <h2 className={styles.title}>
                    Live Podiums
                </h2>
                
                {/* Slider container - full width */}
                <div
                    ref={sliderRef}
                    className={styles.sliderContainer}
                    style={{ 
                        perspective: '300px',
                        perspectiveOrigin: '50% 50%'
                    }}
                >
                    {/* Gradiente superior para ocultar cards que suben */}
                    <div 
                        className={styles.gradientTop}
                        style={{
                            background: 'linear-gradient(to bottom, rgb(0,0,0) 0%, rgba(0,0,0,0) 100%)'
                        }}
                    />
                    {/* Gradiente inferior para ocultar cards que bajan */}
                    <div 
                        className={styles.gradientBottom}
                        style={{
                            background: 'linear-gradient(to top, rgb(0,0,0) 0%, rgba(0,0,0,0) 100%)'
                        }}
                    />
                    {podiums.slice(0, VISIBLE_CARDS).map((podium, index, array) => (
                        <PodiumCardGSAP 
                            key={podium.id} 
                            podium={podium} 
                            priority={index === array.length - 1} 
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}

function PodiumCardGSAP({ podium, priority = false }: { podium: Podium, priority?: boolean }) {
    return (
        <div
            className={`podium-card ${styles.podiumCard}`}
            style={{
                transform: 'translate3d(-50%, -50%, 0)',
                opacity: 0,
            }}
            role="region"
            aria-label={`Brand ranking podium by @${podium.username}`}
            tabIndex={0}
        >
            {/* Header con usuario y fecha */}
            <div className={styles.cardHeader}>
                <div className={styles.userInfo}>
                    {podium.userPhoto ? (
                        <img
                            src={podium.userPhoto}
                            width={40}
                            height={40}
                            alt={podium.username}
                            className={styles.userPhoto}
                            loading={priority ? 'eager' : 'lazy'}
                        />
                    ) : (
                        <div className={styles.userPlaceholder}>
                            {podium.username.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <span className={styles.username}>
                        @{podium.username}
                    </span>
                </div>
                <span className={styles.date}>
                    {new Date(podium.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                    })}
                </span>
            </div>

            {/* Podium Visual */}
            <div className={styles.podiumVisual}>
                {/* 2nd Place */}
                {podium.brand2 && (
                    <div className={styles.podiumColumn}>
                        <div
                            className={`${styles.podiumBase} ${styles.podium2nd} ${styles.podiumGradient}`}
                        >
                            <div className={styles.podiumInner}>
                                <div className={`${styles.brandImageContainer} ${styles.brandImageContainer2nd}`}>
                                    {podium.brand2.imageUrl ? (
                                        <img
                                            src={podium.brand2.imageUrl}
                                            width={100}
                                            height={100}
                                            alt={`${podium.brand2.name} brand logo in 2nd place`}
                                            className={styles.brandImage}
                                            loading={priority ? 'eager' : 'lazy'}
                                        />
                                    ) : (
                                        <div className={styles.brandPlaceholder}>
                                            {podium.brand2.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <span className={`${styles.rankNumber} ${styles.rankNumber2nd}`}>
                                    2
                                </span>
                                <span className={`${styles.brandName} ${styles.brandName2nd}`}>
                                    {podium.brand2.name}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 1st Place */}
                {podium.brand1 && (
                    <div className={styles.podiumColumn}>
                        <div
                            className={`${styles.podiumBase} ${styles.podium1st} ${styles.podiumGradient}`}
                        >
                            <div className={styles.podiumInner}>
                                <div className={`${styles.brandImageContainer} ${styles.brandImageContainer1st}`}>
                                    {podium.brand1.imageUrl ? (
                                        <img
                                            src={podium.brand1.imageUrl}
                                            width={100}
                                            height={100}
                                            alt={`${podium.brand1.name} brand logo in 1st place`}
                                            className={styles.brandImage}
                                            loading={priority ? 'eager' : 'lazy'}
                                        />
                                    ) : (
                                        <div className={styles.brandPlaceholder}>
                                            {podium.brand1.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <span className={`${styles.rankNumber} ${styles.rankNumber1st}`}>
                                    1
                                </span>
                                <span className={`${styles.brandName} ${styles.brandName1st}`}>
                                    {podium.brand1.name}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3rd Place */}
                {podium.brand3 && (
                    <div className={styles.podiumColumn}>
                        <div
                            className={`${styles.podiumBase} ${styles.podium3rd} ${styles.podiumGradient}`}
                        >
                            <div className={styles.podiumInner}>
                                <div className={`${styles.brandImageContainer} ${styles.brandImageContainer3rd}`}>
                                    {podium.brand3.imageUrl ? (
                                        <img
                                            src={podium.brand3.imageUrl}
                                            width={100}
                                            height={100}
                                            alt={`${podium.brand3.name} brand logo in 3rd place`}
                                            className={styles.brandImage}
                                            loading={priority ? 'eager' : 'lazy'}
                                        />
                                    ) : (
                                        <div className={styles.brandPlaceholder}>
                                            {podium.brand3.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <span className={`${styles.rankNumber} ${styles.rankNumber3rd}`}>
                                    3
                                </span>
                                <span className={`${styles.brandName} ${styles.brandName3rd}`}>
                                    {podium.brand3.name}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
