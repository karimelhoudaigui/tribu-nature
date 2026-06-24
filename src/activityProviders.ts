import type { MockDestination, MockLocalActivity, OnboardingProfile } from "./types";

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80";

type OverpassElement = {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  primaryTypeDisplayName?: { text?: string };
  types?: string[];
  rating?: number;
  websiteUri?: string;
};

type DatatourismeItem = {
  id?: string;
  name?: string | { fr?: string; en?: string };
  label?: string;
  description?: string | { fr?: string; en?: string };
  category?: string;
  url?: string;
};

export async function fetchApiLocalActivities(destination: MockDestination, profile: OnboardingProfile): Promise<MockLocalActivity[]> {
  const results = await Promise.allSettled([
    fetchOverpassActivities(destination),
    fetchGooglePlacesActivities(destination, profile),
    fetchDatatourismeActivities(destination)
  ]);

  return dedupeActivities(
    results
      .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
      .slice(0, 30)
  );
}

async function fetchOverpassActivities(destination: MockDestination): Promise<MockLocalActivity[]> {
  const query = `
    [out:json][timeout:18];
    (
      node(around:25000,${destination.lat},${destination.lng})["tourism"~"attraction|viewpoint|museum|guest_house|information"];
      way(around:25000,${destination.lat},${destination.lng})["tourism"~"attraction|viewpoint|museum|guest_house|information"];
      node(around:25000,${destination.lat},${destination.lng})["amenity"~"restaurant|cafe|parking"];
      way(around:25000,${destination.lat},${destination.lng})["amenity"~"restaurant|cafe|parking"];
      node(around:25000,${destination.lat},${destination.lng})["leisure"~"nature_reserve|park|picnic_table"];
      way(around:25000,${destination.lat},${destination.lng})["leisure"~"nature_reserve|park|picnic_table"];
    );
    out center tags 25;
  `;

  const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
  if (!response.ok) return [];

  const data = await response.json() as { elements?: OverpassElement[] };
  return (data.elements ?? []).map((element) => overpassToActivity(element, destination)).filter(Boolean) as MockLocalActivity[];
}

async function fetchGooglePlacesActivities(destination: MockDestination, profile: OnboardingProfile): Promise<MockLocalActivity[]> {
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string | undefined;
  if (!apiKey) return [];

  const query = `${profile.preferred_nature} activities restaurants local experiences near ${destination.name}`;
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.primaryTypeDisplayName,places.types,places.rating,places.websiteUri"
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "fr",
      locationBias: {
        circle: {
          center: { latitude: destination.lat, longitude: destination.lng },
          radius: 25000
        }
      }
    })
  });

  if (!response.ok) return [];
  const data = await response.json() as { places?: GooglePlace[] };
  return (data.places ?? []).map((place) => googlePlaceToActivity(place, destination));
}

async function fetchDatatourismeActivities(destination: MockDestination): Promise<MockLocalActivity[]> {
  const apiUrl = import.meta.env.VITE_DATATOURISME_API_URL as string | undefined;
  const token = import.meta.env.VITE_DATATOURISME_API_TOKEN as string | undefined;
  if (!apiUrl || !token) return [];

  const url = new URL(apiUrl);
  url.searchParams.set("q", destination.name);
  url.searchParams.set("lat", String(destination.lat));
  url.searchParams.set("lng", String(destination.lng));
  url.searchParams.set("radius", "25000");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) return [];
  const data = await response.json() as { items?: DatatourismeItem[]; results?: DatatourismeItem[] };
  return (data.items ?? data.results ?? []).map((item) => datatourismeToActivity(item, destination));
}

