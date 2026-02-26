import { useCallback, useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";

const DEFAULT_CAROUSEL_INTERVAL = 6000;
const INITIALIZE_DELAY_MS = 100;
const UNLOCK_DELAY_MS = 500;

interface UsePodiumStackAnimationParams {
  sliderRef: RefObject<HTMLDivElement | null>;
  itemCount: number;
  carouselInterval?: number;
}

interface UsePodiumStackAnimationResult {
  initializeCards: () => void;
  rotateCards: () => void;
}

export function usePodiumStackAnimation({
  sliderRef,
  itemCount,
  carouselInterval = DEFAULT_CAROUSEL_INTERVAL,
}: UsePodiumStackAnimationParams): UsePodiumStackAnimationResult {
  const isAnimatingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initializeCards = useCallback(() => {
    if (!sliderRef.current) return;

    const cards = Array.from(sliderRef.current.querySelectorAll(".podium-card"));

    gsap.to(cards, {
      y: (index: number) => `${-15 + 15 * index}%`,
      z: (index: number) => 15 * index,
      opacity: 1,
      duration: 1,
      ease: "power3.inOut",
      stagger: -0.1,
    });
  }, [sliderRef]);

  const rotateCards = useCallback(() => {
    if (!sliderRef.current || isAnimatingRef.current) return;

    isAnimatingRef.current = true;
    const slider = sliderRef.current;
    const cards = Array.from(slider.querySelectorAll(".podium-card"));

    if (cards.length < 2) {
      isAnimatingRef.current = false;
      return;
    }

    const lastCard = cards[cards.length - 1] as HTMLElement;

    gsap.to(lastCard, {
      y: "+=150%",
      opacity: 0,
      duration: 1,
      ease: "power3.inOut",
      onComplete: () => {
        gsap.set(lastCard, { visibility: "hidden", opacity: 0 });
        slider.prepend(lastCard);
        initializeCards();
        gsap.set(lastCard, { visibility: "visible" });

        unlockTimeoutRef.current = setTimeout(() => {
          isAnimatingRef.current = false;
        }, UNLOCK_DELAY_MS);
      },
    });
  }, [initializeCards, sliderRef]);

  useEffect(() => {
    if (itemCount > 0) {
      initTimeoutRef.current = setTimeout(initializeCards, INITIALIZE_DELAY_MS);
    }

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [itemCount, initializeCards]);

  useEffect(() => {
    if (itemCount <= 1) {
      return undefined;
    }

    intervalRef.current = setInterval(rotateCards, carouselInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      if (unlockTimeoutRef.current) {
        clearTimeout(unlockTimeoutRef.current);
      }
    };
  }, [carouselInterval, itemCount, rotateCards]);

  return {
    initializeCards,
    rotateCards,
  };
}
