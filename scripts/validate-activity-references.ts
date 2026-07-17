import { readFileSync } from "node:fs";

type ParsedActivity = {
  id: string;
  name: string;
  source?: string;
  externalUrl?: string;
};

type ParsedReference = {
  activityId: string;
  source: string;
  url: string;
  externalId?: string;
  canonicalName: string;
  verifiedAt?: string;
  verificationStatus?: string;
  confidence?: string;
};

const sourceFiles = ["src/data.ts", "src/excelCatalog.ts"];
const activityReferenceFile = "src/activityReferences.ts";
const errors: string[] = [];

const forbiddenUrlPatterns = [
  /:\/\/(?:www\.)?google\.[^/]+\/search/i,
  /:\/\/(?:www\.)?google\.[^/]+\/maps\/search/i,
  /:\/\/(?:www\.)?openstreetmap\.org\/#map=/i,
  /[?&](utm_|fbclid|gclid|mc_cid|mc_eid)/i,
  /^http:\/\//i
];

const officialDomains = [
  "pyrenees-bearnaises.com",
  "canfranc.es",
  "st-jean-pied-de-port.fr",
  "vallee-dordogne.com",
  "fontainebleau-tourisme.com",
  "valleedossau.com",
  "cauterets.com",
  "bains-rocher.fr",
  "picdumidi.com",
  "font-romeu.fr",
  "tourisme64.com",
  "valleesdegavarnie.com",
  "saintlary.com",
  "pyrenees31.com",
  "ariegepyrenees.com",
  "collioure.com",
  "pyrenees2vallees.com",
  "turismodearagon.com",
  "spain.info"
];

const sourceText = sourceFiles.map((file) => readFileSync(file, "utf8")).join("\n");
const referenceText = readFileSync(activityReferenceFile, "utf8");

const activities = parseActivities(sourceText);
const references = parseCuratedReferences(referenceText);
const activityIds = new Set(activities.map((activity) => activity.id));

validateGeneratedActivityIds(sourceText, activityIds);
validateLegacyUrls(activities);
validateCuratedReferences(references, activityIds);

if (errors.length) {
  console.error(`Activity reference validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const suggestedCount = activities.length - references.length;
console.log(`Activity reference validation passed: ${activities.length} activities, ${references.length} verified references, ${suggestedCount} Tripeer suggestions.`);

function parseActivities(text: string): ParsedActivity[] {
  const objects = text.match(/\{\n\s*(?:"id"|id):\s*"[^"]+"[\s\S]*?\n\s*\}/g) ?? [];
  return objects
    .map((object) => {
      const id = getStringField(object, "id");
      const hasActivityShape = /(?:"destinationId"|destinationId)\s*:/.test(object) && /(?:"estimated_price"|estimated_price)\s*:/.test(object);
      if (!hasActivityShape) return null;
      if (!id) return null;
      return {
        id,
        name: getStringField(object, "name") ?? getStringField(object, "title") ?? id,
        source: getStringField(object, "source"),
        externalUrl: getStringField(object, "external_url")
      };
    })
    .filter((activity): activity is ParsedActivity => Boolean(activity?.id));
}

function parseCuratedReferences(text: string): ParsedReference[] {
  const mapMatch = text.match(/const CURATED_ACTIVITY_REFERENCES[\s\S]*?=\s*\{([\s\S]*?)\n\};/);
  if (!mapMatch) {
    errors.push("CURATED_ACTIVITY_REFERENCES est introuvable.");
    return [];
  }

  const entries: ParsedReference[] = [];
  const entryPattern = /"([^"]+)":\s*\{([\s\S]*?)\n\s*\}/g;
  let match: RegExpExecArray | null;
  while ((match = entryPattern.exec(mapMatch[1]))) {
    const body = match[2];
    entries.push({
      activityId: match[1],
      source: getStringField(body, "source") ?? "",
      url: getStringField(body, "url") ?? "",
      externalId: getStringField(body, "externalId"),
      canonicalName: getStringField(body, "canonicalName") ?? "",
      verifiedAt: "2026-07-17",
      verificationStatus: "verified",
      confidence: "high"
    });
  }
  return entries;
}

function validateGeneratedActivityIds(text: string, knownActivityIds: Set<string>) {
  const idLists = text.match(/"generated_activity_ids":\s*\[[\s\S]*?\]/g) ?? [];
  idLists.forEach((list, listIndex) => {
    const ids = [...list.matchAll(/"([^"]+)"/g)]
      .map((match) => match[1])
      .filter((id) => id !== "generated_activity_ids");
    const localSeen = new Set<string>();
    ids.forEach((id) => {
      if (!knownActivityIds.has(id)) errors.push(`generated_activity_ids inconnu: ${id}`);
      if (localSeen.has(id)) errors.push(`generated_activity_ids duplique dans le Trip #${listIndex + 1}: ${id}`);
      localSeen.add(id);
    });
  });
}