function overpassToActivity(element: OverpassElement, destination: MockDestination): MockLocalActivity | null {
  const tags = element.tags ?? {};
  const name = tags.name ?? tags["name:fr"];
  if (!name) return null;

  const category = inferCategory(tags.tourism ?? tags.amenity ?? tags.leisure ?? "Lieu local");
  const estimatedPrice = category === "Repas local" ? 28 : category === "Hébergement" ? 70 : 0;

  return {
    id: `osm-${element.type}-${element.id}`,
    destinationId: destination.id,
    lat: element.lat ?? element.center?.lat,
    lng: element.lon ?? element.center?.lon,
    name,
    category,
    duration: inferDuration(category),
    estimated_price: estimatedPrice,
    physical_level: category === "Point de vue" ? "Facile" : "Très facile",
    ambience: inferAmbience(category),
    weather_compatible: category === "Repas local" || category === "Hébergement" ? ["soleil", "nuageux", "pluie"] : ["soleil", "nuageux"],
    risk: "faible",
    booking_required: category === "Repas local" || category === "Hébergement",
    group_friendly: true,
    description: tags.description ?? `Lieu repéré autour de ${destination.name}, intégré comme option possible pour le groupe.`,
    image: DEFAULT_IMAGE,
    source: "openstreetmap",
    external_url: tags.website
  };
}

function googlePlaceToActivity(place: GooglePlace, destination: MockDestination): MockLocalActivity {
  const category = place.primaryTypeDisplayName?.text ?? inferCategory(place.types?.[0] ?? "Lieu local");
  return {
    id: `google-${place.id ?? slug(place.displayName?.text ?? category)}`,
    destinationId: destination.id,
    lat: destination.lat,
    lng: destination.lng,
    name: place.displayName?.text ?? category,
    category,
    duration: inferDuration(category),
    estimated_price: category.toLowerCase().includes("restaurant") ? 32 : 20,
    physical_level: "Très facile",
    ambience: ["Découverte locale", "Calme & déconnexion"],
    weather_compatible: ["soleil", "nuageux", "pluie"],
    risk: "faible",
    booking_required: true,
    group_friendly: true,
    description: place.formattedAddress ?? `Lieu trouvé près de ${destination.name}.`,
    image: DEFAULT_IMAGE,
    source: "google_places",
    external_url: place.websiteUri
  };
}

function datatourismeToActivity(item: DatatourismeItem, destination: MockDestination): MockLocalActivity {
  const name = textValue(item.name) ?? item.label ?? "Expérience locale";
  return {
    id: `datatourisme-${item.id ?? slug(name)}`,
    destinationId: destination.id,
    lat: destination.lat,
    lng: destination.lng,
    name,
    category: item.category ?? "Expérience locale",
    duration: "2h",
    estimated_price: 20,
    physical_level: "Facile",
    ambience: ["Découverte locale"],
    weather_compatible: ["soleil", "nuageux", "pluie"],
    risk: "faible",
    booking_required: true,
    group_friendly: true,
    description: textValue(item.description) ?? `Expérience touristique locale autour de ${destination.name}.`,
    image: DEFAULT_IMAGE,
    source: "datatourisme",
    external_url: item.url
  };
}

function dedupeActivities(activities: MockLocalActivity[]) {
  const seen = new Set<string>();
  return activities.filter((activity) => {
    const key = slug(`${activity.destinationId}-${activity.name}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function inferCategory(raw: string) {
  const value = raw.toLowerCase();
  if (value.includes("restaurant") || value.includes("cafe")) return "Repas local";
  if (value.includes("viewpoint")) return "Point de vue";
  if (value.includes("guest") || value.includes("hotel")) return "Hébergement";
  if (value.includes("museum") || value.includes("attraction")) return "Culture locale";
  if (value.includes("park") || value.includes("nature")) return "Nature";
  if (value.includes("parking")) return "Accès";
  return "Lieu local";
}

function inferDuration(category: string) {
  if (category === "Repas local") return "2h";
  if (category === "Hébergement") return "1 nuit";
  if (category === "Point de vue") return "1h30";
  return "2h";
}

function inferAmbience(category: string) {
  if (category === "Repas local" || category === "Culture locale") return ["Découverte locale"];
  if (category === "Point de vue" || category === "Nature") return ["Calme & déconnexion"];
  return ["Découverte locale", "Calme & déconnexion"];
}

function textValue(value: DatatourismeItem["name"] | DatatourismeItem["description"]) {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  return value.fr ?? value.en;
}

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
