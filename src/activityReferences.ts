import type { ActivityOrigin, ActivityReference, ActivitySource, MockLocalActivity } from "./types";

const VERIFIED_AT = "2026-07-17";

const SOURCE_LABELS: Record<ActivitySource, string> = {
  official: "Site officiel",
  datatourisme: "DATAtourisme",
  openstreetmap: "OpenStreetMap",
  google_places: "Google Maps"
};

const CURATED_ACTIVITY_REFERENCES: Record<string, Omit<ActivityReference, "verifiedAt" | "verificationStatus" | "confidence">> = {
  "dordogne-canoe": {
    source: "official",
    url: "https://www.vallee-dordogne.com/vallee-dordogne/activites/canoe-kayak",
    externalId: "vallee-dordogne:canoe-kayak",
    canonicalName: "La Dordogne en canoe",
    municipality: "Vallee de la Dordogne"
  },
  "fontainebleau-rochers": {
    source: "official",
    url: "https://www.fontainebleau-tourisme.com/fr/fiche/6367824/rocher-cassepot-trail/",
    externalId: "fontainebleau-tourisme:6367824",
    canonicalName: "Rocher Cassepot trail",
    municipality: "Fontainebleau"
  },
  "act_vallee_aspe_lac_estaens": {
    source: "official",
    url: "https://www.pyrenees-bearnaises.com/offres/n20-le-lac-destaens-urdos-fr-2201603/",
    externalId: "pyrenees-bearnaises:2201603:catalog",
    canonicalName: "N 20 Le lac d'Estaens",
    municipality: "Urdos"
  },
  "act_vallee_aspe_rafting_gave": {
    source: "official",
    url: "https://www.pyrenees-bearnaises.com/offres/descente-en-rafting-oloron-sainte-marie-fr-6500801/",
    externalId: "pyrenees-bearnaises:6500801:catalog",
    canonicalName: "Descente en rafting",
    municipality: "Oloron-Sainte-Marie"
  },
  "act_vallee_aspe_canfranc_excursion": {
    source: "official",
    url: "https://www.canfranc.es/descubre-estacion-aire.php",
    externalId: "canfranc:descubre-estacion",
    canonicalName: "Descubre la Estacion de Canfranc",
    municipality: "Canfranc"
  },
  "act_pays_basque_interieur_marche_local_basque": {
    source: "official",
    url: "https://www.st-jean-pied-de-port.fr/vie-municipale/les-services-municipaux/marche/",
    externalId: "st-jean-pied-de-port:marche:catalog",
    canonicalName: "Marche de Saint-Jean-Pied-de-Port",
    municipality: "Saint-Jean-Pied-de-Port"
  },
  "act_vallee_ossau_lacs_ayous": {
    source: "official",
    url: "https://www.valleedossau.com/le-tour-des-lacs-ayous",
    externalId: "valleedossau:lacs-ayous",
    canonicalName: "Le tour des lacs d'Ayous",
    municipality: "Laruns"
  },
  "act_vallee_ossau_train_artouste": {
    source: "official",
    url: "https://www.valleedossau.com/train-artouste/",
    externalId: "valleedossau:train-artouste",
    canonicalName: "Le Train d'Artouste",
    municipality: "Laruns"
  },
  "act_cauterets_lac_gaube": {
    source: "official",
    url: "https://www.cauterets.com/nos-tops/le-lac-de-gaube-sa-vallee/",
    externalId: "cauterets:lac-gaube",
    canonicalName: "Le Lac de Gaube et sa vallee",
    municipality: "Cauterets"
  },
  "act_cauterets_pont_espagne": {
    source: "official",
    url: "https://www.cauterets.com/nos-tops/le-pont-despagne/",
    externalId: "cauterets:pont-espagne",
    canonicalName: "Le Pont d'Espagne",
    municipality: "Cauterets"
  },
  "act_cauterets_bains_rocher": {
    source: "official",
    url: "https://www.bains-rocher.fr/page/preparer-votre-visite",
    externalId: "bains-rocher:preparer-visite",
    canonicalName: "Les Bains du Rocher",
    municipality: "Cauterets"
  },
  "act_cauterets_cirque_lys": {
    source: "official",
    url: "https://www.cauterets.com/les-activites/prendre-la-telecabine-du-lys-et-profiter-de-la-montagne/",
    externalId: "cauterets:telecabine-lys",
    canonicalName: "Telecabine du Lys",
    municipality: "Cauterets"
  },
  "act_pic_du_midi_telepherique_sommet": {
    source: "official",
    url: "https://picdumidi.com/fr/billetterie",
    externalId: "picdumidi:billetterie",
    canonicalName: "Pic du Midi - billetterie",
    municipality: "La Mongie"
  },
  "act_pic_du_midi_observation_etoiles": {
    source: "official",
    url: "https://picdumidi.com/fr/billetterie/soirees-galactiques",
    externalId: "picdumidi:soirees-galactiques",
    canonicalName: "Soirees galactiques du Pic du Midi",
    municipality: "La Mongie"
  },
  "act_font_romeu_train_jaune": {
    source: "official",
    url: "https://font-romeu.fr/loisirs/le-train-jaune/",
    externalId: "font-romeu:train-jaune",
    canonicalName: "Le Train Jaune",
    municipality: "Font-Romeu-Odeillo-Via"
  }
};

