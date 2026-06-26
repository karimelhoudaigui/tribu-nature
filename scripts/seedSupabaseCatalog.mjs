import { readFile } from "node:fs/promises";

const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const SEED_FILES = (process.env.SEED_FILES ?? "tripCatalog.seed.json,pacaTripCatalog.seed.json")
  .split(",")
  .map((file) => file.trim())
  .filter(Boolean)
  .map((file) => new URL(`../data/${file}`, import.meta.url));

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Example: SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx npm run seed:supabase");
  process.exit(1);
}

const seeds = await Promise.all(SEED_FILES.map((file) => readSeedFile(file)));
const seed = {
  trips: seeds.flatMap((item) => item.trips),
  activities: seeds.flatMap((item) => item.activities)
};

await upsertRows("trips", seed.trips.map(toTripRow));
await upsertRows("local_activities", seed.activities.map(toActivityRow));

console.log(`Seed complete: ${seed.trips.length} trips and ${seed.activities.length} activities imported from ${SEED_FILES.length} catalog files.`);

async function readSeedFile(file) {
  const seed = JSON.parse(await readFile(file, "utf8"));
  return {
    trips: seed.trips ?? [],
    activities: seed.activities ?? []
  };
}

async function upsertRows(table, rows, chunkSize = 100) {
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(chunk)
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Failed to upsert ${table}: ${response.status} ${response.statusText}\n${details}`);
    }
  }
}

function toTripRow(trip) {
  const cardType = trip.card_type ?? (trip.community ? "user_project" : "catalog");
  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    image_url: trip.image_url,
    dates: cardType === "catalog" ? "Dates à décider ensemble" : trip.dates,
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
    community: trip.community ?? false,
    created_by: trip.created_by ?? null,
    brief: trip.brief ?? null,
    card_type: cardType,
    created_by_type: trip.created_by_type ?? (cardType === "user_project" ? "user" : "platform"),
    planning_status: trip.planning_status ?? (cardType === "user_project" ? "planned" : "idea"),
    visibility: trip.visibility ?? "public",
    moderation_status: trip.moderation_status ?? "approved",
    creator_name: trip.creator_name ?? trip.created_by ?? null,
    creator_id: trip.creator_id ?? null,
    departure_city: trip.departure_city ?? null,
    max_participants: trip.max_participants ?? 6,
    current_participants: trip.current_participants ?? 0,
    conversation_id: trip.conversation_id ?? null
  };
}

function toActivityRow(activity) {
  return {
    id: activity.id,
    destination_id: activity.destinationId,
    lat: activity.lat ?? null,
    lng: activity.lng ?? null,
    name: activity.name,
    category: activity.category,
    duration: activity.duration,
    estimated_price: activity.estimated_price,
    physical_level: activity.physical_level,
    ambience: activity.ambience ?? [],
    weather_compatible: activity.weather_compatible ?? [],
    risk: activity.risk,
    booking_required: activity.booking_required,
    group_friendly: activity.group_friendly,
    description: activity.description,
    image: activity.image,
    source: activity.source ?? "mock",
    external_url: activity.external_url ?? null
  };
}
