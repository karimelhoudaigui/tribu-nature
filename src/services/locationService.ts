export type LocationSuggestion = {
  id: string;
  label: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  source: "geoplateforme" | "open-meteo" | "curated";
};

const europeLocations: LocationSuggestion[] = [
  ["interlaken", "Interlaken, Berne, Suisse", "Interlaken", "Suisse", 46.6863, 7.8632],
  ["geneve", "Genève, Suisse", "Genève", "Suisse", 46.2044, 6.1432],
  ["lausanne", "Lausanne, Vaud, Suisse", "Lausanne", "Suisse", 46.5197, 6.6323],
  ["zermatt", "Zermatt, Valais, Suisse", "Zermatt", "Suisse", 46.0207, 7.7491],
  ["barcelone", "Barcelone, Catalogne, Espagne", "Barcelone", "Espagne", 41.3874, 2.1686],
  ["bilbao", "Bilbao, Pays basque, Espagne", "Bilbao", "Espagne", 43.263, -2.935],
  ["san-sebastian", "Saint-Sébastien, Pays basque, Espagne", "Saint-Sébastien", "Espagne", 43.3183, -1.9812],
  ["madrid", "Madrid, Espagne", "Madrid", "Espagne", 40.4168, -3.7038],
  ["lisbonne", "Lisbonne, Portugal", "Lisbonne", "Portugal", 38.7223, -9.1393],
  ["porto", "Porto, Portugal", "Porto", "Portugal", 41.1579, -8.6291],
  ["rome", "Rome, Latium, Italie", "Rome", "Italie", 41.9028, 12.4964],
  ["milan", "Milan, Lombardie, Italie", "Milan", "Italie", 45.4642, 9.19],
  ["turin", "Turin, Piémont, Italie", "Turin", "Italie", 45.0703, 7.6869],
  ["florence", "Florence, Toscane, Italie", "Florence", "Italie", 43.7696, 11.2558],
  ["munich", "Munich, Bavière, Allemagne", "Munich", "Allemagne", 48.1351, 11.582],
  ["berlin", "Berlin, Allemagne", "Berlin", "Allemagne", 52.52, 13.405],
  ["bruxelles", "Bruxelles, Belgique", "Bruxelles", "Belgique", 50.8503, 4.3517],
  ["amsterdam", "Amsterdam, Pays-Bas", "Amsterdam", "Pays-Bas", 52.3676, 4.9041],
  ["dublin", "Dublin, Irlande", "Dublin", "Irlande", 53.3498, -6.2603],
  ["edimbourg", "Édimbourg, Écosse, Royaume-Uni", "Édimbourg", "Royaume-Uni", 55.9533, -3.1883],
  ["athenes", "Athènes, Grèce", "Athènes", "Grèce", 37.9838, 23.7275],
  ["crete", "Héraklion, Crète, Grèce", "Héraklion", "Grèce", 35.3387, 25.1442]
].map(([id, label, name, country, latitude, longitude]) => ({
  id: String(id),
  label: String(label),
  name: String(name),
  country: String(country),
  latitude: Number(latitude),
  longitude: Number(longitude),
  source: "curated" as const
}));

type CompletionResult = {
  x?: number;
  y?: number;
  names?: string[];
  city?: string;
  fulltext?: string;
  zipcode?: string;
  kind?: string;
  poiType?: string[];
};

type OpenMeteoLocation = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  admin2?: string;
};

const europeanCountryCodes = new Set([
  "AL", "AD", "AT", "BE", "BA", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IS", "IE", "IT", "LV", "LI", "LT", "LU", "MT", "MD", "MC", "ME", "NL", "MK", "NO", "PL", "PT", "RO", "SM", "RS", "SK", "SI", "ES", "SE", "CH", "GB", "VA"
]);

export async function searchLocationSuggestions(query: string, signal?: AbortSignal): Promise<LocationSuggestion[]> {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < 2) return [];

  const curated = europeLocations.filter((location) => normalize(location.label).includes(normalizedQuery)).slice(0, 4);

  try {
    const geoParams = new URLSearchParams({ text: query.trim(), maximumResponses: "6" });
    const globalParams = new URLSearchParams({ name: query.trim(), count: "8", language: "fr", format: "json" });
    const [geoResult, globalResult] = await Promise.allSettled([
      fetch(`https://data.geopf.fr/geocodage/completion?${geoParams}`, { signal }),
      fetch(`https://geocoding-api.open-meteo.com/v1/search?${globalParams}`, { signal })
    ]);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const geoResponse = geoResult.status === "fulfilled" ? geoResult.value : null;
    const globalResponse = globalResult.status === "fulfilled" ? globalResult.value : null;
    const geoBody = geoResponse?.ok ? await geoResponse.json() as { results?: CompletionResult[] } : { results: [] };
    const globalBody = globalResponse?.ok ? await globalResponse.json() as { results?: OpenMeteoLocation[] } : { results: [] };
    const official = (geoBody.results ?? [])
      .filter((result) => (
        Number.isFinite(result.x)
        && Number.isFinite(result.y)
        && (result.poiType?.includes("commune") || result.kind === "municipality")
      ))
      .map((result, index): LocationSuggestion => {
        const name = result.names?.[0] ?? result.city ?? result.fulltext ?? query.trim();
        const label = result.fulltext ?? [name, result.zipcode, "France"].filter(Boolean).join(", ");
        return {
          id: `geoplateforme-${result.x}-${result.y}-${index}`,
          label: label.includes("France") ? label : `${label}, France`,
          name,
          country: "France",
          latitude: Number(result.y),
          longitude: Number(result.x),
          source: "geoplateforme"
        };
      });
    const global = (globalBody.results ?? [])
      .filter((result) => europeanCountryCodes.has(result.country_code ?? ""))
      .map((result): LocationSuggestion => ({
        id: `open-meteo-${result.id}`,
        label: [result.name, result.admin2, result.admin1, result.country].filter(Boolean).filter((item, index, values) => values.indexOf(item) === index).join(", "),
        name: result.name,
        country: result.country ?? "Europe",
        latitude: result.latitude,
        longitude: result.longitude,
        source: "open-meteo"
      }));

    return deduplicateLocations([...curated, ...official, ...global]).slice(0, 7);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return curated;
  }
}

function deduplicateLocations(locations: LocationSuggestion[]) {
  const seen = new Set<string>();
  return locations.filter((location) => {
    const key = normalize(location.label);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
