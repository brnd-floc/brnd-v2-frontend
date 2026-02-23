import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import {
  Navigate,
  useLocation,
  useParams,
  useNavigate,
} from "react-router-dom";

import LoaderIndicator from "../../shared/components/LoaderIndicator";

// Types
import { VotingViewEnum } from "./types";
import {
  buildVoteViewProps,
  buildVotingState,
  resolveFallbackUnixDate,
  resolveVoteRecord,
  resolveTodaysVoteUnixDate,
  shouldAutoRedirectToTodaysVote,
  shouldFetchFallbackVoteData,
  shouldRedirectToVoteHome,
  shouldRefreshAfterClaim,
  shouldRefreshVoteData,
} from "./viewModel";

// Hooks
import { Brand } from "@/hooks/brands";
import { useAuth } from "@/hooks/auth";
import { useUserVotes } from "@/hooks/user/useUserVotes";
import { useQueryClient } from "@tanstack/react-query";

// Hocs
import withProtectionRoute from "@/hocs/withProtectionRoute";

const PodiumView = lazy(() => import("./partials/PodiumView"));
const ShareView = lazy(() => import("./partials/ShareView"));
const CongratsView = lazy(() => import("./partials/CongratsView"));
const AlreadySharedView = lazy(() => import("./partials/AlreadySharedView"));

