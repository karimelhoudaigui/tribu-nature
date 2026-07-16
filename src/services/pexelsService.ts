export type PexelsActivityPhoto = {
  id: number;
  alt: string;
  photographer: string;
  photographerUrl: string;
  pexelsUrl: string;
  src: string;
};

type PexelsSearchResponse = {
  photos?: PexelsActivityPhoto[];
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const memoryCache = new Map<string, PexelsActivityPhoto[]>();
const cacheDurationMs = 24 * 60 * 60 * 1000;

export function hasPexelsSearchConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getCachedPexelsActivityPhotos(query: string, perPage = 4): PexelsActivityPhoto[] {
  const normalizedQuery = normalizePexelsQuery(query);
  if (!normalizedQuery || !hasPexelsSearchConfig()) return [];
  const resultLimit = getPexelsResultLimit(perPage);
  return readCachedPhotos(normalizedQuery, resultLimit);
}

export async function searchPexelsActivityPhotos(query: string, signal?: AbortSignal, perPage = 4): Promise<PexelsActivityPhoto[]> {
  const normalizedQuery = normalizePexelsQuery(query);
  if (!normalizedQuery || !hasPexelsSearchConfig()) return [];
  const resultLimit = getPexelsResultLimit(perPage);

  const cachedResult = readCachedPhotos(normalizedQuery, resultLimit);
  if (cachedResult.length >= resultLimit) return cachedResult;

  const response = await fetch(`${supabaseUrl}/functions/v1/pexels-search?query=${encodeURIComponent(normalizedQuery)}&per_page=${resultLimit}`, {
    headers: {
      apikey: supabaseAnonKey ?? "",
      Authorization: `Bearer ${supabaseAnonKey}`
    },
    signal
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Recherche Pexels indisponible (${response.status})${details ? ` : ${details}` : ""}`);
  }

  const payload = await response.json() as PexelsSearchResponse;
  const photos = Array.isArray(payload.photos) ? payload.photos.slice(0, resultLimit) : [];
  const cacheKey = getPexelsCacheKey(normalizedQuery);
  memoryCache.set(cacheKey, photos);
  storePhotos(cacheKey, photos);
  return photos;
}

function normalizePexelsQuery(query: string) {
  return query.trim().replace(/\s+/g, " ");
}

function getPexelsResultLimit(perPage: number) {
  return Math.max(1, Math.min(perPage, 4));
}

function readCachedPhotos(normalizedQuery: string, resultLimit: number) {
  const cacheKey = getPexelsCacheKey(normalizedQuery);
  const memoryResult = memoryCache.get(cacheKey);
  if (memoryResult && memoryResult.length >= resultLimit) return memoryResult.slice(0, resultLimit);

  const storedResult = readStoredPhotos(cacheKey);
  if (storedResult && storedResult.length >= resultLimit) {
    memoryCache.set(cacheKey, storedResult);
    return storedResult.slice(0, resultLimit);
  }

  return [];
}

function getPexelsCacheKey(normalizedQuery: string) {
  return normalizedQuery.toLocaleLowerCase("fr-FR");
}

function readStoredPhotos(cacheKey: string) {
  try {
    if (typeof window === "undefined") return null;
    const rawValue = window.localStorage.getItem(getStorageKey(cacheKey));
    if (!rawValue) return null;
    const parsed = JSON.parse(rawValue) as { expiresAt: number; photos: PexelsActivityPhoto[] };
    if (parsed.expiresAt <= Date.now() || !Array.isArray(parsed.photos)) {
      window.localStorage.removeItem(getStorageKey(cacheKey));
      return null;
    }
    return parsed.photos;
  } catch {
    return null;
  }
}

function storePhotos(cacheKey: string, photos: PexelsActivityPhoto[]) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(getStorageKey(cacheKey), JSON.stringify({ expiresAt: Date.now() + cacheDurationMs, photos }));
  } catch {
    // Le cache navigateur est facultatif, notamment en navigation privée.
  }
}

function getStorageKey(cacheKey: string) {
  return `tripeer:pexels:${cacheKey}`;
}
