// Dependencies
import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// Components
import BrandCard from "@/components/cards/BrandCard";

// StyleSheet
import styles from "./BrandOfTheDay.module.scss";

// Hook
import { Brand, useBrandList } from "@/hooks/brands";

// Utils
import { getBrandScoreVariation } from "@/utils/brand";
import { calculateSmartPeriodScores } from "@/utils/smartPeriodScoring";

// Assets
import BrandOfTheDayImage from "@/assets/images/brand-of-the-day.svg?react";

function BrandOfTheDay() {
  const navigate = useNavigate();
  // Fetch ALL data but apply daily scoring client-side for true "BRND OF THE DAY"
  // This ensures we get the actual daily winner from midnight UTC, independent of user filters
  const { data, refetch, isLoading, isError } = useBrandList(
    "top",
    "",
    1,
    10,
    "day"
  );

  useEffect(() => {
    // Only fetch once on mount - BRND of the day doesn't change during the session
    // Empty dependency array ensures this only runs once on mount
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - we only want to fetch once on mount

  const processedBrands = useMemo(() => {
    if (!data?.brands) return [];
    // Apply daily scoring to determine the true daily winner
    const sortedBrands = data.brands.sort((a, b) => b.scoreDay - a.scoreDay);
    return sortedBrands;
  }, [data?.brands]);

  const getStateScoreForPeriod = useCallback((brand: Brand): number => {
    const smartScores = calculateSmartPeriodScores(brand, "daily");
    return smartScores.stateScore;
  }, []);

  const mainBrand = useMemo<Brand | undefined>(
    () => processedBrands?.[0],
    [processedBrands]
  );

  const handleClickCard = useCallback((id: Brand["id"]) => {
    navigate(`/brand/${id}`);
  }, []);

  // Always render the container to prevent layout shifts
  const renderContent = () => {
    // Show loading skeleton during initial load or when changing periods
    if (isLoading || !mainBrand) {
      return (
        <div className={styles.brand}>
          <div className={styles.loadingSkeleton}>
            <div className={styles.skeletonImage} />
            <div className={styles.skeletonText}>
              <div className={styles.skeletonName} />
              <div className={styles.skeletonScore} />
            </div>
          </div>
        </div>
      );
    }

    // Show error state (maintain same dimensions)
    if (isError) {
      return (
        <div className={styles.brand}>
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>⚠️</div>
            <div className={styles.errorText}>Unable to load</div>
          </div>
        </div>
      );
    }

    // Show the actual brand card
    return (
      <div className={styles.brand} onClick={(e) => e.stopPropagation()}>
        <BrandCard
          size={"l"}
          selected={true}
          orientation={"center"}
          className={styles.brandCard}
          name={mainBrand.name}
          photoUrl={mainBrand.imageUrl}
          score={data.brands[0].scoreDay}
          onClick={() => {
            handleClickCard(mainBrand.id);
          }}
          variation={getBrandScoreVariation(getStateScoreForPeriod(mainBrand))}
        />
      </div>
    );
  };

  return (
    <div
      onClick={() => {
        navigate("/ranking?period=day");
      }}
      className={styles.feature}
    >
      <div className={styles.image}>
        <BrandOfTheDayImage />
      </div>
      {renderContent()}
    </div>
  );
}

export default BrandOfTheDay;
