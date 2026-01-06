// Dependencies
import React, { createContext, useContext, useCallback, useMemo } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";

// Services
import { getBrandList, BrandTimePeriod } from "@/services/brands";

// Types
import { Brand } from "@/shared/hooks/brands/types";

// Hooks
import { useAuth } from "@/shared/hooks/auth/useAuth";

interface BrandRankingsData {
  day: Brand[];
  week: Brand[];
  month: Brand[];
  all: Brand[];
}

interface BrandRankingsContextData {
  data: BrandRankingsData;
  isLoading: boolean;
  updateBrandOptimistically: (brandId: number, period: BrandTimePeriod, pointsToAdd: number) => void;
  refreshData: () => void;
}

const BrandRankingsContext = createContext<BrandRankingsContextData>({
  data: { day: [], week: [], month: [], all: [] },
  isLoading: true,
  updateBrandOptimistically: () => {},
  refreshData: () => {},
});

export const useBrandRankings = () => useContext(BrandRankingsContext);

export function BrandRankingsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { isReady } = useAuth();

  const periods: BrandTimePeriod[] = ["day", "week", "month", "all"];

  // Use useQueries to fetch all periods simultaneously with proper loading states
  const queries = useQueries({
    queries: periods.map((period) => ({
      queryKey: ["brands", "", 1, 50, "top", period],
      queryFn: () => getBrandList("", "1", "50", "top", period),
      enabled: isReady,
      staleTime: 24 * 60 * 60 * 1000, // 24 hours - only fetch once per day
      gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    })),
  });

  // Extract data and loading states
  const [dayQuery, weekQuery, monthQuery, allQuery] = queries;

  const data: BrandRankingsData = useMemo(() => ({
    day: dayQuery.data?.brands || [],
    week: weekQuery.data?.brands || [],
    month: monthQuery.data?.brands || [],
    all: allQuery.data?.brands || [],
  }), [dayQuery.data, weekQuery.data, monthQuery.data, allQuery.data]);

  // Only show loading if any query is actively fetching for the first time
  const isLoading = queries.some(query => query.isLoading);

  // Optimistically update brand rankings when user votes
  const updateBrandOptimistically = useCallback(
    (brandId: number, period: BrandTimePeriod, pointsToAdd: number) => {
      const queryKey = ["brands", "", 1, 50, "top", period];
      
      queryClient.setQueryData(queryKey, (oldData: { brands: Brand[]; count: number } | undefined) => {
        if (!oldData) return oldData;

        const updatedBrands = oldData.brands.map(brand => {
          if (brand.id === brandId) {
            // Update the appropriate score field based on the period
            const updates: Partial<Brand> = { ...brand };
            
            switch (period) {
              case "day":
                updates.scoreDay = brand.scoreDay + pointsToAdd;
                break;
              case "week":
                updates.scoreWeek = brand.scoreWeek + pointsToAdd;
                break;
              case "month":
                updates.scoreMonth = brand.scoreMonth + pointsToAdd;
                break;
              case "all":
                updates.score = brand.score + pointsToAdd;
                break;
            }
            
            return updates as Brand;
          }
          return brand;
        });

        // Re-sort by the appropriate score field
        updatedBrands.sort((a, b) => {
          switch (period) {
            case "day":
              return b.scoreDay - a.scoreDay;
            case "week":
              return b.scoreWeek - a.scoreWeek;
            case "month":
              return b.scoreMonth - a.scoreMonth;
            case "all":
              return b.score - a.score;
            default:
              return b.score - a.score;
          }
        });

        return {
          ...oldData,
          brands: updatedBrands,
        };
      });
    },
    [queryClient]
  );

  // Refresh all data
  const refreshData = useCallback(() => {
    periods.forEach((period) => {
      queryClient.invalidateQueries({
        queryKey: ["brands", "", 1, 50, "top", period],
      });
    });
  }, [queryClient, periods]);

  const contextValue = useMemo(() => ({
    data,
    isLoading,
    updateBrandOptimistically,
    refreshData,
  }), [data, isLoading, updateBrandOptimistically, refreshData]);

  return (
    <BrandRankingsContext.Provider value={contextValue}>
      {children}
    </BrandRankingsContext.Provider>
  );
}