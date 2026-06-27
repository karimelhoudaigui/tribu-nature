import { mockLocalActivities, trips } from "../data";
import type { MockLocalActivity, Trip } from "../types";

export type CatalogSource = "local" | "supabase";

export type TripCatalog = {
  trips: Trip[];
  activities: MockLocalActivity[];
  source: CatalogSource;
};

type SupabaseTripRow = {
  id: string;
  title: string;
  destination: string;
  image_url: string;
  dates: string;
  duration: string;
  budget_min: number;
  budget_max: number;
  physical_level: string;
  ambience_tags: string[] | null;
  compatibility_score: number;
  interested_count: number;
  status: string;
  description: string;
  activities: string[] | null;
  generation_reasons?: string[] | null;
  matched_member_ids?: string[] | null;
  generated_activity_ids?: string[] | null;
  generated_itinerary?: Trip["generated_itinerary"] | null;
  community?: boolean | null;
  created_by?: string | null;
  brief?: string | null;
  card_type?: Trip["card_type"] | null;
  created_by_type?: Trip["created_by_type"] | null;
  planning_status?: Trip["planning_status"] | null;
  visibility?: Trip["visibility"] | null;
  moderation_status?: Trip["moderation_status"] | null;
  creator_name?: string | null;
  creator_id?: string | null;
  departure_city?: string | null;
  max_participants?: number | null;
  current_participants?: number | null;
  conversation_id?: string | null;
  source_catalog_trip_id?: string | null;
  created_from_catalog?: boolean | null;
  region?: string | null;
  country?: string | null;
  accommodation_tags?: string[] | null;
  food_tags?: string[] | null;
  group_tags?: string[] | null;
  safety_tags?: string[] | null;
  value_tags?: string[] | null;
  activity_tags?: string[] | null;
};

type SupabaseTripInsertRow = {
  id: string;
  title: string;
  destination: string;
  image_url: string;
  dates: string;
  duration: string;
  budget_min: number;
  budget_max: number;
  physical_level: string;
  ambience_tags: string[];
  compatibility_score: number;
  interested_count: number;
  status: string;
  description: string;
  activities: string[];
  generation_reasons: string[];
  matched_member_ids: string[];
  generated_activity_ids: string[];
  generated_itinerary: Trip["generated_itinerary"] | null;
  community: boolean;
  created_by: string | null;
  brief: string | null;
  card_type: NonNullable<Trip["card_type"]>;
  created_by_type: NonNullable<Trip["created_by_type"]>;
  planning_status: NonNullable<Trip["planning_status"]>;
  visibility: NonNullable<Trip["visibility"]>;
  moderation_status: NonNullable<Trip["moderation_status"]>;
  creator_name: string | null;
  creator_id: string | null;
  departure_city: string | null;
  max_participants: number;
  current_participants: number;
  conversation_id: string | null;
  source_catalog_trip_id: string | null;
  created_from_catalog: boolean;
  region: string | null;
  country: string | null;
  accommodation_tags: string[];
  food_tags: string[];
  group_tags: string[];
  safety_tags: string[];
  value_tags: string[];
  activity_tags: string[];
};

type SupabaseActivityRow = {
  id: string;
  destination_id: string;
  lat?: number | null;
  lng?: number | null;
  name: string;
  category: string;
  duration: string;
  estimated_price: number | string;
  physical_level: string;
  ambience: string[] | null;
  weather_compatible: string[] | null;
  risk: string;
  booking_required: boolean;
  group_friendly: boolean;
  description: string;
  image: string;
  source?: MockLocalActivity["source"] | null;
  external_url?: string | null;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const defaultTripImage = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80";

export function hasSupabaseCatalogConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export async function loadTripCatalog(): Promise<TripCatalog> {
  if (!hasSupabaseCatalogConfig()) return getLocalCatalog();

  try {
    const [remoteTrips, remoteActivities] = await Promise.all([
      fetchSupabaseRows<SupabaseTripRow>("trips", "select=*&order=compatibility_score.desc"),
      fetchSupabaseRows<SupabaseActivityRow>("local_activities", "select=*")
    ]);

    if (remoteTrips.length === 0) return getLocalCatalog();

    return {
      trips: remoteTrips.map(mapTripRow),
      activities: remoteActivities.map(mapActivityRow),
      source: "supabase"
    };
  } catch (error) {
    console.warn("Impossible de charger le catalogue Supabase, fallback local.", error);
    return getLocalCatalog();
  }
}

export async function createTrip(trip: Trip, accessToken?: string): Promise<Trip> {
  if (!hasSupabaseCatalogConfig()) {
    throw new Error("Supabase n'est pas configuré. La Trip ne peut pas être enregistrée en base.");
  }

  const normalizedTrip = normalizeTripForInsert(trip);
  const response = await fetch(`${getSupabaseApiUrl()}/rest/v1/trips?select=*`, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(accessToken),
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(toTripInsertRow(normalizedTrip))
  });

  if (!response.ok) {
    throw new Error(`Publication Supabase impossible: ${await getSupabaseErrorMessage(response)}`);
  }

  const rows = (await response.json()) as SupabaseTripRow[];
  return rows[0] ? mapTripRow(rows[0]) : normalizedTrip;
}