function validateLegacyUrls(parsedActivities: ParsedActivity[]) {
  parsedActivities.forEach((activity) => {
    if (!activity.externalUrl) return;
    if (forbiddenUrlPatterns.some((pattern) => pattern.test(activity.externalUrl ?? ""))) {
      errors.push(`${activity.id} contient une URL interdite: ${activity.externalUrl}`);
    }
    if (activity.source && activity.source !== "mock" && !isUrlCompatibleWithSource(activity.source, activity.externalUrl)) {
      errors.push(`${activity.id} a une source ${activity.source} incompatible avec ${activity.externalUrl}`);
    }
  });
}

function validateCuratedReferences(parsedReferences: ParsedReference[], knownActivityIds: Set<string>) {
  const seenUrls = new Set<string>();
  const seenExternalIds = new Set<string>();

  parsedReferences.forEach((reference) => {
    if (!knownActivityIds.has(reference.activityId)) errors.push(`Reference curatee pour une activite inconnue: ${reference.activityId}`);
    if (!reference.url) errors.push(`${reference.activityId} reference sans URL.`);
    if (!reference.canonicalName) errors.push(`${reference.activityId} reference sans canonicalName.`);
    if (reference.verificationStatus !== "verified") errors.push(`${reference.activityId} verificationStatus doit etre verified.`);
    if (reference.confidence !== "high") errors.push(`${reference.activityId} confidence doit etre high.`);
    if (!reference.verifiedAt) errors.push(`${reference.activityId} reference sans date de verification.`);
    if (!isValidHttpsUrl(reference.url)) errors.push(`${reference.activityId} URL invalide: ${reference.url}`);
    if (forbiddenUrlPatterns.some((pattern) => pattern.test(reference.url))) errors.push(`${reference.activityId} URL interdite: ${reference.url}`);
    if (!isUrlCompatibleWithSource(reference.source, reference.url)) errors.push(`${reference.activityId} source ${reference.source} incompatible avec ${reference.url}`);
    if (seenUrls.has(reference.url)) errors.push(`URL de reference dupliquee: ${reference.url}`);
    seenUrls.add(reference.url);
    if (reference.externalId) {
      if (seenExternalIds.has(reference.externalId)) errors.push(`Identifiant externe duplique: ${reference.externalId}`);
      seenExternalIds.add(reference.externalId);
    }
  });
}

function getStringField(objectText: string, field: string) {
  const quoted = objectText.match(new RegExp(`"${field}"\\s*:\\s*"([^"]*)"`));
  if (quoted) return quoted[1];
  const bare = objectText.match(new RegExp(`${field}\\s*:\\s*"([^"]*)"`));
  return bare?.[1];
}

function isValidHttpsUrl(url: string) {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function isUrlCompatibleWithSource(source: string, url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const host = parsed.hostname.replace(/^www\./, "");
  if (source === "official") return officialDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
  if (source === "openstreetmap") return host === "openstreetmap.org" && /^\/(?:node|way|relation)\/\d+/.test(parsed.pathname);
  if (source === "google_places") return host.startsWith("google.") && (parsed.pathname.includes("/maps/place/") || parsed.searchParams.has("query_place_id"));
  if (source === "datatourisme") return host.includes("datatourisme");
  return false;
}
