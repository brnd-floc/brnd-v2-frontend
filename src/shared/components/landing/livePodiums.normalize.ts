import type {
  ApiBrandRaw,
  ApiPodiumEnvelope,
  ApiPodiumRaw,
  LivePodium,
  LivePodiumBrand,
} from "./livePodiums.types";

export function sanitizeBrand(
  rawBrand: ApiBrandRaw | null | undefined
): LivePodiumBrand | null {
  if (!rawBrand || typeof rawBrand !== "object") {
    return null;
  }

  const parsedId = Number(rawBrand.id);
  const safeName = (rawBrand.name || "").trim() || "Brand";
  const safeImageUrl = (rawBrand.imageUrl || rawBrand.logo || "").trim() || null;

  return {
    id: Number.isFinite(parsedId) ? parsedId : -1,
    name: safeName,
    imageUrl: safeImageUrl,
  };
}

export function sanitizePodium(rawPodium: ApiPodiumRaw, index: number): LivePodium {
  const safeId = String(rawPodium.id ?? `podium-${index}`);
  const safeDate = rawPodium.date || rawPodium.createdAt || new Date().toISOString();
  const safeUsername = (
    rawPodium.username ||
    rawPodium.handle ||
    rawPodium.user?.username ||
    rawPodium.user?.handle ||
    ""
  ).trim() || "user";
  const safeUserPhoto = (
    rawPodium.userPhoto ||
    rawPodium.userAvatar ||
    rawPodium.photoUrl ||
    rawPodium.avatar ||
    rawPodium.user?.photoUrl ||
    rawPodium.user?.avatar ||
    ""
  ).trim() || null;

  return {
    id: safeId,
    date: safeDate,
    username: safeUsername,
    userPhoto: safeUserPhoto,
    brand1: sanitizeBrand(rawPodium.brand1),
    brand2: sanitizeBrand(rawPodium.brand2),
    brand3: sanitizeBrand(rawPodium.brand3),
  };
}

export function normalizePodiumsResponse(input: unknown): LivePodium[] {
  if (Array.isArray(input)) {
    return input
      .filter((item): item is ApiPodiumRaw => Boolean(item && typeof item === "object"))
      .map((item, index) => sanitizePodium(item, index));
  }

  if (!input || typeof input !== "object") {
    return [];
  }

  const payload = input as ApiPodiumEnvelope;
  let podiumsCandidate: unknown = null;

  if (Array.isArray(payload.data)) {
    podiumsCandidate = payload.data;
  } else if (payload.data && typeof payload.data === "object") {
    const nestedPayload = payload.data as { data?: unknown };
    if (Array.isArray(nestedPayload.data)) {
      podiumsCandidate = nestedPayload.data;
    }
  }

  if (!Array.isArray(podiumsCandidate)) {
    return [];
  }

  return podiumsCandidate
    .filter((item): item is ApiPodiumRaw => Boolean(item && typeof item === "object"))
    .map((item, index) => sanitizePodium(item, index));
}
