// API Dependency
import { request } from "./api";

// Configuration
import { AUTH_SERVICE } from "@/config/api";

// Types
import { User } from "../shared/hooks/user";

import { config } from "@/shared/config/wagmi";
import {
  BRND_SEASON_2_CONFIG,
  BRND_SEASON_2_CONFIG_ABI,
} from "@/config/contracts";

import { readContract } from "wagmi/actions";

/**
 * Retrieves the current user's information from the authentication service.
 *
 * This function calls the /me endpoint which handles:
 * - QuickAuth token verification
 * - Automatic user creation for first-time users
 * - Profile updates when user data has changed
 * - Daily voting status calculation
 *
 * The endpoint replaces traditional login flows since Farcaster miniapps
 * have implicit authentication through the platform.
 *
 * @returns A promise that resolves with the user's complete profile data
 */

export const getOnchainUser = async (fid: number): Promise<{ user: any }> => {
  const day = Math.floor(Date.now() / 86400000);

  const [user, _hasVotedToday, currentDay] = await Promise.all([
    readContract(config, {
      address: BRND_SEASON_2_CONFIG.CONTRACT as `0x${string}`,
      abi: BRND_SEASON_2_CONFIG_ABI,
      functionName: "getUserInfo",
      args: [BigInt(fid)],
    }),
    readContract(config, {
      address: BRND_SEASON_2_CONFIG.CONTRACT as `0x${string}`,
      abi: BRND_SEASON_2_CONFIG_ABI,
      functionName: "hasVotedToday",
      args: [BigInt(fid), BigInt(day)],
    }),
    readContract(config, {
      address: BRND_SEASON_2_CONFIG.CONTRACT as `0x${string}`,
      abi: BRND_SEASON_2_CONFIG_ABI,
      functionName: "getCurrentDay",
    }),
  ]);
  if (Number(currentDay) !== day) {
    console.log("SOMEHOW THE DAYS DONT MATCH, CONTACT JP");
  }

  return {
    user: {
      fid: Number((user as any)[0]),
      brndPowerLevel: Number((user as any)[1]),
      lastVoteDay: Number((user as any)[2]),
      totalVotes: Number((user as any)[3]),
    },
  };
};

export const getMe = async (): Promise<
  User & {
    hasVotedToday: boolean;
    isNewUser: boolean;
  }
> => {
  const response = await request<
    User & { hasVotedToday: boolean; isNewUser: boolean }
  >(`${AUTH_SERVICE}/me`, {
    method: "GET",
  });
  const onchainUserData = await getOnchainUser(response.fid);
  response.brndPowerLevel = onchainUserData.user.brndPowerLevel;
  response.hasVotedToday = Boolean(onchainUserData.user.hasVotedToday);
  return response;
};

/**
 * Updates user profile information.
 *
 * This function sends profile updates to the /me endpoint which will
 * update the user's information in the database.
 *
 * @param profileData - Updated profile information (username, photoUrl)
 * @returns Promise resolving to updated user profile
 */
export const updateProfile = async (profileData: {
  username?: string;
  photoUrl?: string;
}): Promise<User & { hasVotedToday: boolean; isNewUser: boolean }> =>
  await request<User & { hasVotedToday: boolean; isNewUser: boolean }>(
    `${AUTH_SERVICE}/me`,
    {
      method: "GET",
      body: profileData,
    }
  );