const FORBIDDEN_URL_PATTERNS = [
  /:\/\/(?:www\.)?google\.[^/]+\/search/i,
  /:\/\/(?:www\.)?google\.[^/]+\/maps\/search/i,
  /:\/\/(?:www\.)?openstreetmap\.org\/#map=/i,
  /[?&](utm_|fbclid|gclid|mc_cid|mc_eid)/i
];

export function sourceDisplayName(source?: ActivitySource) {
  return source ? SOURCE_LABELS[source] : "Source";
}

export function applyActivityReferenceDefaults(activities: MockLocalActivity[]): MockLocalActivity[] {
  const usedUrls = new Set<string>();
  const usedExternalIds = new Set<string>();
  return activities.map((activity) => withActivityReference(activity, usedUrls, usedExternalIds));
}

export function withActivityReference(activity: MockLocalActivity, usedUrls = new Set<string>(), usedExternalIds = new Set<string>()): MockLocalActivity {
  if (activity.origin === "user") return withoutLegacyReference(activity, "user");
  if (activity.origin === "tripeer_suggestion") return withoutLegacyReference(activity, "tripeer_suggestion");
  if (activity.reference) return activity;

  const reference = buildCuratedReference(activity) ?? buildReferenceFromLegacyFields(activity);
  if (!reference) return withoutLegacyReference(activity, "tripeer_suggestion");
  if (usedUrls.has(reference.url) || (reference.externalId && usedExternalIds.has(reference.externalId))) {
    return withoutLegacyReference(activity, "tripeer_suggestion");
  }
  usedUrls.add(reference.url);
  if (reference.externalId) usedExternalIds.add(reference.externalId);

  return {
    ...activity,
    origin: "verified_public",
    reference,
    source: toLegacySource(reference.source),
    external_url: reference.url
  };
}

function buildCuratedReference(activity: MockLocalActivity): ActivityReference | null {
  const curated = CURATED_ACTIVITY_REFERENCES[activity.id];
  if (!curated) return null;
  return {
    ...curated,
    latitude: activity.lat,
    longitude: activity.lng,
    verifiedAt: VERIFIED_AT,
    verificationStatus: "verified",
    confidence: "high"
  };
}

function buildReferenceFromLegacyFields(activity: MockLocalActivity): ActivityReference | null {
  if (activity.source === "mock") return null;
  const url = activity.external_url?.trim();
  if (!url || !isAllowedReferenceUrl(url)) return null;

  const source = inferReferenceSource(activity.source, url);
  if (!source) return null;

  return {
    source,
    url,
    externalId: buildExternalId(source, url),
    canonicalName: activity.name,
    latitude: activity.lat,
    longitude: activity.lng,
    verifiedAt: VERIFIED_AT,
    verificationStatus: "verified",
    confidence: "high"
  };
}

function withoutLegacyReference(activity: MockLocalActivity, origin: ActivityOrigin): MockLocalActivity {
  const { reference: _reference, external_url: _externalUrl, ...rest } = activity;
  return {
    ...rest,
    origin
  };
}

function inferReferenceSource(source: MockLocalActivity["source"], url: string): ActivitySource | null {
  if (source === "datatourisme") return "datatourisme";
  if (source === "openstreetmap" && isOpenStreetMapObjectUrl(url)) return "openstreetmap";
  if (source === "google_places" && isGoogleMapsPlaceUrl(url)) return "google_places";
  if (isOfficialTourismUrl(url)) return "official";
  return null;
}

function toLegacySource(source: ActivitySource): MockLocalActivity["source"] {
  if (source === "openstreetmap") return "openstreetmap";
  if (source === "google_places") return "google_places";
  if (source === "datatourisme") return "datatourisme";
  return "mock";
}

function isAllowedReferenceUrl(url: string) {
  if (!url.startsWith("https://")) return false;
  if (FORBIDDEN_URL_PATTERNS.some((pattern) => pattern.test(url))) return false;
  return true;
}

function isOfficialTourismUrl(url: string) {
  const host = safeUrl(url)?.hostname.replace(/^www\./, "");
  if (!host) return false;
  return [
    "pyrenees-bearnaises.com",
    "tourisme64.com",
    "valleedossau.com",
    "cauterets.com",
    "valleesdegavarnie.com",
    "saintlary.com",
    "pyrenees31.com",
    "ariegepyrenees.com",
    "font-romeu.fr",
    "collioure.com",
    "pyrenees2vallees.com",
    "turismodearagon.com",
    "spain.info",
    "sarlat-tourisme.com",
    "en-pays-basque.fr",
    "fontainebleau-tourisme.com",
    "canfranc.es",
    "st-jean-pied-de-port.fr",
    "vallee-dordogne.com",
    "bains-rocher.fr",
    "picdumidi.com"
  ].some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function isOpenStreetMapObjectUrl(url: string) {
  return /^https:\/\/www\.openstreetmap\.org\/(?:node|way|relation)\/\d+/i.test(url);
}

function isGoogleMapsPlaceUrl(url: string) {
  return /^https:\/\/www\.google\.[^/]+\/maps\/place\//i.test(url) || /[?&]query_place_id=/.test(url);
}

function buildExternalId(source: ActivitySource, url: string) {
  if (source === "openstreetmap") {
    const match = url.match(/openstreetmap\.org\/(node|way|relation)\/(\d+)/i);
    if (match) return `${match[1]}:${match[2]}`;
  }
  if (source === "google_places") {
    const parsed = safeUrl(url);
    const placeId = parsed?.searchParams.get("query_place_id");
    if (placeId) return placeId;
  }
  const parsed = safeUrl(url);
  return parsed ? `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/$/, "")}` : url;
}

function safeUrl(url: string) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}
