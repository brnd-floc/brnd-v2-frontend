// Dependencies
import { useQuery, keepPreviousData } from "@tanstack/react-query";

// Services
import { getRecentPodiums } from "@/services/brands";

/**
 * Hook for fetching recent podiums with pagination
 */
export const useRecentPodiums = (page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: ["recent-podiums", page, limit],
    queryFn: async () => {
      const response = await getRecentPodiums(page, limit);
      // Transform response to match component expectations
      return response;
    },
    staleTime: 0, // Always refetch fresh data on mount
    gcTime: 5 * 60 * 1000, // Keep cached data for 5 minutes
    refetchOnMount: true, // Refetch when component mounts if data is stale
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch when network reconnects
    placeholderData: keepPreviousData, // Keep previous data while loading new page
  });
};
