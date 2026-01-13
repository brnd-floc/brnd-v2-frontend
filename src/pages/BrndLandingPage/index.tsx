import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { BrndAttributes } from "@/components/landing/BrndAttributes";
import { CredibilityTabs } from "@/components/landing/CredibilityTabs";
import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { PodiumCarouselGSAP } from "@/components/landing/PodiumCarouselGSAP";
import { ScreenshotsGallery } from "@/components/landing/ScreenshotsGallery";
import { StickyBottomBar } from "@/components/landing/StickyBottomBar";
import { useTranslations } from "@/i18n/useTranslations";
import styles from "./BrndLandingPage.module.scss";

/**
 * BrndLandingPage - Full landing page component for BRND
 *
 * This component can be used as a standalone landing page when users
 * access the app from a browser (outside of Farcaster miniapp context).
 *
 * Features:
 * - Internationalization support (EN/ES)
 * - Responsive design
 * - GSAP animations
 * - Premium gradient effects
 */
export default function BrndLandingPage() {
  const t = useTranslations("landing");

  // Demo data for the carousel
  // In production, you might want to fetch this from an API or pass as props
  const mockPodiums = [
    {
      id: "1",
      date: new Date().toISOString(),
      username: "crypto_lover",
      userPhoto:
        "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/41ca8e4a-6129-40be-de09-c93fbfbc6400/original",
      brand1: {
        id: 1,
        name: "Farcaster",
        imageUrl:
          "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/ef803ee0-a0de-4c34-c879-2a4888086e00/original",
      },
      brand2: {
        id: 2,
        name: "Warpcast",
        imageUrl:
          "https://ipfs.decentralized-content.com/ipfs/bafkreifezhnp5wzgabkdbkb6d65oix4r5axibupv45r7ifxphl4d6qqnry",
      },
      brand3: {
        id: 3,
        name: "Purple",
        imageUrl:
          "https://i.seadn.io/gae/2R29pIWneHAMHH0e2Lcqsilv7vRBpnYngrKOZXBkhpyrlBVgcJzgPxPq_pWujLggzy-EW1Jt9QJIOQW7t95ufdgvwCAITd4fw0DvQJM?w=500&auto=format",
      },
    },
    {
      id: "2",
      date: new Date(Date.now() - 86400000).toISOString(),
      username: "degen_trader",
      userPhoto:
        "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/e4e7dcd5-5af0-4311-6a7f-fd16ec133900/original",
      brand1: {
        id: 18,
        name: "Degen",
        imageUrl:
          "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/8c956aaf-d633-4544-42bd-9ab938854600/original",
      },
      brand2: {
        id: 25,
        name: "Base",
        imageUrl:
          "https://wrpcd.net/cdn-cgi/imagedelivery/BXluQx4ige9GuW0Ia56BHw/ce5460f6-40a2-4486-47c1-7801e4033e00/anim=false,fit=contain,f=auto,w=576",
      },
      brand3: {
        id: 161,
        name: "Clanker",
        imageUrl:
          "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/d34acf16-9002-4a2d-a163-c552d0816300/original",
      },
    },
    {
      id: "3",
      date: new Date(Date.now() - 172800000).toISOString(),
      username: "nft_collector",
      userPhoto:
        "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/33540604-cbcc-4751-df28-8947be2f6e00/original",
      brand1: {
        id: 12,
        name: "Zora",
        imageUrl: "https://i.imgur.com/3BN8GSF.png",
      },
      brand2: {
        id: 50,
        name: "SupeRare",
        imageUrl: "https://farcaster.xyz/~/channel-images/superrare.jpg",
      },
      brand3: {
        id: 144,
        name: "Nouns",
        imageUrl: "https://farcaster.xyz/~/channel-images/nouns.png",
      },
    },
  ];

  return (
    <div className={styles.landingPage}>
      <Header />

      <HeroSection />

      <PodiumCarouselGSAP initialPodiums={mockPodiums} />

      <CredibilityTabs />

      <BrndAttributes />

      <ScreenshotsGallery />

      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerContent}>
            <img
              src="/logo.svg"
              alt="BRND"
              width={80}
              height={28}
              className={styles.footerLogo}
              loading="lazy"
            />
            <p className={styles.footerText}>
              {t("footer.rights", { year: new Date().getFullYear() })}
            </p>
            <LocaleSwitcher />
          </div>
        </div>
      </footer>

      <StickyBottomBar />
    </div>
  );
}
