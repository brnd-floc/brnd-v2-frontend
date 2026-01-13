import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import styles from './ScreenshotsGallery.module.scss'

// Registrar plugin
if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger)
}

// Configuración de imágenes por capa (7 columnas)
// Capa 1: columnas externas (1 y 7)
// Capa 2: columnas (2 y 6)
// Capa 3: columnas (3 y 5)
// Capa 4: columna central superior/inferior (4)
// Scaler: imagen central que se expande

const LAYER_1_IMAGES = [
    '/app_pics/BRND no selected.png',
    '/app_pics/BRND selected.png',
    '/app_pics/Claim.png',
    '/app_pics/Claimed.png',
    '/app_pics/Share Now.png',
    '/app_pics/Section [BRND of the Week].png',
]

const LAYER_2_IMAGES = [
    '/app_pics/1st Position.png',
    '/app_pics/2nd Position.png',
    '/app_pics/BRND no selected.png',
    '/app_pics/BRND selected.png',
    '/app_pics/Claim.png',
    '/app_pics/Claimed.png',
]

const LAYER_3_IMAGES = [
    '/app_pics/Share Now.png',
    '/app_pics/Section [BRND of the Week].png',
    '/app_pics/1st Position.png',
    '/app_pics/2nd Position.png',
    '/app_pics/BRND no selected.png',
    '/app_pics/BRND selected.png',
]

const LAYER_4_IMAGES = [
    '/app_pics/Claim.png',
    '/app_pics/Claimed.png',
]

const SCALER_IMAGE = '/app_pics/1.png'

export function ScreenshotsGallery() {
    const sectionRef = useRef<HTMLElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const scalerRef = useRef<HTMLDivElement>(null)
    const layer1Ref = useRef<HTMLDivElement>(null)
    const layer2Ref = useRef<HTMLDivElement>(null)
    const layer3Ref = useRef<HTMLDivElement>(null)
    const layer4Ref = useRef<HTMLDivElement>(null)
    const backgroundRef = useRef<HTMLDivElement>(null)
    const titleRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const section = sectionRef.current
        const scaler = scalerRef.current
        const layer1 = layer1Ref.current
        const layer2 = layer2Ref.current
        const layer3 = layer3Ref.current
        const layer4 = layer4Ref.current
        const background = backgroundRef.current
        const title = titleRef.current

        if (!section || !scaler || !layer1 || !layer2 || !layer3 || !layer4 || !background || !title) return

        const ctx = gsap.context(() => {
            // Timeline para background y título
            const introTl = gsap.timeline({
                scrollTrigger: {
                    trigger: section,
                    start: 'top 80%',
                    end: 'top 40%',
                    scrub: 1,
                }
            })

            introTl.from(background, {
                opacity: 0,
                ease: 'power2.out',
            }, 0)

            introTl.from(title, {
                opacity: 0,
                y: 30,
                ease: 'power2.out',
            }, 0.2)

            // Timeline principal: Scaler grande que se reduce + capas aparecen
            const mainTl = gsap.timeline({
                scrollTrigger: {
                    trigger: section,
                    start: 'top 40%',
                    end: 'bottom 60%',
                    scrub: 1.5,
                }
            })

            // Scaler empieza grande (escala 2.5x) y se reduce a tamaño normal
            mainTl.from(scaler, {
                scale: 2.5,
                ease: 'power2.out',
            }, 0)

            // Capas aparecen desde el centro hacia afuera mientras scaler se reduce
            mainTl.from(layer4, {
                opacity: 0,
                scale: 0,
                ease: 'power2.out',
            }, 0.1)

            mainTl.from(layer3, {
                opacity: 0,
                scale: 0,
                ease: 'power2.out',
            }, 0.2)

            mainTl.from(layer2, {
                opacity: 0,
                scale: 0,
                ease: 'power2.out',
            }, 0.3)

            mainTl.from(layer1, {
                opacity: 0,
                scale: 0,
                ease: 'power2.out',
            }, 0.4)
        }, section)

        return () => ctx.revert()
    }, [])

    return (
        <section 
            ref={sectionRef}
            className={styles.section}
        >
            {/* Background video - cubre toda la sección */}
            <div ref={backgroundRef} className={styles.backgroundContainer}>
                <video
                    src="/app_pics/TheAPP Background.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className={styles.backgroundVideo}
                />
            </div>

            {/* Título */}
            <div ref={titleRef} className={styles.titleContainer}>
                <h2 className={styles.title}>
                    THE APP
                </h2>
            </div>

            {/* Contenido sticky */}
            <div
                ref={contentRef}
                className={styles.contentContainer}
            >
                {/* Grid container - grande en móvil, tamaño original en desktop */}
                <div
                    className={styles.gridContainer}
                >
                    {/* Capa 1 - Columnas externas (1 y 7) */}
                    <div 
                        ref={layer1Ref}
                        className={styles.layer}
                    >
                        {LAYER_1_IMAGES.map((src, i) => (
                            <div 
                                key={`l1-${i}`}
                                className={styles.imageContainer}
                                style={{
                                    gridColumn: i % 2 === 0 ? 1 : 7,
                                }}
                            >
                                <img
                                    src={src}
                                    alt={`App screenshot ${i + 1}`}
                                    width={390}
                                    height={844}
                                    className={styles.image}
                                    loading="lazy"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Capa 2 - Columnas (2 y 6) */}
                    <div 
                        ref={layer2Ref}
                        className={styles.layer}
                    >
                        {LAYER_2_IMAGES.map((src, i) => (
                            <div 
                                key={`l2-${i}`}
                                className={styles.imageContainer}
                                style={{
                                    gridColumn: i % 2 === 0 ? 2 : 6,
                                }}
                            >
                                <img
                                    src={src}
                                    alt={`App screenshot ${i + 7}`}
                                    width={390}
                                    height={844}
                                    className={styles.image}
                                    loading="lazy"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Capa 3 - Columnas (3 y 5) */}
                    <div 
                        ref={layer3Ref}
                        className={styles.layer}
                    >
                        {LAYER_3_IMAGES.map((src, i) => (
                            <div 
                                key={`l3-${i}`}
                                className={styles.imageContainer}
                                style={{
                                    gridColumn: i % 2 === 0 ? 3 : 5,
                                }}
                            >
                                <img
                                    src={src}
                                    alt={`App screenshot ${i + 13}`}
                                    width={390}
                                    height={844}
                                    className={styles.image}
                                    loading="lazy"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Capa 4 - Columna central (4) arriba y abajo */}
                    <div 
                        ref={layer4Ref}
                        className={styles.layer}
                    >
                        <div 
                            className={styles.imageContainer}
                            style={{ gridColumn: 4, gridRow: 1 }}
                        >
                            <img
                                src={LAYER_4_IMAGES[0]}
                                alt="App screenshot top center"
                                width={390}
                                height={844}
                                className={styles.image}
                                loading="lazy"
                            />
                        </div>
                        <div 
                            className={styles.imageContainer}
                            style={{ gridColumn: 4, gridRow: 3 }}
                        >
                            <img
                                src={LAYER_4_IMAGES[1]}
                                alt="App screenshot bottom center"
                                width={390}
                                height={844}
                                className={styles.image}
                                loading="lazy"
                            />
                        </div>
                    </div>

                    {/* Scaler - Imagen central (columna 4, fila 2) */}
                    <div 
                        ref={scalerRef}
                        className={styles.scaler}
                        style={{ gridArea: '2 / 4' }}
                    >
                        <img
                            src={SCALER_IMAGE}
                            alt="BRND App"
                            width={390}
                            height={844}
                            className={styles.image}
                            loading="eager"
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}