function getLocalCatalog(): TripCatalog {
  return {
    trips,
    activities: mockLocalActivities,
    source: "local"
  };
}

async function fetchSupabaseRows<T>(table: string, query: string): Promise<T[]> {
  const response = await fetch(`${getSupabaseApiUrl()}/rest/v1/${table}?${query}`, {
    headers: getSupabaseHeaders()
  });

  if (!response.ok) {
    throw new Error(`Supabase ${table} failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T[]>;
}

function getSupabaseApiUrl() {
  return supabaseUrl ?? "";
}

function getSupabaseHeaders(accessToken?: string) {
  const apiKey = supabaseAnonKey ?? "";
  return {
    apikey: apiKey,
    Authorization: `Bearer ${accessToken ?? apiKey}`
  };
}

function mapTripRow(row: SupabaseTripRow): Trip {
  const cardType = resolveCardType(row.card_type, row.community);
  const createdByType = resolveCreatedByType(row.created_by_type, cardType);
  return {
    id: row.id,
    title: row.title,
    destination: row.destination,
    image_url: row.image_url,
    dates: row.dates,
    duration: row.duration,
    budget_min: Number(row.budget_min),
    budget_max: Number(row.budget_max),
    physical_level: row.physical_level,
    compatibility_score: Number(row.compatibility_score),
    interested_count: Number(row.interested_count),
    status: row.status,
    description: row.description,
    ambience_tags: row.ambience_tags ?? [],
    activities: row.activities ?? [],
    generation_reasons: row.generation_reasons ?? [],
    matched_member_ids: row.matched_member_ids ?? [],
    generated_activity_ids: row.generated_activity_ids ?? [],
    generated_itinerary: row.generated_itinerary ?? undefined,
    community: Boolean(row.community),
    created_by: row.created_by ?? undefined,
    brief: row.brief ?? undefined,
    card_type: cardType,
    created_by_type: createdByType,
    planning_status: resolvePlanningStatus(row.planning_status, cardType),
    visibility: row.visibility ?? "public",
    moderation_status: row.moderation_status ?? "approved",
    creator_name: row.creator_name ?? row.created_by ?? undefined,
    creator_id: row.creator_id ?? undefined,
    departure_city: row.departure_city ?? undefined,
    max_participants: Number(row.max_participants ?? 6),
    current_participants: Number(row.current_participants ?? 0),
    conversation_id: row.conversation_id ?? undefined,
    source_catalog_trip_id: row.source_catalog_trip_id ?? undefined,
    created_from_catalog: Boolean(row.created_from_catalog),
    region: row.region ?? undefined,
    country: row.country ?? undefined,
    accommodation_tags: row.accommodation_tags ?? [],
    food_tags: row.food_tags ?? [],
    group_tags: row.group_tags ?? [],
    safety_tags: row.safety_tags ?? [],
    value_tags: row.value_tags ?? [],
    activity_tags: row.activity_tags ?? []
  };
}

function normalizeTripForInsert(trip: Trip): Trip {
  const budgetMin = Number(trip.budget_min);
  const budgetMax = Number(trip.budget_max);
  const normalizedTrip: Trip = {
    ...trip,
    id: ensureTripId(trip),
    title: trip.title.trim(),
    destination: trip.destination.trim(),
    image_url: trip.image_url?.trim() || defaultTripImage,
    dates: trip.dates?.trim() || trip.duration?.trim() || "Dates à définir",
    duration: trip.duration?.trim() || trip.dates?.trim() || "Durée à définir",
    budget_min: Number.isFinite(budgetMin) ? Math.max(0, Math.round(budgetMin)) : Number.NaN,
    budget_max: Number.isFinite(budgetMax) ? Math.max(0, Math.round(budgetMax)) : Number.NaN,
    physical_level: trip.physical_level?.trim() || "Facile",
    ambience_tags: Array.isArray(trip.ambience_tags) ? trip.ambience_tags : [],
    compatibility_score: Number.isFinite(Number(trip.compatibility_score)) ? Number(trip.compatibility_score) : 80,
    interested_count: Number.isFinite(Number(trip.interested_count)) ? Number(trip.interested_count) : 0,
    status: trip.status?.trim() || "published",
    description: trip.description?.trim() || trip.brief?.trim() || "Trip proposée par la communauté.",
    activities: Array.isArray(trip.activities) ? trip.activities : [],
    generation_reasons: Array.isArray(trip.generation_reasons) ? trip.generation_reasons : [],
    matched_member_ids: Array.isArray(trip.matched_member_ids) ? trip.matched_member_ids : [],
    generated_activity_ids: Array.isArray(trip.generated_activity_ids) ? trip.generated_activity_ids : [],
    community: trip.community ?? true,
    created_by: trip.created_by?.trim() || undefined,
    brief: trip.brief?.trim() || trip.description?.trim() || undefined,
    card_type: resolveCardType(trip.card_type, trip.community ?? true),
    created_by_type: resolveCreatedByType(trip.created_by_type, resolveCardType(trip.card_type, trip.community ?? true)),
    planning_status: trip.planning_status ?? resolvePlanningStatus(undefined, resolveCardType(trip.card_type, trip.community ?? true)),
    visibility: trip.visibility ?? "public",
    moderation_status: trip.moderation_status ?? "approved",
    creator_name: trip.creator_name?.trim() || trip.created_by?.trim() || undefined,
    creator_id: trip.creator_id?.trim() || undefined,
    departure_city: trip.departure_city?.trim() || undefined,
    max_participants: Number.isFinite(Number(trip.max_participants)) ? Number(trip.max_participants) : 6,
    current_participants: Number.isFinite(Number(trip.current_participants)) ? Number(trip.current_participants) : 1,
    conversation_id: trip.conversation_id?.trim() || undefined,
    source_catalog_trip_id: trip.source_catalog_trip_id?.trim() || undefined,
    created_from_catalog: Boolean(trip.created_from_catalog),
    region: trip.region?.trim() || undefined,
    country: trip.country?.trim() || undefined,
    accommodation_tags: Array.isArray(trip.accommodation_tags) ? trip.accommodation_tags : [],
    food_tags: Array.isArray(trip.food_tags) ? trip.food_tags : [],
    group_tags: Array.isArray(trip.group_tags) ? trip.group_tags : [],
    safety_tags: Array.isArray(trip.safety_tags) ? trip.safety_tags : [],
    value_tags: Array.isArray(trip.value_tags) ? trip.value_tags : [],
    activity_tags: Array.isArray(trip.activity_tags) ? trip.activity_tags : []
  };

  validateTripForInsert(normalizedTrip);
  return normalizedTrip;
}

function validateTripForInsert(trip: Trip) {
  const errors: string[] = [];

  if (!trip.title) errors.push("le titre est obligatoire");
  if (!trip.destination) errors.push("la destination est obligatoire");
  if (!Number.isFinite(trip.budget_min)) errors.push("le budget minimum est invalide");
  if (!Number.isFinite(trip.budget_max)) errors.push("le budget maximum est invalide");
  if (Number.isFinite(trip.budget_min) && Number.isFinite(trip.budget_max) && trip.budget_max < trip.budget_min) {
    errors.push("le budget maximum doit être supérieur ou égal au budget minimum");
  }
  if (!trip.physical_level) errors.push("le niveau physique est obligatoire");
  if (!trip.duration) errors.push("la durée est obligatoire");
  if (!trip.description && !trip.brief) errors.push("la description est obligatoire");

  if (errors.length > 0) {
    throw new Error(`Trip invalide: ${errors.join(", ")}.`);
  }
}

function ensureTripId(trip: Trip) {
  if (trip.id?.trim()) return trip.id.trim();
  return `trip_${slugify(trip.title || "nouvelle-trip")}_${Date.now()}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function toTripInsertRow(trip: Trip): SupabaseTripInsertRow {
  const cardType = resolveCardType(trip.card_type, trip.community);
  const maxParticipants = Number.isFinite(Number(trip.max_participants)) ? Math.max(1, Number(trip.max_participants)) : 6;
  const currentParticipants = Number.isFinite(Number(trip.current_participants)) ? Math.max(0, Number(trip.current_participants)) : 0;
  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    image_url: trip.image_url,
    dates: trip.dates,
    duration: trip.duration,
    budget_min: trip.budget_min,
    budget_max: trip.budget_max,
    physical_level: trip.physical_level,
    ambience_tags: trip.ambience_tags ?? [],
    compatibility_score: trip.compatibility_score,
    interested_count: trip.interested_count,
    status: trip.status,
    description: trip.description,
    activities: trip.activities ?? [],
    generation_reasons: trip.generation_reasons ?? [],
    matched_member_ids: trip.matched_member_ids ?? [],
    generated_activity_ids: trip.generated_activity_ids ?? [],
    generated_itinerary: trip.generated_itinerary ?? null,
    community: trip.community ?? true,
    created_by: trip.created_by ?? null,
    brief: trip.brief ?? null,
    card_type: cardType,
    created_by_type: resolveCreatedByType(trip.created_by_type, cardType),
    planning_status: trip.planning_status ?? resolvePlanningStatus(undefined, cardType),
    visibility: trip.visibility ?? "public",
    moderation_status: trip.moderation_status ?? "approved",
    creator_name: trip.creator_name ?? trip.created_by ?? null,
    creator_id: trip.creator_id ?? null,
    departure_city: trip.departure_city ?? null,
    max_participants: maxParticipants,
    current_participants: Math.min(currentParticipants, maxParticipants),
    conversation_id: trip.conversation_id ?? null,
    source_catalog_trip_id: trip.source_catalog_trip_id ?? null,
    created_from_catalog: Boolean(trip.created_from_catalog),
    region: trip.region ?? null,
    country: trip.country ?? null,
    accommodation_tags: trip.accommodation_tags ?? [],
    food_tags: trip.food_tags ?? [],
    group_tags: trip.group_tags ?? [],
    safety_tags: trip.safety_tags ?? [],
    value_tags: trip.value_tags ?? [],
    activity_tags: trip.activity_tags ?? []
  };
}

function resolveCardType(cardType: Trip["card_type"] | null | undefined, community: boolean | null | undefined): NonNullable<Trip["card_type"]> {
  if (cardType === "catalog" || cardType === "user_project") return cardType;
  return community ? "user_project" : "catalog";
}

function resolveCreatedByType(createdByType: Trip["created_by_type"] | null | undefined, cardType: NonNullable<Trip["card_type"]>): NonNullable<Trip["created_by_type"]> {
  if (createdByType === "platform" || createdByType === "user") return createdByType;
  return cardType === "user_project" ? "user" : "platform";
}

function resolvePlanningStatus(planningStatus: Trip["planning_status"] | null | undefined, cardType: NonNullable<Trip["card_type"]>): NonNullable<Trip["planning_status"]> {
  if (planningStatus === "idea" || planningStatus === "forming_group" || planningStatus === "planned" || planningStatus === "confirmed" || planningStatus === "cancelled") {
    return planningStatus;
  }
  return cardType === "user_project" ? "planned" : "idea";
}

async function getSupabaseErrorMessage(response: Response) {
  const text = await response.text();
  if (!text) return `${response.status} ${response.statusText}`;

  try {
    const body = JSON.parse(text) as { message?: string; details?: string; hint?: string };
    return [body.message, body.details, body.hint].filter(Boolean).join(" ");
  } catch {
    return text;
  }
}

function mapActivityRow(row: SupabaseActivityRow): MockLocalActivity {
  return {
    id: row.id,
    destinationId: row.destination_id,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    name: row.name,
    category: row.category,
    duration: row.duration,
    estimated_price: Number(row.estimated_price),
    physical_level: row.physical_level,
    ambience: row.ambience ?? [],
    weather_compatible: row.weather_compatible ?? [],
    risk: row.risk,
    booking_required: row.booking_required,
    group_friendly: row.group_friendly,
    description: row.description,
    image: row.image,
    source: row.source ?? undefined,
    external_url: row.external_url ?? undefined
  };
}