function VotePage(): React.ReactNode {
  const { unixDate } = useParams<{ unixDate?: string }>();
  const { search } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading: authLoading,
    refetch: refetchAuth,
  } = useAuth();

  // Track if we're waiting for data after a state change (prevents flickering)
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Determine if we need to fetch vote data via fallback
  // This happens when we have voteStatus but no brand data in todaysVote
  const needsFallbackData = useMemo(
    () => shouldFetchFallbackVoteData({ user, unixDate }),
    [user, unixDate]
  );

  // Determine which unixDate to use for fallback fetch
  const fallbackUnixDate = useMemo(
    () => resolveFallbackUnixDate({ unixDate, user }),
    [unixDate, user]
  );

  const { data: fallbackVotes, isFetching: fallbackLoading } = useUserVotes(
    needsFallbackData ? fallbackUnixDate : undefined
  );

  // Get the best available vote data (prefer todaysVote, fallback to fetched data)
  const votes = useMemo(
    () =>
      resolveVoteRecord({
        userVote: user?.todaysVote,
        fallbackVotes,
      }),
    [user?.todaysVote, fallbackVotes]
  );

  const voteStatus = user?.todaysVoteStatus;

  // Loading state: true if we're loading auth OR fetching fallback data
  const isLoading = authLoading || (needsFallbackData && fallbackLoading);
  const suspenseFallback = useMemo(
    () => <LoaderIndicator size={30} variant="fullscreen" />,
    []
  );

  /**
   * Determines if the voting process was successful based on URL search parameters.
   * This is used to handle post-vote navigation.
   */
  const hasSuccessParam = useMemo<boolean>(
    () => new URLSearchParams(search).get("success") === "",
    [search]
  );

  const votingState = useMemo(
    () =>
      buildVotingState({
        user,
        votes,
        authLoading,
        needsFallbackData,
        fallbackLoading,
      }),
    [user, votes, authLoading, needsFallbackData, fallbackLoading]
  );

  /**
   * Navigation function for components that need to trigger state updates.
   * After actions like voting or sharing, we invalidate queries to refresh state.
   *
   * @param _id - The view to navigate to
   * @param _selection - The brands array
   * @param _voteId - The vote ID
   * @param _transactionHash - Optional transaction hash from voting
   * @param _castHash - Optional cast hash from composeCast result
   */
  const navigateToView = useCallback(
    (
      _id: VotingViewEnum,
      _selection: Brand[],
      _voteId: string,
      _transactionHash?: string,
      _castHash?: string
    ) => {
      // Invalidate auth query to trigger state refresh
      // The state machine will automatically determine the correct view
      // The castHash will be available from todaysVoteStatus.castHash after backend processes it
      queryClient.invalidateQueries({ queryKey: ["auth"] });

      // If we're on a specific date route, ensure we stay on it
      if (unixDate) {
        navigate(`/vote/${unixDate}`, { replace: true });
      } else {
        const todayUnix = Math.floor(Date.now() / 1000);
        navigate(`/vote/${todayUnix}`, { replace: true });
      }
    },
    [queryClient, navigate, unixDate]
  );

  /**
   * Common props for all view components.
   * These props are passed to each view component based on the current state.
   *
   * Transaction hash mapping:
   * - State 2 (voted_not_shared): voteTransactionHash (from voting)
   * - State 3 (shared_not_claimed): voteTransactionHash + castHash
   * - State 4 (claimed): voteTransactionHash + castHash + claimTransactionHash
   */
  const viewProps = useMemo(
    () => buildVoteViewProps({ votingState, navigateToView }),
    [votingState, navigateToView]
  );

  const renderedView = useMemo((): React.ReactNode => {
    switch (votingState.type) {
      case "loading":
        return suspenseFallback;
      case "not_voted":
        return <PodiumView {...viewProps} />;
      case "voted_not_shared":
        return <ShareView {...viewProps} />;
      case "shared_not_claimed":
        return <AlreadySharedView {...viewProps} />;
      case "claimed":
        return <CongratsView {...viewProps} />;
      default:
        return <PodiumView {...viewProps} />;
    }
  }, [votingState.type, viewProps, suspenseFallback]);

  /**
   * Auto-redirect: If user has voted today but no unixDate, redirect to today's vote
   * This ensures users always land on the correct date-specific vote page.
   */
  useEffect(() => {
    if (
      shouldAutoRedirectToTodaysVote({
        isLoading,
        isTransitioning,
        unixDate,
        user,
      })
    ) {
      const todayUnix = resolveTodaysVoteUnixDate({
        user,
        nowUnix: Math.floor(Date.now() / 1000),
      });
      navigate(`/vote/${todayUnix}`, { replace: true });
    }
  }, [isLoading, isTransitioning, user, unixDate, navigate]);

  /**
   * Handle success parameter - clean up URL after successful vote
   * This removes the ?success parameter once we've transitioned to the share view
   */
  useEffect(() => {
    if (hasSuccessParam && votingState.type === "voted_not_shared") {
      // Clean up URL by removing success parameter
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [hasSuccessParam, votingState.type]);

  /**
   * Monitor state transitions and handle data refresh
   * This ensures smooth transitions between states without flickering
   */
  useEffect(() => {
    // If we transition from loading to a real state, mark transition as complete
    if (votingState.type !== "loading" && isTransitioning) {
      setIsTransitioning(false);
    }

    const brandData = user?.todaysVote || votes;
    const hasBrandData = Boolean(brandData?.brand1);
    if (
      shouldRefreshVoteData({
        votingStateType: votingState.type,
        isTransitioning,
        hasVoteStatus: Boolean(voteStatus?.hasVoted),
        hasBrandData,
      })
    ) {
      setIsTransitioning(true);
      refetchAuth();
    }
  }, [votingState.type, isTransitioning, votes, voteStatus, user, refetchAuth]);

  /**
   * Monitor for claim completion - when user claims rewards, ensure smooth transition to State 4
   * This handles the transition from State 3 (shared_not_claimed) to State 4 (claimed)
   */
  useEffect(() => {
    if (
      shouldRefreshAfterClaim({
        votingStateType: votingState.type,
        hasClaimed: Boolean(user?.todaysVoteStatus?.hasClaimed),
        isTransitioning,
      })
    ) {
      setIsTransitioning(true);
      refetchAuth();
    }
  }, [
    votingState.type,
    user?.todaysVoteStatus?.hasClaimed,
    isTransitioning,
    refetchAuth,
  ]);

  // Redirect if trying to view a vote that doesn't exist and user hasn't voted today
  // This prevents users from accessing invalid vote pages
  if (
    shouldRedirectToVoteHome({
      isLoading,
      isTransitioning,
      unixDate,
      hasVoteRecord: Boolean(votes?.id),
      hasVoted: Boolean(voteStatus?.hasVoted),
    })
  ) {
    return <Navigate to="/" replace />;
  }

  return <Suspense fallback={suspenseFallback}>{renderedView}</Suspense>;
}

export default withProtectionRoute(VotePage, "only-connected");
