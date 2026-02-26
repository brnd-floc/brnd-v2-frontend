export const getEncodedAuthData = (authResponse: {
  authData?: string;
  signature?: string;
}) => authResponse.authData || authResponse.signature || "0x";

export const isVoteAuthResponse = (
  value: unknown
): value is { authData?: string } => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("authData" in value)) {
    return true;
  }

  const authData = (value as { authData?: unknown }).authData;
  return typeof authData === "string" || typeof authData === "undefined";
};

export const asHexAddress = (
  value: string | undefined
): `0x${string}` | undefined => {
  if (!value) {
    return undefined;
  }

  return /^0x[a-fA-F0-9]{40}$/.test(value) ? (value as `0x${string}`) : undefined;
};

export const ensureVoteAuthData = (voteAuth: { authData?: string }) => {
  if (!voteAuth.authData) {
    throw new Error("Failed to get vote authorization signature from backend");
  }

  return voteAuth.authData;
};
