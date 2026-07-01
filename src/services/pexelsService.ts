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

export async function searchPexelsActivityPhotos(query: string, signal?: AbortSignal, perPage = 4): Promise<PexelsActivityPhoto[]> {
  const normalizedQuery = query.trim().replace(/\s+/g, " ");
  if (!normalizedQuery || !hasPexelsSearchConfig()) return [];
  const resultLimit = Math.max(1, Math.min(perPage, 4));

  const cacheKey = normalizedQuery.toLocaleLowerCase("fr-FR");
  const memoryResult = memoryCache.get(cacheKey);
  if (memoryResult && memoryResult.length >= resultLimit) return memoryResult.slice(0, resultLimit);

  const storedResult = readStoredPhotos(cacheKey);
  if (storedResult && storedResult.length >= resultLimit) {
    memoryCache.set(cacheKey, storedResult);
    return storedResult.slice(0, resultLimit);
  }

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
  memoryCache.set(cacheKey, photos);
  storePhotos(cacheKey, photos);
  return photos;
}

function readStoredPhotos(cacheKey: string) {
  try {
    const rawValue = localStorage.getItem(getStorageKey(cacheKey));
    if (!rawValue) return null;
    const parsed = JSON.parse(rawValue) as { expiresAt: number; photos: PexelsActivityPhoto[] };
    if (parsed.expiresAt <= Date.now() || !Array.isArray(parsed.photos)) {
      localStorage.removeItem(getStorageKey(cacheKey));
      return null;
    }
    return parsed.photos;
  } catch {
    return null;
  }
}

function storePhotos(cacheKey: string, photos: PexelsActivityPhoto[]) {
  try {
    localStorage.setItem(getStorageKey(cacheKey), JSON.stringify({ expiresAt: Date.now() + cacheDurationMs, photos }));
  } catch {
    // Le cache navigateur est facultatif, notamment en navigation privée.
  }
}

function getStorageKey(cacheKey: string) {
  return `tribu-nature:pexels:${cacheKey}`;
}
