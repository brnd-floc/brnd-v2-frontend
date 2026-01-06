// Dependencies
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";

// StyleSheet
import styles from "./AirdropPage.module.scss";

// Components
import Typography from "@/shared/components/Typography";
import LoaderIndicator from "@/shared/components/LoaderIndicator";
import Button from "@/shared/components/Button";

// Hooks
import { useAirdropCheck } from "@/shared/hooks/user/useAirdropCheck";
import { useAirdropLeaderboard } from "@/shared/hooks/user/useAirdropLeaderboard";
// import { useAirdropClaimStatus } from "@/shared/hooks/user/useAirdropClaimStatus";
// import { useAirdropStats } from "@/shared/hooks/contract/useAirdropStats";

// Hocs
import withProtectionRoute from "@/hocs/withProtectionRoute";
import sdk from "@farcaster/miniapp-sdk";
import CheckLabelIcon from "@/assets/icons/check-label-icon.svg?react";
import { useAuth } from "@/shared/hooks/auth/useAuth";
import AirdropSvg from "@/shared/assets/images/airdrop.svg?react";
import IncompleteTaskIcon from "@/shared/assets/icons/incomplete-task.svg?react";
import QuestionMarkIcon from "@/shared/assets/icons/question-mark.svg?react";
import SnapshotIcon from "@/shared/assets/icons/snapshot.svg?react";
import Logo from "@/assets/images/logo.svg";

// Assets
import airdropBackgroundImage from "@/shared/assets/images/airdrop-background.png";

// Partials
// import ClaimAirdrop from "./partials/ClaimAirdrop";

// Admin FIDs
const ADMIN_FIDS = [6431, 6099, 8109, 222144, 16098];

type PageView = "main" | "leaderboard" | "multipliers" | "claim" | "admin";

