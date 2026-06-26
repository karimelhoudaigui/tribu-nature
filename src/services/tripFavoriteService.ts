export type TripFavorite = {
  id: string;
  trip_id: string;
  user_id: string;
  created_at: string;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function getMyFavoriteTrips(userId: string, accessToken: string): Promise<TripFavorite[]> {
  return requestRest<TripFavorite[]>(
    `trip_favorites?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc`,
    { accessToken }
  );
}

export async function addTripToFavorites(tripId: string, userId: string, accessToken: string): Promise<TripFavorite> {
  const rows = await requestRest<TripFavorite[]>("trip_favorites?on_conflict=trip_id,user_id&select=*", {
    method: "POST",
    accessToken,
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      trip_id: tripId,
      user_id: userId
    }
  });

  return rows[0];
}

export async function removeTripFromFavorites(tripId: string, userId: string, accessToken: string): Promise<void> {
  await requestRest<void>(`trip_favorites?trip_id=eq.${encodeURIComponent(tripId)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: "DELETE",
    accessToken
  });
}

export async function isTripFavorited(tripId: string, userId: string, accessToken: string): Promise<boolean> {
  const rows = await requestRest<TripFavorite[]>(
    `trip_favorites?trip_id=eq.${encodeURIComponent(tripId)}&user_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`,
    { accessToken }
  );

  return rows.length > 0;
}

async function requestRest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    accessToken: string;
    prefer?: string;
    body?: unknown;
  }
): Promise<T> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase n'est pas configuré pour les favoris.");
  }

  const headers: Record<string, string> = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${options.accessToken}`,
    ...(options.prefer ? { Prefer: options.prefer } : {})
  };

  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function getErrorMessage(response: Response) {
  const text = await response.text();
  if (!text) return `${response.status} ${response.statusText}`;

  try {
    const body = JSON.parse(text) as { message?: string; details?: string; hint?: string };
    return [body.message, body.details, body.hint].filter(Boolean).join(" ");
  } catch {
    return text;
  }
}
