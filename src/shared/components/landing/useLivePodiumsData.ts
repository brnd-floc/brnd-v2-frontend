import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizePodiumsResponse } from "./livePodiums.normalize";
import type { LivePodium } from "./livePodiums.types";

const DEFAULT_POLLING_INTERVAL = 10000;

interface UseLivePodiumsDataParams {
  initialPodiums: LivePodium[];
  pollingInterval?: number;
}

interface UseLivePodiumsDataResult {
  podiums: LivePodium[];
  isLoading: boolean;
  refresh: () => Promise<void>;
}

function resolvePodiumsDataUrl(): string {
  if (import.meta.env.VITE_LANDING_PODIUMS_URL) {
    return import.meta.env.VITE_LANDING_PODIUMS_URL;
  }

  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/brand-service/public/recent-podiums?page=1&limit=20`;
  }

  return "";
}

export function useLivePodiumsData({
  initialPodiums,
  pollingInterval = DEFAULT_POLLING_INTERVAL,
}: UseLivePodiumsDataParams): UseLivePodiumsDataResult {
  const [podiums, setPodiums] = useState<LivePodium[]>(initialPodiums);
  const [isLoading, setIsLoading] = useState(initialPodiums.length === 0);
  const podiumsDataUrl = useMemo(() => resolvePodiumsDataUrl(), []);

  const refresh = useCallback(async () => {
    if (!podiumsDataUrl) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(podiumsDataUrl);

      if (!response.ok) {
        if (initialPodiums.length > 0) {
          setPodiums(initialPodiums);
        }
        return;
      }

      const payload = await response.json();
      const normalizedPodiums = normalizePodiumsResponse(payload);

      if (normalizedPodiums.length > 0) {
        setPodiums(normalizedPodiums);
      } else if (initialPodiums.length > 0) {
        setPodiums(initialPodiums);
      }
    } catch {
      if (initialPodiums.length > 0) {
        setPodiums(initialPodiums);
      }
    } finally {
      setIsLoading(false);
    }
  }, [initialPodiums, podiumsDataUrl]);

  useEffect(() => {
    if (!podiumsDataUrl) {
      setIsLoading(false);
      return undefined;
    }

    void refresh();
    const pollInterval = setInterval(() => {
      void refresh();
    }, pollingInterval);

    return () => clearInterval(pollInterval);
  }, [podiumsDataUrl, pollingInterval, refresh]);

  return {
    podiums,
    isLoading,
    refresh,
  };
}
