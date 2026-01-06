// API Dependency
import { request } from "./api";

// Configuration
import { ADMIN_SERVICE, AIRDROP_SERVICE } from "@/config/api";

/* =======================================
   = = = = = = = = = = = = = = = = = = = =
   ======================================= */

/**
 * Interface for brand form data used in admin operations
 */
export interface BrandFormData {
  name: string;
  url: string;
  warpcastUrl?: string;
  description: string;
  categoryId: number;
  followerCount: number;
  imageUrl: string;
  profile: string;
  channel: string;
  queryType: number;
  channelOrProfile?: string;
  handle?: string;
  fid?: number;
  walletAddress?: string;
  contractAddress?: string;
  ticker?: string;
  isEditing?: boolean;
}

/* =======================================
   = = = = = = = = = = = = = = = = = = = =
   ======================================= */

/**
 * Get cycle rankings (weekly or monthly) for screenshots
 */
export const getCycleRankings = async (
  period: "week" | "month",
  limit: number = 10
): Promise<any> =>
  await request(`${ADMIN_SERVICE}/cycles/${period}/rankings`, {
    method: "GET",
    params: { limit: limit.toString() },
  });

/**
 * Get deployment information and first vote details
 */
export const getDeploymentInfo = async (): Promise<any> =>
  await request(`${ADMIN_SERVICE}/deployment-info`, {
    method: "GET",
  });

/**
 * Prepares brand metadata and uploads to IPFS.
 * This function now does validation AND IPFS upload in one call.
 * Should be called before proceeding to confirmation step.
 *
 * @param {BrandFormData} brandData - The data for creating the new brand
 * @returns {Promise<{ success: boolean; valid: boolean; metadataHash?: string; handle?: string; fid?: number; walletAddress?: string; conflicts?: string[]; message?: string }>}
 *   A promise that resolves with validation result and IPFS hash if valid
 */
export const prepareBrandMetadata = async (
  brandData: BrandFormData
): Promise<{
  success: boolean;
  valid: boolean;
  metadataHash?: string;
  handle?: string;
  fid?: number;
  walletAddress?: string;
  conflicts?: string[];
  message?: string;
}> =>
  await request(`${ADMIN_SERVICE}/brands/prepare-metadata`, {
    method: "POST",
    body: brandData,
  });

/**
 * Creates a new brand in the system (legacy - for backward compatibility).
 * Note: New implementations should use prepareBrandMetadata + on-chain createBrand instead.
 *
 * @param {BrandFormData} brandData - The data for creating the new brand
 * @returns {Promise<any>} A promise that resolves with the created brand data
 */
export const createBrand = async (brandData: BrandFormData): Promise<any> =>
  await request(`${ADMIN_SERVICE}/brands`, {
    method: "POST",
    body: brandData,
  });

/* =======================================
   = = = = = = = = = = = = = = = = = = = =
   ======================================= */

/**
 * Updates an existing brand's information.
 *
 * @param {number} brandId - The ID of the brand to update
 * @param {Partial<BrandFormData>} brandData - The brand data to update
 * @returns {Promise<any>} A promise that resolves with the updated brand data
 */
export const updateBrand = async (
  brandId: number,
  brandData: Partial<BrandFormData>
): Promise<any> =>
  await request(`${ADMIN_SERVICE}/brands/${brandId}`, {
    method: "PUT",
    body: brandData,
  });

/* =======================================
   = = = = = = = = = = = = = = = = = = = =
   ======================================= */

/**
 * Deletes a brand from the system.
 *
 * @param {number} brandId - The ID of the brand to delete
 * @returns {Promise<void>} A promise that resolves when the brand is deleted
 */
export const deleteBrand = async (brandId: number): Promise<void> =>
  await request(`${ADMIN_SERVICE}/brands/${brandId}`, {
    method: "DELETE",
  });

export const getCategories = async (): Promise<any> =>
  await request(`${ADMIN_SERVICE}/categories`, {
    method: "GET",
  });

export const getBrands = async (): Promise<any> =>
  await request(`${ADMIN_SERVICE}/brands`, {
    method: "GET",
  });

export const fixWeeklyScores = async (): Promise<any> =>
  await request(`${ADMIN_SERVICE}/fix-weekly-scores`, {
    method: "GET",
  });

/**
 * Takes an airdrop snapshot and creates a merkle root.
 * This function should be called to generate the snapshot for airdrop distribution.
 *
 * @returns {Promise<any>} A promise that resolves with the snapshot and merkle root data
 */
export const takeAirdropSnapshotAndCreateMerkleRoot = async (): Promise<any> =>
  await request(`${ADMIN_SERVICE}/airdrop-snapshot`, {
    method: "GET",
  });

/**
 * Recalculates all users' airdrop leaderboard scores.
 * This function should be called to refresh the leaderboard calculations.
 *
 * @returns {Promise<any>} A promise that resolves with the recalculation result
 */
export const recalculateAllUsers = async (): Promise<any> =>
  await request(`${AIRDROP_SERVICE}/recalculate-all-users`, {
    method: "GET",
  });
