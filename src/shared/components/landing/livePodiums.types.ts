export interface LivePodiumBrand {
  id: number;
  name: string;
  imageUrl: string | null;
}

export interface LivePodium {
  id: string;
  date: string;
  username: string;
  userPhoto: string | null;
  brand1: LivePodiumBrand | null;
  brand2: LivePodiumBrand | null;
  brand3: LivePodiumBrand | null;
}

export interface ApiBrandRaw {
  id?: number | string | null;
  name?: string | null;
  imageUrl?: string | null;
  logo?: string | null;
}

export interface ApiPodiumRaw {
  id?: string | number | null;
  date?: string | null;
  createdAt?: string | null;
  username?: string | null;
  handle?: string | null;
  userPhoto?: string | null;
  userAvatar?: string | null;
  avatar?: string | null;
  photoUrl?: string | null;
  user?: {
    username?: string | null;
    handle?: string | null;
    photoUrl?: string | null;
    avatar?: string | null;
  } | null;
  brand1?: ApiBrandRaw | null;
  brand2?: ApiBrandRaw | null;
  brand3?: ApiBrandRaw | null;
}

export interface ApiPodiumEnvelope {
  data?: ApiPodiumRaw[] | { data?: ApiPodiumRaw[] | null } | null;
}
