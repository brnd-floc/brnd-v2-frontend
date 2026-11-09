// Dependencies
import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

// Services
import { getBrandList, BrandTimePeriod } from '@/services/brands';

// Types
import { Brand, ListBrandTypes } from './types';

export const useBrandList = (
  order: ListBrandTypes,
  searchQuery: string = '',
  pageId: number = 1,
  limit: number = 27,
  period: BrandTimePeriod = 'all',
  live = false
) => {
  const brandsRef = useRef<Brand[]>([]);
  const countRef = useRef<number>(0);

  const result = useQuery({
    queryKey: ['brands', searchQuery, pageId, limit, order, period],
    queryFn: () =>
      getBrandList(searchQuery, String(pageId), String(limit), order, period),
    retry: false,
    staleTime: live ? 30_000 : Infinity,
    gcTime: Infinity,
    enabled: live,
    refetchOnMount: live ? 'always' : false,
    refetchOnWindowFocus: live ? 'always' : false,
    refetchInterval: live ? 30_000 : false,
    placeholderData: (prev) => prev,
  });

  if (result.data && !result.isPlaceholderData) {
    const { brands, count } = result.data;

    if (pageId === 1) {
      brandsRef.current = brands;
    } else {
      const byId = new Map(brandsRef.current.map((brand) => [brand.id, brand]));
      for (const brand of brands) {
        byId.set(brand.id, brand);
      }
      brandsRef.current = [...byId.values()];
    }
    countRef.current = count;
  }

  return {
    ...result,
    data: {
      brands: brandsRef.current,
      count: countRef.current,
    },
  };
};
