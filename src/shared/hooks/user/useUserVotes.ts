// Dependencies
import { useQuery } from '@tanstack/react-query';

// Services
import { getUserVotes } from '@/services/user';

export const useUserVotes = (unixDate?: number, fid?: number) => {
  return useQuery({
    queryKey: ['votesHistory', fid, unixDate],
    queryFn: () => getUserVotes(unixDate!),
    retry: false,
    staleTime: 0,
    enabled: !!unixDate,
  });
};