function AirdropPage(): React.ReactNode {
  const navigate = useNavigate();
  const location = useLocation();
  const { fid: routeFid } = useParams();
  const [expandedQuest, setExpandedQuest] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<PageView>("main");
  // const [adminInput, setAdminInput] = useState<string>("");
  const [shouldFetchQuests, setShouldFetchQuests] = useState(false);
  const hasFetchedQuestsRef = useRef(false);

  const airdropStartDate = new Date(Date.UTC(2025, 11, 19, 13, 13, 0));

  const { data: authData } = useAuth();

  // Check if current user is an admin
  const isAdmin = authData?.fid && ADMIN_FIDS.includes(authData.fid);
  const isViewingOtherUser = routeFid && routeFid !== authData?.fid?.toString();

  // Primary data source: airdrop data from /me endpoint
  const airdropData = authData?.airdrop;
  const isEligibleForAirdrop = airdropData?.isEligible || false;
  const snapshotExists = airdropData?.snapshotExists || false;
  // const hasAllocation = !!(
  //   airdropData?.tokenAllocation && airdropData.tokenAllocation > 0
  // );
  // const hasClaimed = airdropData?.hasClaimed || false;

  // // Check claim status (for contract-level claim verification)
  // const { data: claimStatusData, isLoading: isClaimStatusLoading } =
  //   useAirdropClaimStatus({ enabled: true });

  // Only fetch detailed quest/challenge data when explicitly requested
  // This is only needed for the quests list view
  const {
    data: questsDataResponse,
    isLoading: isQuestsLoading,
    error: questsError,
    refetch: refetchQuests,
  } = useAirdropCheck({ enabled: shouldFetchQuests });

  console.log("WENA CTM");

  // Auto-fetch quests data when on main view (only once)
  useEffect(() => {
    if (currentView === "main" && !hasFetchedQuestsRef.current) {
      setShouldFetchQuests(true);
      hasFetchedQuestsRef.current = true;
    }
  }, [currentView]);

  // Countdown to midnight UTC
  const [countdown, setCountdown] = useState<string>("00:00:00");
  const [airdropStartCountdown, setAirdropStartCountdown] =
    useState<string>("");

  // Calculate time until midnight UTC
  const getTimeUntilMidnightUTC = useCallback(() => {
    const now = new Date();
    const utcYear = now.getUTCFullYear();
    const utcMonth = now.getUTCMonth();
    const utcDate = now.getUTCDate();
    const midnightUTC = Date.UTC(utcYear, utcMonth, utcDate + 1, 0, 0, 0);
    const diff = midnightUTC - now.getTime();

    if (diff <= 0) return "00:00:00";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }, []);

  // Calculate time until airdrop start: December 19th, 2025 at 13:13 PM UTC
  const getTimeUntilAirdropStart = useCallback(() => {
    const now = new Date();
    const diff = airdropStartDate.getTime() - now.getTime();

    if (diff <= 0) return "00:00:00";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}d ${String(hours).padStart(2, "0")}h ${String(
        minutes
      ).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
    }

    return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(
      2,
      "0"
    )}m ${String(seconds).padStart(2, "0")}s`;
  }, []);

  // Update countdowns every second
  // Use refs to store the callback functions to prevent effect re-runs
  const getTimeUntilMidnightUTCRef = useRef(getTimeUntilMidnightUTC);
  const getTimeUntilAirdropStartRef = useRef(getTimeUntilAirdropStart);

  // Update refs when callbacks change
  useEffect(() => {
    getTimeUntilMidnightUTCRef.current = getTimeUntilMidnightUTC;
    getTimeUntilAirdropStartRef.current = getTimeUntilAirdropStart;
  }, [getTimeUntilMidnightUTC, getTimeUntilAirdropStart]);

  useEffect(() => {
    setCountdown(getTimeUntilMidnightUTCRef.current());
    setAirdropStartCountdown(getTimeUntilAirdropStartRef.current());

    const interval = setInterval(() => {
      setCountdown(getTimeUntilMidnightUTCRef.current());
      setAirdropStartCountdown(getTimeUntilAirdropStartRef.current());
    }, 1000);

    return () => clearInterval(interval);
  }, []); // Empty deps - interval runs independently

  // Leaderboard data (kept as requested)
  const { data: leaderboardData, isLoading: leaderboardLoading } =
    useAirdropLeaderboard(100);

  // Real-time airdrop stats from contract (for admin dashboard)
  // const { data: airdropStats, isLoading: airdropStatsLoading } =
  //   useAirdropStats();

  // Preload background image on mount
  useEffect(() => {
    const img = new Image();
    img.src = airdropBackgroundImage;
  }, []);

  // Handle route changes
  useEffect(() => {
    if (location.pathname === "/claim-airdrop") {
      setCurrentView("claim");
    } else if (isAdmin && location.pathname === "/airdrop" && !routeFid) {
      setCurrentView("admin");
    } else {
      setCurrentView("main");
    }
  }, [location.pathname, isAdmin, routeFid]);

  const handleRefreshQuests = () => {
    sdk.haptics.selectionChanged();
    refetchQuests();
  };

  const handleMultipliersClick = (e: React.MouseEvent) => {
    sdk.haptics.selectionChanged();
    e.preventDefault();
    e.stopPropagation();
    setCurrentView("multipliers");
  };

  const handleLeaderboardClick = (e: React.MouseEvent) => {
    sdk.haptics.selectionChanged();
    e.preventDefault();
    e.stopPropagation();
    setCurrentView("leaderboard");
  };

  const handleClaimAirdrop = () => {
    sdk.haptics.selectionChanged();
    setCurrentView("claim");
  };

  // const handleAdminImpersonate = () => {
  //   sdk.haptics.selectionChanged();
  //   if (adminInput && /^\d+$/.test(adminInput)) {
  //     navigate(`/airdrop/${adminInput}`);
  //     setAdminInput("");
  //   }
  // };

  const handleBackToMain = () => {
    sdk.haptics.selectionChanged();
    navigate("/");
  };

  const toggleQuest = (questId: number) => {
    sdk.haptics.selectionChanged();
    setExpandedQuest(expandedQuest === questId ? null : questId);
  };

  // Helper function to get challenge data by name
  const getChallengeData = (challengeName: string) => {
    const challenges = questsDataResponse?.calculation?.challenges || [];
    return challenges.find((c: any) => c.name === challengeName);
  };

  // Individual quest rendering functions for granular control
  const renderFollowAccountsQuest = () => {
    const challenge = getChallengeData("Follow Accounts");
    if (!challenge) return null;

    const accounts = challenge.details?.accounts || [];
    const brndAccount = accounts.find((acc: any) => acc.name === "@brnd");
    const flocAccount = accounts.find((acc: any) => acc.name === "@floc");

    return {
      id: 1,
      title: "FOLLOW @BRND + @FLOC",
      progress: `${challenge.progress.current}/${challenge.progress.required}`,
      isCompleted: challenge.completed,
      currentMultiplier: challenge.currentMultiplier,
      maxMultiplier: challenge.maxMultiplier,
      progressData: challenge.progress,
      progressPercentage: Math.min(
        (challenge.progress.current / challenge.progress.required) * 100,
        100
      ),
      nextTier: challenge.tiers.find((tier: any) => !tier.achieved),
      customDetails: {
        accounts: [
          {
            name: "@brnd",
            followed: brndAccount?.followed || false,
            status: brndAccount?.followed ? "✅ Following" : "❌ Not Following",
          },
          {
            name: "@floc",
            followed: flocAccount?.followed || false,
            status: flocAccount?.followed ? "✅ Following" : "❌ Not Following",
          },
        ],
      },
      tasks: challenge.tiers.map((tier: any) => ({
        name: `${tier.requirement} accounts`,
        multiplier: `${tier.multiplier}X`,
        completed: tier.achieved,
        requirement: tier.requirement,
      })),
    };
  };

  const renderChannelInteractionQuest = () => {
    const challenge = getChallengeData("Channel Interaction /brnd");
    if (!challenge) return null;

    const channelFollow = challenge.details?.channelFollow;
    const podiumCasts = challenge.details?.podiumCasts;

    return {
      id: 2,
      title: "INTERACT WITH /BRND CHANNEL",
      progress: `${challenge.progress.current}/${challenge.progress.required}`,
      isCompleted: challenge.completed,
      currentMultiplier: challenge.currentMultiplier,
      maxMultiplier: challenge.maxMultiplier,
      progressData: challenge.progress,
      progressPercentage: Math.min(
        (challenge.progress.current / challenge.progress.required) * 100,
        100
      ),
      nextTier: challenge.tiers.find((tier: any) => !tier.achieved),
      customDetails: {
        channelStatus: channelFollow?.followed
          ? "✅ Following /brnd"
          : "❌ Not Following /brnd",
        podiumsPublished: `📤 ${podiumCasts?.count || 0} podiums published`,
        requirement: `Need ${
          podiumCasts?.required || 1
        } podium + follow channel`,
      },
      tasks: challenge.tiers.map((tier: any) => ({
        name:
          tier.requirement === 1
            ? "Follow channel"
            : "Follow + Publish podiums",
        multiplier: `${tier.multiplier}X`,
        completed: tier.achieved,
        requirement: tier.requirement,
      })),
    };
  };

  const renderHoldingBrndQuest = () => {
    const challenge = getChallengeData("Holding $BRND");
    if (!challenge) return null;

    const details = challenge.details;
    const walletBalance = details?.formattedWalletBalance || "0";
    const stakedBalance = details?.formattedStakedBalance || "0";

    return {
      id: 3,
      title: "HOLDING $BRND",
      progress: `${
        Math.round(challenge.progress.current)?.toLocaleString() ?? 0
      }/${challenge.progress.required?.toLocaleString() ?? 0}`,
      isCompleted: challenge.completed,
      currentMultiplier: challenge.currentMultiplier,
      maxMultiplier: challenge.maxMultiplier,
      progressData: challenge.progress,
      progressPercentage: Math.min(
        (challenge.progress.current / challenge.progress.required) * 100,
        100
      ),
      nextTier: details?.nextTier,
      customDetails: {
        walletBalance: `💰 Wallet: ${walletBalance} $BRND`,
        stakedBalance: `🥩 Staked: ${stakedBalance} $BRND`,
        totalBalance: `📊 Total: ${details?.formattedBalance || "0"} $BRND`,
        nextTierInfo: details?.nextTier
          ? `Next: ${
              details.nextTier?.requirement?.toLocaleString() ?? 0
            } $BRND (${details.nextTier?.multiplier?.toLocaleString() ?? 0}X)`
          : "Max tier reached!",
      },
      tasks: challenge.tiers.map((tier: any) => ({
        name: `${tier.requirement?.toLocaleString() ?? 0} $BRND`,
        multiplier: `${tier.multiplier}X`,
        completed: tier.achieved,
        requirement: tier.requirement,
      })),
    };
  };

  const renderCollectiblesQuest = () => {
    const challenge = getChallengeData("Collect @brndbot casts");
    if (!challenge) return null;

    return {
      id: 4,
      title: "COLLECT CAST COLLECTIBLES",
      progress: `${challenge.progress.current}/${challenge.progress.required}`,
      isCompleted: challenge.completed,
      currentMultiplier: challenge.currentMultiplier,
      maxMultiplier: challenge.maxMultiplier,
      progressData: challenge.progress,
      progressPercentage: Math.min(
        (challenge.progress.current / challenge.progress.required) * 100,
        100
      ),
      nextTier: challenge.tiers.find((tier: any) => !tier.achieved),
      customDetails: {
        collected: `🎨 ${challenge.progress.current} collectibles`,
        needed: `Need ${
          challenge.progress.required - challenge.progress.current
        } more`,
        source: "From @brndy or @brnd casts",
      },
      tasks: challenge.tiers.map((tier: any) => ({
        name: `${tier.requirement} collectibles`,
        multiplier: `${tier.multiplier}X`,
        completed: tier.achieved,
        requirement: tier.requirement,
      })),
    };
  };

  const renderVotingQuest = () => {
    const challenge = getChallengeData("# of different brands voted");
    if (!challenge) return null;

    return {
      id: 5,
      title: "VOTING FOR DIFFERENT BRANDS",
      progress: `${challenge.progress.current}/${challenge.progress.required}`,
      isCompleted: challenge.completed,
      currentMultiplier: challenge.currentMultiplier,
      maxMultiplier: challenge.maxMultiplier,
      progressData: challenge.progress,
      progressPercentage: Math.min(
        (challenge.progress.current / challenge.progress.required) * 100,
        100
      ),
      nextTier: challenge.details?.nextTier,
      customDetails: {
        uniqueBrands: `🗳️ ${
          challenge.details?.uniqueBrandsVoted || challenge.progress.current
        } unique brands voted`,
        nextTarget: challenge.details?.nextTier
          ? `Next: ${challenge.details.nextTier.requirement} brands (${challenge.details.nextTier.multiplier}X)`
          : "Max tier reached!",
        tip: "Vote for more variety to increase multiplier",
      },
      tasks: challenge.tiers.map((tier: any) => ({
        name: `${tier.requirement} brands`,
        multiplier: `${tier.multiplier}X`,
        completed: tier.achieved,
        requirement: tier.requirement,
      })),
    };
  };

  const renderSharingQuest = () => {
    const challenge = getChallengeData("Podiums Shared");
    if (!challenge) return null;

    return {
      id: 6,
      title: "SHARING PODIUMS",
      progress: `${challenge.progress.current}/${challenge.progress.required}`,
      isCompleted: challenge.completed,
      currentMultiplier: challenge.currentMultiplier,
      maxMultiplier: challenge.maxMultiplier,
      progressData: challenge.progress,
      progressPercentage: Math.min(
        (challenge.progress.current / challenge.progress.required) * 100,
        100
      ),
      nextTier: challenge.details?.nextTier,
      customDetails: {
        shared: `📤 ${
          challenge.details?.sharedPodiumsCount || challenge.progress.current
        } podiums shared`,
        nextTarget: challenge.details?.nextTier
          ? `Next: ${challenge.details.nextTier.requirement} shares (${challenge.details.nextTier.multiplier}X)`
          : "Max tier reached!",
        tip: "Share your voting results to increase multiplier",
      },
      tasks: challenge.tiers.map((tier: any) => ({
        name: `${tier.requirement} podiums`,
        multiplier: `${tier.multiplier}X`,
        completed: tier.achieved,
        requirement: tier.requirement,
      })),
    };
  };

  const renderNeynarQuest = () => {
    const challenge = getChallengeData("Neynar Score");
    if (!challenge) return null;

    return {
      id: 7,
      title: "NEYNAR SCORE",
      progress: `${challenge.progress.current}/${challenge.progress.required}`,
      isCompleted: challenge.completed,
      currentMultiplier: challenge.currentMultiplier,
      maxMultiplier: challenge.maxMultiplier,
      progressData: challenge.progress,
      progressPercentage: Math.min(
        (challenge.progress.current / challenge.progress.required) * 100,
        100
      ),
      nextTier: challenge.details?.nextTier,
      customDetails: {
        currentScore: `⭐ Score: ${
          challenge.details?.neynarScore || challenge.progress.current
        }`,
        nextTarget: challenge.details?.nextTier
          ? `Next: ${challenge.details.nextTier.requirement} score (${challenge.details.nextTier.multiplier}X)`
          : "Max tier reached!",
        tip: "Maintain high reputation score on Neynar",
      },
      tasks: challenge.tiers.map((tier: any) => ({
        name: `${tier.requirement}`,
        multiplier: `${tier.multiplier}X`,
        completed: tier.achieved,
        requirement: tier.requirement,
      })),
    };
  };

  const renderProUserQuest = () => {
    const challenge = getChallengeData("Pro User");
    if (!challenge) return null;

    return {
      id: 8,
      title: "FARCASTER PRO",
      progress: `${challenge.progress.current}/${challenge.progress.required}`,
      isCompleted: challenge.completed,
      currentMultiplier: challenge.currentMultiplier,
      maxMultiplier: challenge.maxMultiplier,
      progressData: challenge.progress,
      progressPercentage:
        challenge.progress.current >= challenge.progress.required ? 100 : 0,
      nextTier: challenge.details?.nextTier,
      customDetails: {
        status: challenge.details?.isProUser
          ? "✅ Farcaster Pro Active"
          : "❌ Not Farcaster Pro",
        benefit: "Subscribe to Farcaster Pro for multiplier boost",
      },
      tasks: challenge.tiers.map((tier: any) => ({
        name: "Pro subscription",
        multiplier: `1.2X`,
        completed: tier.achieved,
        requirement: tier.requirement,
      })),
    };
  };

  // Create hardcoded quest elements using individual render functions
  const questsData = useMemo(() => {
    if (!questsDataResponse?.calculation?.challenges) {
      return [];
    }

    return [
      renderFollowAccountsQuest(),
      renderChannelInteractionQuest(),
      renderHoldingBrndQuest(),
      renderCollectiblesQuest(),
      renderVotingQuest(),
      renderSharingQuest(),
      renderNeynarQuest(),
      renderProUserQuest(),
    ].filter(Boolean); // Remove any null values
  }, [questsDataResponse]);

  // Check if airdrop has ended but snapshot is not yet available
  const now = new Date();
  const airdropHasEnded = now.getTime() >= airdropStartDate.getTime();
  const isSnapshotBeingTaken = airdropHasEnded && !snapshotExists;

  if (true) {
    // Format total claimed tokens from Wei (1e18)

    return (
      <div className={styles.container}>
        <img src={Logo} className={styles.logo} alt="BRND Logo" />

        <div className={styles.snapshotTitle}>
          <AirdropSvg />
        </div>

        <div className={styles.snapshotContent}>
          <Typography
            variant="geist"
            weight="medium"
            size={16}
            lineHeight={24}
            textAlign="center"
            className={styles.notEligibleText}
          >
            S E A S O N 1
          </Typography>
          <Typography
            variant="geist"
            weight="medium"
            size={16}
            lineHeight={24}
            textAlign="center"
            className={styles.notEligibleText}
          >
            The airdrop claiming period has ended. Thank you to everyone who
            participated!
          </Typography>

          <div className={styles.claimersContainer}>
            <div className={styles.claimersGrid}>
              <div className={styles.claimersCard}>
                <Typography
                  variant="druk"
                  weight="wide"
                  size={32}
                  lineHeight={32}
                >
                  594
                </Typography>
                <Typography variant="geist" weight="medium" size={14}>
                  of you claimed
                </Typography>
              </div>

              <div className={styles.claimersCard}>
                <Typography
                  variant="druk"
                  weight="wide"
                  size={28}
                  lineHeight={32}
                >
                  1.086.706.947
                </Typography>
                <Typography variant="geist" weight="medium" size={14}>
                  Total $BRND Claimed
                </Typography>
              </div>
            </div>

            <Button
              caption="Go Back"
              onClick={handleBackToMain}
              variant="primary"
            />
          </div>
        </div>
      </div>
    );
  }

  // Show snapshot being taken screen if airdrop ended but snapshot not available
  if (isSnapshotBeingTaken) {
    return (
      <div className={styles.snapshotContainer}>
        <img src={Logo} className={styles.logo} alt="BRND Logo" />

        <div className={styles.snapshotTitle}>
          <SnapshotIcon />
        </div>

        <div className={styles.snapshotContent}>
          <Typography
            variant="geist"
            weight="medium"
            size={16}
            lineHeight={24}
            textAlign="center"
            className={styles.notEligibleText}
          >
            We are taking the airdrop 1 snapshot and finalizing details.
          </Typography>
          <Typography
            variant="geist"
            weight="medium"
            size={16}
            lineHeight={24}
            textAlign="center"
            className={styles.notEligibleText}
          >
            Stay tuned to your notifications to come and claim
          </Typography>
        </div>

        <div className={styles.notEligibleButtonSection}>
          <Button
            caption="Back Home"
            onClick={handleBackToMain}
            variant="primary"
          />
        </div>
      </div>
    );
  }

  // Show not eligible screen if snapshot exists but user is not eligible
  if (airdropData && snapshotExists && !isEligibleForAirdrop) {
    return (
      <div className={styles.container}>
        <div className={styles.airdropTitle}>
          <AirdropSvg />
        </div>

        <div className={styles.notEligibleContainer}>
          <div className={styles.notEligibleMessages}>
            <Typography
              variant="geist"
              weight="medium"
              size={16}
              lineHeight={20}
              textAlign="center"
              className={styles.notEligibleText}
            >
              We are sorry, but you didn't qualify for the BRND Season 1
              airdrop.
            </Typography>

            <Typography
              variant="geist"
              weight="medium"
              size={16}
              lineHeight={20}
              textAlign="center"
              className={styles.notEligibleText}
            >
              But you can still vote and participate on season 2, and level up
              your score for the next one.
            </Typography>
            <Typography
              variant="geist"
              weight="medium"
              size={16}
              lineHeight={20}
              textAlign="center"
              className={styles.notEligibleText}
            >
              Welcome back to BRND.
            </Typography>
          </div>
        </div>

        <div className={styles.notEligibleButtonSection}>
          <Button
            caption="Back Home"
            onClick={handleBackToMain}
            variant="primary"
          />
        </div>
      </div>
    );
  }

  // Show claim view if user is eligible, snapshot exists, and has allocation
  // OR if current view is explicitly set to claim

  // Admin Dashboard View
  if (currentView === "admin" && isAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.airdropTitle}>
          <Typography
            variant="druk"
            weight="wide"
            size={48}
            lineHeight={48}
            className={styles.airdropTitleText}
          >
            ADMIN DASHBOARD
          </Typography>
        </div>

        <div className={styles.headerSection}>
          <button className={styles.backButton} onClick={handleBackToMain}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18L9 12L15 6"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* <div className={styles.adminContent}>
          <div className={styles.impersonateSection}>
            <Typography
              variant="geist"
              weight="medium"
              size={16}
              lineHeight={20}
              className={styles.adminSectionTitle}
            >
              Impersonate User
            </Typography>
            <Typography
              variant="geist"
              weight="medium"
              size={14}
              lineHeight={18}
              className={styles.adminDescription}
            >
              Enter a FID to view their airdrop stats
            </Typography>
            <div className={styles.impersonateInput}>
              <input
                type="text"
                placeholder="Enter FID (numbers only)"
                value={adminInput}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*$/.test(value)) {
                    setAdminInput(value);
                  }
                }}
                className={styles.fidInput}
              />
              <Button
                caption="View User"
                onClick={handleAdminImpersonate}
                disabled={!adminInput || !/^\d+$/.test(adminInput)}
                variant="primary"
              />
            </div>
          </div>

          <div className={styles.airdropStatsSection}>
            <Typography
              variant="geist"
              weight="medium"
              size={16}
              lineHeight={20}
              className={styles.adminSectionTitle}
            >
              Airdrop Statistics
            </Typography>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <Typography
                  variant="druk"
                  weight="wide"
                  size={32}
                  lineHeight={32}
                >
                  {airdropStatsLoading
                    ? "..."
                    : airdropStats?.claimStats.totalClaimers?.toLocaleString() ||
                      "—"}
                </Typography>
                <Typography variant="geist" weight="medium" size={14}>
                  Total Claims
                </Typography>
              </div>
              <div className={styles.statCard}>
                <Typography
                  variant="druk"
                  weight="wide"
                  size={32}
                  lineHeight={32}
                >
                  1111
                </Typography>
                <Typography variant="geist" weight="medium" size={14}>
                  Eligible Users
                </Typography>
              </div>
              <div className={styles.statCard}>
                <Typography
                  variant="druk"
                  weight="wide"
                  size={32}
                  lineHeight={32}
                >
                  {airdropStatsLoading
                    ? "..."
                    : airdropStats?.claimStats.totalClaimedTokens
                    ? `${(
                        airdropStats.claimStats.totalClaimedTokens / 1000000
                      ).toFixed(1)}M`
                    : "—"}
                </Typography>
                <Typography variant="geist" weight="medium" size={14}>
                  Tokens Claimed
                </Typography>
              </div>
              <div className={styles.statCard}>
                <Typography
                  variant="druk"
                  weight="wide"
                  size={32}
                  lineHeight={32}
                >
                  {airdropStatsLoading
                    ? "..."
                    : airdropStats?.claimRate
                    ? `${airdropStats.claimRate.toFixed(0)}%`
                    : "—"}
                </Typography>
                <Typography variant="geist" weight="medium" size={14}>
                  Claim Rate
                </Typography>
              </div>
              <div className={styles.statCard}>
                <Typography
                  variant="druk"
                  weight="wide"
                  size={32}
                  lineHeight={32}
                >
                  {airdropStatsLoading
                    ? "..."
                    : airdropStats?.timeRemainingFormatted || "—"}
                </Typography>
                <Typography variant="geist" weight="medium" size={14}>
                  Time Remaining
                </Typography>
              </div>
              <div className={styles.statCard}>
                <Typography
                  variant="druk"
                  weight="wide"
                  size={32}
                  lineHeight={32}
                >
                  {airdropStatsLoading
                    ? "..."
                    : airdropStats?.airdropStatus || "—"}
                </Typography>
                <Typography variant="geist" weight="medium" size={14}>
                  Airdrop Status
                </Typography>
              </div>
            </div>
          </div>
        </div> */}
      </div>
    );
  }

  // Main component with data
  return (
    <div className={styles.container}>
      <div className={styles.airdropTitle}>
        <AirdropSvg />
      </div>

      <div className={styles.airdropHeader}>
        <button className={styles.backButton} onClick={handleBackToMain}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18L9 12L15 6"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {currentView === "multipliers" ? (
          <div className={`${styles.leaderboardCard} ${styles.nonClickable}`}>
            <div className={styles.leaderboardContent}>
              <div className={styles.leaderboardLabelContainer}>
                <Typography
                  variant="druk"
                  weight="wide"
                  size={14}
                  lineHeight={18}
                  className={styles.leaderboardLabel}
                >
                  HOW MULTIPLIERS WORK
                </Typography>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`${styles.leaderboardCard} ${
              currentView === "main" ? "" : styles.nonClickable
            }`}
            onClick={
              currentView === "main" ? handleLeaderboardClick : undefined
            }
          >
            <div className={styles.pfpBox}>
              <div className={styles.userPfp}>
                <img
                  src={authData?.photoUrl}
                  alt="User Profile"
                  className={styles.pfpImage}
                />
              </div>
            </div>

            <div className={styles.leaderboardContent}>
              {currentView === "main" && (
                <div className={styles.leaderboardLabelContainer}>
                  <Typography
                    variant="druk"
                    weight="wide"
                    size={14}
                    lineHeight={18}
                    className={styles.leaderboardLabel}
                  >
                    {isViewingOtherUser
                      ? `VIEWING FID ${routeFid}`
                      : "LEADERBOARD"}
                  </Typography>
                  {isAdmin && !isViewingOtherUser && (
                    <Typography
                      variant="geist"
                      weight="medium"
                      size={10}
                      lineHeight={12}
                      className={styles.adminBadge}
                    >
                      ADMIN
                    </Typography>
                  )}
                </div>
              )}

              <div className={styles.pointsDisplay}>
                <Typography
                  variant="druk"
                  weight="wide"
                  size={28}
                  lineHeight={32}
                  className={styles.pointsNumber}
                >
                  {airdropData?.airdropScore?.toLocaleString() || "—"}
                </Typography>
                <Typography
                  variant="druk"
                  weight="wide"
                  size={8}
                  lineHeight={12}
                  className={styles.pointsLabel}
                >
                  POINTS
                </Typography>
              </div>
              <Typography
                variant="druk"
                weight="wide"
                size={32}
                lineHeight={32}
                className={styles.rankNumber}
              >
                #{airdropData?.leaderboardPosition || "—"}
              </Typography>
            </div>
          </div>
        )}
      </div>

      {/* Main View - Multipliers Section */}
      {currentView === "main" && airdropData && (
        <div className={styles.multipliersSection}>
          <div className={styles.multipliersTextButton}>
            <Typography
              variant="geist"
              weight="medium"
              size={12}
              lineHeight={16}
            >
              Refreshes in: {countdown}
            </Typography>
          </div>
          <span onClick={handleMultipliersClick}>
            <Typography
              variant="geist"
              weight="medium"
              size={12}
              lineHeight={16}
              className={styles.howMultipliersWork}
            >
              How Multipliers work <QuestionMarkIcon />
            </Typography>
          </span>
        </div>
      )}

      {/* Leaderboard View - Share Button */}
      {currentView === "leaderboard" && airdropData && (
        <div className={styles.shareButton}>
          <Button
            caption="Share"
            onClick={() => {
              sdk.haptics.selectionChanged();
              sdk.actions.composeCast({
                text: `Check out your points for the $BRND airdrop!\n\nMy stats:\n\nLeaderboard Position: #${
                  airdropData?.leaderboardPosition || "—"
                }\nPoints: ${
                  airdropData?.airdropScore?.toLocaleString() || "—"
                }`,
                embeds: ["https://brnd.land"],
              });
            }}
            variant="primary"
          />
        </div>
      )}

      {/* Main View - Quests List */}
      {currentView === "main" && (
        <>
          {isQuestsLoading ? (
            <div className={styles.emptyState}>
              <LoaderIndicator size={24} />
            </div>
          ) : questsError ? (
            <div className={styles.emptyState}>
              <Typography variant="geist" weight="medium" size={16}>
                Failed to load quests
              </Typography>
              <Button
                caption="Retry"
                onClick={handleRefreshQuests}
                variant="primary"
              />
            </div>
          ) : questsData.length > 0 ? (
            <div className={styles.questsList}>
              {questsData.map((quest: any) => (
                <div key={quest.id} className={styles.questItem}>
                  <div
                    className={`${styles.questHeader} ${
                      quest.isCompleted ? styles.completed : ""
                    }`}
                    onClick={() => toggleQuest(quest.id)}
                  >
                    <Typography
                      variant="druk"
                      weight="bold"
                      size={21}
                      lineHeight={16}
                      className={styles.questNumber}
                    >
                      {quest.id}
                    </Typography>
                    <div className={styles.questContent}>
                      <Typography
                        variant="geist"
                        weight="medium"
                        size={14}
                        lineHeight={16}
                        className={styles.questTitle}
                      >
                        {quest.title}
                      </Typography>
                      <div className={styles.questProgressInfo}>
                        <Typography
                          variant="geist"
                          weight="medium"
                          size={12}
                          lineHeight={14}
                          className={styles.questProgress}
                        >
                          {quest.progressData.unit === "$BRND"
                            ? `${
                                Math.round(
                                  quest.progressData.current
                                )?.toLocaleString() ?? 0
                              } / ${
                                Math.round(
                                  quest.progressData.required
                                )?.toLocaleString() ?? 0
                              } ${quest.progressData.unit}`
                            : `${quest.progressData.current.toLocaleString()} / ${quest.progressData.required.toLocaleString()} ${
                                quest.progressData.unit
                              }`}
                        </Typography>
                        <div className={styles.progressBar}>
                          <div
                            className={styles.progressFill}
                            style={{ width: `${quest.progressPercentage}%` }}
                          />
                        </div>
                      </div>
                      {quest.nextTier && (
                        <Typography
                          variant="geist"
                          weight="medium"
                          size={10}
                          lineHeight={12}
                          className={styles.nextTierInfo}
                        >
                          Next:{" "}
                          {quest.nextTier?.requirement?.toLocaleString() ?? 0}{" "}
                          {quest.progressData.unit} (
                          {quest.nextTier?.multiplier?.toLocaleString() ?? 0}
                          X)
                        </Typography>
                      )}
                    </div>
                    <div className={styles.questToggle} aria-hidden>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        className={
                          expandedQuest === quest.id
                            ? styles.chevronUp
                            : styles.chevronDown
                        }
                      >
                        <path
                          d="M15 18L9 12L15 6"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>

                  {expandedQuest === quest.id && (
                    <div className={styles.questDetails}>
                      <div className={styles.tiersSection}>
                        {/* Follow Accounts Quest - Merged Account + Multiplier Layout */}
                        {quest.id === 1 && quest.customDetails?.accounts ? (
                          <>
                            {/* First tier: 1 account followed (1.2X) */}
                            {(() => {
                              const followedAccounts =
                                quest.customDetails.accounts.filter(
                                  (acc: any) => acc.followed
                                );
                              const firstFollowedAccount = followedAccounts[0];
                              const tier1Completed =
                                followedAccounts.length >= 1;

                              return (
                                <div
                                  key="tier1"
                                  className={`${styles.taskItem}`}
                                >
                                  <Typography
                                    variant="geist"
                                    weight="medium"
                                    size={14}
                                    lineHeight={18}
                                    className={styles.taskName}
                                  >
                                    {firstFollowedAccount
                                      ? `${firstFollowedAccount.name}`
                                      : `1 account (Follow ${
                                          quest.customDetails.accounts[0]
                                            ?.name || "@brnd"
                                        } or ${
                                          quest.customDetails.accounts[1]
                                            ?.name || "@floc"
                                        })`}
                                  </Typography>
                                  <Typography
                                    variant="druk"
                                    weight="regular"
                                    size={20}
                                    lineHeight={14}
                                    className={styles.taskMultiplier}
                                  >
                                    1.2X
                                  </Typography>
                                  <div
                                    className={`${styles.taskStatus} ${
                                      tier1Completed ? styles.taskCompleted : ""
                                    }`}
                                    aria-hidden
                                  >
                                    {tier1Completed ? (
                                      <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        className={styles.statusIcon}
                                      >
                                        <circle
                                          cx="12"
                                          cy="12"
                                          r="12"
                                          fill="#FFFFFF"
                                        />
                                        <path
                                          d="M7.5 12.5L10.5 15.5L16.5 9.5"
                                          stroke="#6A45FF"
                                          strokeWidth="2.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    ) : (
                                      <IncompleteTaskIcon
                                        width={24}
                                        height={24}
                                        className={styles.statusIcon}
                                      />
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Second tier: 2 accounts followed (1.4X) */}
                            {(() => {
                              const followedAccounts =
                                quest.customDetails.accounts.filter(
                                  (acc: any) => acc.followed
                                );
                              const tier2Completed =
                                followedAccounts.length >= 2;

                              return (
                                <div
                                  key="tier2"
                                  className={`${styles.taskItem}`}
                                >
                                  <Typography
                                    variant="geist"
                                    weight="medium"
                                    size={14}
                                    lineHeight={18}
                                    className={styles.taskName}
                                  >
                                    {tier2Completed
                                      ? `@brnd + @floc`
                                      : `2 accounts (Follow both @brnd + @floc)`}
                                  </Typography>
                                  <Typography
                                    variant="druk"
                                    weight="regular"
                                    size={20}
                                    lineHeight={14}
                                    className={styles.taskMultiplier}
                                  >
                                    1.4X
                                  </Typography>
                                  <div
                                    className={`${styles.taskStatus} ${
                                      tier2Completed ? styles.taskCompleted : ""
                                    }`}
                                    aria-hidden
                                  >
                                    {tier2Completed ? (
                                      <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        className={styles.statusIcon}
                                      >
                                        <circle
                                          cx="12"
                                          cy="12"
                                          r="12"
                                          fill="#FFFFFF"
                                        />
                                        <path
                                          d="M7.5 12.5L10.5 15.5L16.5 9.5"
                                          stroke="#6A45FF"
                                          strokeWidth="2.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    ) : (
                                      <IncompleteTaskIcon
                                        width={24}
                                        height={24}
                                        className={styles.statusIcon}
                                      />
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </>
                        ) : (
                          /* Default Task Layout for all other quests */
                          quest.tasks.map((task: any, index: number) => (
                            <div key={index} className={`${styles.taskItem}`}>
                              <Typography
                                variant="geist"
                                weight="medium"
                                size={14}
                                lineHeight={18}
                                className={styles.taskName}
                              >
                                {task.name}
                              </Typography>
                              <Typography
                                variant="druk"
                                weight="regular"
                                size={20}
                                lineHeight={14}
                                className={styles.taskMultiplier}
                              >
                                {task.multiplier}
                              </Typography>
                              <div
                                className={`${styles.taskStatus} ${
                                  task.completed ? styles.taskCompleted : ""
                                }`}
                                aria-hidden
                              >
                                {task.completed ? (
                                  <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className={styles.statusIcon}
                                  >
                                    <circle
                                      cx="12"
                                      cy="12"
                                      r="12"
                                      fill="#FFFFFF"
                                    />
                                    <path
                                      d="M7.5 12.5L10.5 15.5L16.5 9.5"
                                      stroke="#6A45FF"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                ) : (
                                  <IncompleteTaskIcon
                                    width={24}
                                    height={24}
                                    className={styles.statusIcon}
                                  />
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div
              onClick={() => {
                sdk.haptics.selectionChanged();
                sdk.actions.viewCast({
                  hash: "0x10871d1e136be4e37625dd1126be97e873947ea3",
                });
              }}
              className={styles.emptyState}
            >
              <Typography
                variant="geist"
                weight="medium"
                size={16}
                className={styles.emptyStateText}
              >
                Check your airdrop eligibility and multipliers
              </Typography>
            </div>
          )}
        </>
      )}

      {/* Leaderboard View - Leaderboard List */}
      {currentView === "leaderboard" && (
        <div className={styles.leaderboardList}>
          {leaderboardLoading ? (
            <div className={styles.leaderboardLoading}>
              <LoaderIndicator size={24} />
            </div>
          ) : (
            leaderboardData?.leaderboard.map((entry) => {
              const isCurrentUser = entry.fid === authData?.fid;
              return (
                <div
                  key={entry.fid}
                  className={`${styles.leaderboardItem} ${
                    isCurrentUser ? styles.highlighted : ""
                  }`}
                  onClick={() => {
                    sdk.actions.viewProfile({ fid: entry.fid });
                  }}
                >
                  <Typography
                    variant="geist"
                    weight="medium"
                    size={14}
                    lineHeight={18}
                  >
                    {String(entry.rank).padStart(2, "0")}
                  </Typography>

                  <div className={styles.leaderboardUser}>
                    <div className={styles.smallPfp}>
                      <img
                        src={entry.photoUrl!}
                        alt={entry.username}
                        className={styles.pfpImage}
                      />
                    </div>
                    <Typography
                      variant="geist"
                      weight="bold"
                      size={14}
                      className={styles.leaderboardName}
                    >
                      {entry.username}
                    </Typography>
                  </div>
                  <Typography
                    variant="geist"
                    weight="bold"
                    size={16}
                    className={styles.leaderboardPoints}
                  >
                    {Math.round(entry.finalScore)}
                  </Typography>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Multipliers View - Multipliers Info */}
      {currentView === "multipliers" && (
        <div className={styles.multipliersContent}>
          <Typography
            variant="geist"
            weight="medium"
            size={14}
            lineHeight={20}
            className={styles.multiplierText}
          >
            Multipliers boost your airdrop points! Complete different activities
            to earn higher multipliers:
          </Typography>

          <Typography
            variant="geist"
            weight="medium"
            size={14}
            lineHeight={18}
            className={styles.multiplierText}
          >
            • Follow @BRND + @FLOC accounts (up to 1.4x)
          </Typography>

          <Typography
            variant="geist"
            weight="medium"
            size={14}
            lineHeight={18}
            className={styles.multiplierText}
          >
            • Interact with /brnd channel and share podiums (up to 1.4x)
          </Typography>

          <Typography
            variant="geist"
            weight="medium"
            size={14}
            lineHeight={18}
            className={styles.multiplierText}
          >
            • Hold $BRND tokens - more tokens = higher multiplier (up to 1.8x)
          </Typography>

          <Typography
            variant="geist"
            weight="medium"
            size={14}
            lineHeight={18}
            className={styles.multiplierText}
          >
            • Collect @brndy or @brnd cast collectibles (up to 1.8x)
          </Typography>

          <Typography
            variant="geist"
            weight="medium"
            size={14}
            lineHeight={18}
            className={styles.multiplierText}
          >
            • Vote for different brands - more variety = higher rewards (up to
            1.8x)
          </Typography>

          <Typography
            variant="geist"
            weight="medium"
            size={14}
            lineHeight={18}
            className={styles.multiplierText}
          >
            • Share your voting results as podiums (up to 1.8x)
          </Typography>

          <Typography
            variant="geist"
            weight="medium"
            size={14}
            lineHeight={18}
            className={styles.multiplierText}
          >
            • Have a high Neynar reputation score (up to 1.8x)
          </Typography>

          <Typography
            variant="geist"
            weight="medium"
            size={14}
            lineHeight={18}
            className={styles.multiplierText}
          >
            • Be a Farcaster Pro user (1.4x)
          </Typography>

          <Typography
            variant="geist"
            weight="bold"
            size={14}
            lineHeight={20}
            className={styles.multiplierText}
          >
            All multipliers stack together! Your final score = Base Points × All
            Multipliers
          </Typography>
        </div>
      )}

      {/* Main View - Claim/Check Button */}
      {currentView === "main" && (
        <div className={styles.claimSection}>
          {(() => {
            // Show loading while checking claim status
            if (true && !airdropData) {
              return (
                <Button
                  iconLeft={<CheckLabelIcon />}
                  caption="Checking Eligibility..."
                  loading={true}
                  disabled={true}
                  onClick={() => {}}
                />
              );
            }

            // Use airdrop data from /me endpoint as primary source
            if (airdropData) {
              // Snapshot doesn't exist yet
              if (!snapshotExists) {
                return (
                  <Button
                    iconLeft={<CheckLabelIcon />}
                    caption={`Airdrop in ${airdropStartCountdown}`}
                    disabled={true}
                    onClick={() => {
                      sdk.haptics.selectionChanged();
                    }}
                  />
                );
              }

              // Snapshot exists - check eligibility
              if (isEligibleForAirdrop) {
                // Check if already claimed (from /me endpoint or claim status)
                // const hasClaimedStatus =
                //   hasClaimed ||
                //   (claimStatusData?.success && claimStatusData.data.hasClaimed);

                // if (hasClaimedStatus) {
                //   return (
                //     <Button
                //       iconLeft={<CheckLabelIcon />}
                //       caption="Already Claimed!"
                //       disabled={true}
                //       onClick={() => {}}
                //     />
                //   );
                // }

                // Eligible and can claim
                return (
                  <Button
                    iconLeft={<CheckLabelIcon />}
                    caption="Claim Airdrop"
                    onClick={handleClaimAirdrop}
                  />
                );
              } else {
                // Not eligible
                return (
                  <Button
                    iconLeft={<CheckLabelIcon />}
                    caption="Not Eligible"
                    disabled={true}
                    onClick={() => {}}
                  />
                );
              }
            }

            // Fallback: No airdrop data available yet
            return (
              <Button
                iconLeft={<CheckLabelIcon />}
                caption="Loading..."
                disabled={true}
                loading={true}
                onClick={() => {}}
              />
            );
          })()}
        </div>
      )}

      {/* Admin Dashboard Button */}
      {isAdmin && currentView === "main" && (
        <div className={styles.adminDashboardSection}>
          <Button
            caption={isViewingOtherUser ? "Admin Dashboard" : "Admin Dashboard"}
            onClick={() => {
              sdk.haptics.selectionChanged();
              navigate("/airdrop");
            }}
            variant="secondary"
          />
        </div>
      )}
    </div>
  );
}

export default withProtectionRoute(React.memo(AirdropPage), "only-connected");
