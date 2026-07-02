import type { TravelPreferences } from "../types";

export type TravelPreferencesUpdate = Partial<Omit<TravelPreferences, "user_id" | "updated_at">>;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function getTravelPreferences(userId: string, accessToken: string): Promise<TravelPreferences | null> {
  const rows = await requestRest<TravelPreferences[]>(
    `travel_preferences?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`,
    { accessToken }
  );
  return rows[0] ? normalizeTravelPreferences(rows[0]) : null;
}

export async function upsertTravelPreferences(
  userId: string,
  updates: TravelPreferencesUpdate,
  accessToken: string
): Promise<TravelPreferences> {
  const existing = await getTravelPreferences(userId, accessToken);
  const rows = await requestRest<TravelPreferences[]>(existing
    ? `travel_preferences?user_id=eq.${encodeURIComponent(userId)}&select=*`
    : "travel_preferences?select=*", {
    method: existing ? "PATCH" : "POST",
    accessToken,
    prefer: "return=representation",
    body: {
      ...(existing ? {} : { user_id: userId }),
      ...updates,
      updated_at: new Date().toISOString()
    }
  });

  if (!rows[0]) throw new Error("Les préférences ont été enregistrées sans être renvoyées.");
  return normalizeTravelPreferences(rows[0]);
}

function normalizeTravelPreferences(row: TravelPreferences): TravelPreferences {
  return {
    ...row,
    preferred_destinations: row.preferred_destinations ?? [],
    preferred_activities: row.preferred_activities ?? [],
    preferred_accommodation: row.preferred_accommodation ?? [],
    food_preferences: row.food_preferences ?? [],
    group_preferences: row.group_preferences ?? [],
    personal_values: row.personal_values ?? [],
    availability_periods: row.availability_periods ?? [],
    max_distance_km: row.max_distance_km ?? null,
    preferred_group_size_min: row.preferred_group_size_min ?? null,
    preferred_group_size_max: row.preferred_group_size_max ?? null,
    departure_city: row.departure_city ?? null,
    departure_lat: row.departure_lat ?? null,
    departure_lng: row.departure_lng ?? null,
    availability_start: row.availability_start ?? null,
    availability_end: row.availability_end ?? null,
    availability_flexible: row.availability_flexible ?? true,
    budget_min: row.budget_min ?? null,
    budget_max: row.budget_max ?? null,
    physical_level: row.physical_level ?? null,
    nature_types: row.nature_types ?? [],
    preferred_ambiences: row.preferred_ambiences ?? [],
    preferred_trip_durations: row.preferred_trip_durations ?? [],
    onboarding_step: row.onboarding_step ?? 0,
    onboarding_status: row.onboarding_status ?? "draft",
    onboarding_started_at: row.onboarding_started_at ?? null,
    onboarding_completed_at: row.onboarding_completed_at ?? null,
    onboarding_skipped_at: row.onboarding_skipped_at ?? null
  };
}

async function requestRest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH";
    accessToken: string;
    prefer?: string;
    body?: unknown;
  }
): Promise<T> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase n'est pas configuré pour les préférences de voyage.");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: options.method ?? "GET",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${options.accessToken}`,
      ...(options.prefer ? { Prefer: options.prefer } : {}),
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {})
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (!response.ok) throw new Error(await getErrorMessage(response));
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
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
