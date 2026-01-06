// Dependencies
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// Components
import BrandCard from "@/components/cards/BrandCard";
import { BrandListItem } from "@/components/BrandListItem";

// StyleSheet
import styles from "./TopRankings.module.scss";

// Hook
import { Brand, useBrandList } from "@/hooks/brands";
import useDisableScrollBody from "@/hooks/ui/useDisableScrollBody";

// Utils
import { getBrandScoreVariation } from "@/utils/brand";

// Assets
import BrandOfTheWeek from "@/assets/images/brand-of-the-week.svg?react";
import BrandOfTheMonth from "@/assets/images/brand-of-the-month.svg?react";
import AllTimeBrand from "@/assets/images/all-time-brand.svg?react";
import BrandOfTheDay from "@/assets/images/brand-of-the-day.svg?react";

import { BrandTimePeriod } from "@/services/brands";

interface TopRankingsProps {
  period: BrandTimePeriod;
}

function TopRankings({ period }: TopRankingsProps) {
  const navigate = useNavigate();
  const { data } = useBrandList("top", "", 1, 50, period);
  useDisableScrollBody();

  // No need to manually refetch - data is already cached by BrandRankingsProvider

  // Process brands with smart scoring and proper sorting
  const processedBrands = useMemo(() => {
    if (!data?.brands) return [];
    
    // Sort brands by score for the selected period in descending order
    return [...data.brands].sort((a, b) => {
      const scoreA = (() => {
        switch (period) {
          case "day":
            return a.scoreDay;
          case "week":
            return a.scoreWeek;
          case "month":
            return a.scoreMonth || a.scoreWeek;
          case "all":
          default:
            return a.score;
        }
      })();
      
      const scoreB = (() => {
        switch (period) {
          case "day":
            return b.scoreDay;
          case "week":
            return b.scoreWeek;
          case "month":
            return b.scoreMonth || b.scoreWeek;
          case "all":
          default:
            return b.score;
        }
      })();
      
      return scoreB - scoreA; // Sort in descending order (highest first)
    });
  }, [data?.brands, period]);

  const getBannerSvg = useCallback((period: BrandTimePeriod) => {
    switch (period) {
      case "day":
        return <BrandOfTheDay />;
      case "week":
        return <BrandOfTheWeek />;
      case "month":
        return <BrandOfTheMonth />;
      case "all":
        return <AllTimeBrand />;
      default:
        return null;
    }
  }, []);

  /**
   * Get the main brand from processed brands
   */
  const mainBrand = useMemo<Brand | undefined>(
    () => processedBrands?.[0],
    [processedBrands]
  );

  /**
   * Handles the click event on a brand card and navigates to the brand's page.
   */
  const handleClickCard = useCallback(
    (id: Brand["id"]) => {
      navigate(`/brand/${id}`);
    },
    [navigate]
  );

  /**
   * Gets the score for a brand based on the selected time period.
   * Returns the appropriate score value depending on whether day, week, month or all-time is selected.
   * @param {Brand} brand - The brand object to get the score for
   * @returns {number} The score value for the selected time period
   */
  const getScoreForPeriod = useCallback(
    (brand: Brand): number => {
      switch (period) {
        case "day":
          return brand.scoreDay;
        case "week":
          return brand.scoreWeek;
        case "month":
          return brand.scoreMonth || brand.scoreWeek; // Fallback to week if month not available
        case "all":
        default:
          return brand.score;
      }
    },
    [period]
  );

  /**
   * Gets the state score for a brand based on the selected time period.
   * Returns the appropriate state score value depending on whether day, week, month or all-time is selected.
   * @param {Brand} brand - The brand object to get the state score for
   * @returns {number} The state score value for the selected time period
   */
  const getStateScoreForPeriod = useCallback(
    (brand: Brand): number => {
      switch (period) {
        case "day":
          return brand.stateScoreDay;
        case "week":
          return brand.stateScoreWeek;
        case "month":
          return brand.stateScoreMonth || brand.stateScoreWeek; // Fallback to week if month not available
        case "all":
        default:
          return brand.stateScore;
      }
    },
    [period]
  );

  return (
    <div className={styles.layout}>
      {mainBrand && (
        <div className={styles.inner}>
          <div className={styles.feature}>
            <div className={styles.image}>{getBannerSvg(period)}</div>
            <div className={styles.brand}>
              <BrandCard
                size={"l"}
                selected={true}
                orientation={"center"}
                className={styles.brandCard}
                name={mainBrand.name}
                photoUrl={mainBrand.imageUrl}
                score={getScoreForPeriod(mainBrand)}
                onClick={() => handleClickCard(mainBrand.id)}
                variation={getBrandScoreVariation(
                  getStateScoreForPeriod(mainBrand)
                )}
              />
            </div>
          </div>
        </div>
      )}

      {processedBrands && processedBrands.length > 1 && (
        <ul className={styles.grid}>
          {processedBrands.map((brand, index) => (
            <li key={`--brand-item-${index.toString()}`}>
              <BrandListItem
                position={index + 1}
                name={brand.name}
                photoUrl={brand.imageUrl}
                score={getScoreForPeriod(brand)}
                variation={"hide"}
                onClick={() => handleClickCard(brand.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TopRankings;
