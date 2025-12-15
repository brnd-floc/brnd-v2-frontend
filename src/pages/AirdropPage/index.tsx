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
import { useAirdropClaimStatus } from "@/shared/hooks/user/useAirdropClaimStatus";
import { useAirdropStats } from "@/shared/hooks/contract/useAirdropStats";

// Hocs
import withProtectionRoute from "@/hocs/withProtectionRoute";
import sdk from "@farcaster/miniapp-sdk";
import CheckLabelIcon from "@/assets/icons/check-label-icon.svg?react";
import { useAuth } from "@/shared/hooks/auth/useAuth";
import AirdropSvg from "@/shared/assets/images/airdrop.svg?react";
import IncompleteTaskIcon from "@/shared/assets/icons/incomplete-task.svg?react";
import QuestionMarkIcon from "@/shared/assets/icons/question-mark.svg?react";

// Assets
import airdropBackgroundImage from "@/shared/assets/images/airdrop-background.png";

// Partials
import ClaimAirdrop from "./partials/ClaimAirdrop";

// Admin FIDs
const ADMIN_FIDS = [6431, 6099, 8109, 222144, 16098];

type PageView = "main" | "leaderboard" | "multipliers" | "claim" | "admin";

function AirdropPage(): React.ReactNode {
  const navigate = useNavigate();
  const location = useLocation();
  const { fid: routeFid } = useParams();
  const [expandedQuest, setExpandedQuest] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<PageView>("main");
  const [adminInput, setAdminInput] = useState<string>("");
  const [shouldFetchQuests, setShouldFetchQuests] = useState(false);
  const hasFetchedQuestsRef = useRef(false);

  const { data: authData } = useAuth();

  // Check if current user is an admin
  const isAdmin = authData?.fid && ADMIN_FIDS.includes(authData.fid);
  const isViewingOtherUser = routeFid && routeFid !== authData?.fid?.toString();

  // Primary data source: airdrop data from /me endpoint
  const airdropData = authData?.airdrop;
  const isEligibleForAirdrop = airdropData?.isEligible || false;
  const snapshotExists = airdropData?.snapshotExists || false;
  const hasAllocation = !!(
    airdropData?.tokenAllocation && airdropData.tokenAllocation > 0
  );
  const hasClaimed = airdropData?.hasClaimed || false;

  // Check claim status (for contract-level claim verification)
  const { data: claimStatusData, isLoading: isClaimStatusLoading } =
    useAirdropClaimStatus({ enabled: true });

  // Only fetch detailed quest/challenge data when explicitly requested
  // This is only needed for the quests list view
  const {
    data: questsDataResponse,
    isLoading: isQuestsLoading,
    error: questsError,
    refetch: refetchQuests,
  } = useAirdropCheck({ enabled: shouldFetchQuests });

  // Debug log only when data changes
  useEffect(() => {
    if (questsDataResponse) {
      console.log(
        "This is the quests data response",
        JSON.stringify(questsDataResponse, null, 2)
      );
    }
  }, [questsDataResponse]);

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
    const airdropStartDate = new Date(Date.UTC(2025, 11, 19, 13, 13, 0));
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
  const { data: airdropStats, isLoading: airdropStatsLoading } =
    useAirdropStats();

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

  const handleAdminImpersonate = () => {
    sdk.haptics.selectionChanged();
    if (adminInput && /^\d+$/.test(adminInput)) {
      navigate(`/airdrop/${adminInput}`);
      setAdminInput("");
    }
  };

  const handleBackToMain = () => {
    sdk.haptics.selectionChanged();
    navigate("/");
  };

  const toggleQuest = (questId: number) => {
    sdk.haptics.selectionChanged();
    setExpandedQuest(expandedQuest === questId ? null : questId);
  };

  // Create hardcoded quest elements with backend data integration
  const questsData = useMemo(() => {
    if (!questsDataResponse?.calculation?.challenges) {
      return [];
    }

    const challenges = questsDataResponse.calculation.challenges;

    // Helper function to get challenge data by name
    const getChallengeData = (challengeName: string) => {
      return challenges.find((c: any) => c.name === challengeName);
    };

    // Helper function to create quest data structure
    const createQuestData = (
      id: number,
      title: string,
      challengeName: string
    ) => {
      const challenge = getChallengeData(challengeName);
      if (!challenge) {
        return {
          id,
          title,
          progress: "0/0",
          isCompleted: false,
          tasks: [],
          currentMultiplier: 1,
          maxMultiplier: 1,
          currentValue: 0,
          progressData: { current: 0, required: 0, unit: "" },
          progressPercentage: 0,
          nextTier: null,
          description: "",
          details: "",
        };
      }

      const completedTiers = challenge.tiers.filter(
        (tier: any) => tier.achieved
      ).length;
      const totalTiers = challenge.tiers.length;
      const progressPercentage = Math.min(
        (challenge.progress.current / challenge.progress.required) * 100,
        100
      );
      const nextTier = challenge.tiers.find(
        (tier: any) =>
          !tier.achieved && tier.requirement > challenge.progress.current
      );
      const tasks = challenge.tiers.map((tier: any) => ({
        name: `${tier.requirement} ${challenge.progress.unit}`,
        multiplier: `${tier.multiplier}X`,
        completed: tier.achieved,
        requirement: tier.requirement,
        isCurrentTier: tier.requirement === challenge.progress.required,
      }));

      return {
        id,
        title,
        progress: `${completedTiers}/${totalTiers}`,
        isCompleted: challenge.completed,
        tasks,
        currentMultiplier: challenge.currentMultiplier,
        maxMultiplier: challenge.maxMultiplier,
        currentValue: challenge.currentValue,
        progressData: challenge.progress,
        progressPercentage,
        nextTier,
        description: challenge.description,
        details: "",
      };
    };

    // 8 hardcoded quest elements
    return [
      createQuestData(1, "FOLLOW @BRND + @FLOC", "Follow Accounts"),
      createQuestData(
        2,
        "INTERACT WITH /BRND CHANNEL",
        "Channel Interaction /brnd"
      ),
      createQuestData(3, "HOLDING $BRND", "Holding $BRND"),
      createQuestData(
        4,
        "COLLECT CAST COLLECTIBLES",
        "Collect @brndy or @brnd casts"
      ),
      createQuestData(
        5,
        "VOTING FOR DIFFERENT BRANDS",
        "# of different brands voted"
      ),
      createQuestData(6, "SHARING PODIUMS", "Podiums Shared"),
      createQuestData(7, "NEYNAR SCORE", "Neynar Score"),
      createQuestData(8, "FARCASTER PRO", "Pro User"),
    ];
  }, [questsDataResponse]);

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
              We are sorry, but you are out of the 1111 top users on our
              leaderboard.
            </Typography>
            <Typography
              variant="geist"
              weight="medium"
              size={16}
              lineHeight={20}
              textAlign="center"
              className={styles.notEligibleText}
            >
              (Your rank is {authData?.leaderboardPosition})
            </Typography>
            <Typography
              variant="geist"
              weight="medium"
              size={16}
              lineHeight={20}
              textAlign="center"
              className={styles.notEligibleText}
            >
              You are not eligible for the BRND airdrop.
            </Typography>
            <Typography
              variant="geist"
              weight="medium"
              size={16}
              lineHeight={20}
              textAlign="center"
              className={styles.notEligibleText}
            >
              This updates in: {countdown}
            </Typography>
            <Typography
              variant="geist"
              weight="medium"
              size={16}
              lineHeight={20}
              textAlign="center"
              className={styles.notEligibleText}
            >
              And the airdrop week starts in 7 days.
            </Typography>
            <Typography
              variant="geist"
              weight="medium"
              size={16}
              lineHeight={20}
              textAlign="center"
              className={styles.notEligibleText}
            >
              You can still get in! Start voting and sharing podiums now to add
              points.
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
  if (
    (airdropData && snapshotExists && isEligibleForAirdrop && hasAllocation) ||
    currentView === "claim"
  ) {
    // Prepare airdrop data for ClaimAirdrop component using /me endpoint data
    // Use totalMultiplier from quests data if available, otherwise default to 0
    const totalMultiplier =
      questsDataResponse?.calculation.totalMultiplier || 0;
    const claimAirdropData = airdropData
      ? {
          calculation: {
            finalScore: airdropData.airdropScore || 0,
            leaderboardPosition: airdropData.leaderboardPosition || 0,
            tokenAllocation: airdropData.tokenAllocation || 0,
            totalMultiplier,
          },
        }
      : undefined;

    return (
      <ClaimAirdrop airdropData={claimAirdropData} onBack={handleBackToMain} />
    );
  }

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

        <div className={styles.adminContent}>
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
        </div>
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
                            ? `${Math.round(
                                quest.progressData.current
                              ).toLocaleString()} / ${Math.round(
                                quest.progressData.required
                              ).toLocaleString()} ${quest.progressData.unit}`
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
                          Next: {quest.nextTier.requirement.toLocaleString()}{" "}
                          {quest.progressData.unit} ({quest.nextTier.multiplier}
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
                        {quest.tasks.map((task: any, index: number) => (
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
                        ))}
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
            • Be a Farcaster Pro user (up to 1.4x)
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
            if (isClaimStatusLoading && !airdropData) {
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
                const hasClaimedStatus =
                  hasClaimed ||
                  (claimStatusData?.success && claimStatusData.data.hasClaimed);

                if (hasClaimedStatus) {
                  return (
                    <Button
                      iconLeft={<CheckLabelIcon />}
                      caption="Already Claimed!"
                      disabled={true}
                      onClick={() => {}}
                    />
                  );
                }

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
