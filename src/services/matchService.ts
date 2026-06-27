import type { Trip, UserProfile } from "../types";

export type TripMatchConfidence = "faible" | "moyenne" | "élevée";

export type TripMatchBreakdownItem = {
  earned: number;
  maximum: number;
  label: string;
};

export type TripMatchResult = {
  score: number;
  confidence: TripMatchConfidence;
  reasons: string[];
  missingCriteria: string[];
  breakdown: Record<string, TripMatchBreakdownItem>;
};

const criteria = {
  budget: { maximum: 20, label: "Budget" },
  physicalLevel: { maximum: 15, label: "Niveau physique" },
  ambiences: { maximum: 15, label: "Ambiances" },
  activities: { maximum: 15, label: "Activités préférées" },
  availability: { maximum: 10, label: "Disponibilités" },
  destination: { maximum: 10, label: "Destination ou ville de départ" },
  accommodation: { maximum: 5, label: "Hébergement" },
  group: { maximum: 5, label: "Préférences de groupe" },
  safety: { maximum: 5, label: "Sécurité, alimentation et valeurs" }
} as const;

type CriterionKey = keyof typeof criteria;

export function calculateTripMatch(profile: UserProfile | null, trip: Trip): TripMatchResult {
  const breakdown = createEmptyBreakdown();
  const fallbackScore = clamp(Math.round(Number(trip.compatibility_score) || 0), 0, 100);

  if (!profile) {
    return {
      score: fallbackScore,
      confidence: "faible",
      reasons: ["Score catalogue estimé"],
      missingCriteria: ["Connexion au profil"],
      breakdown
    };
  }

  const missingCriteria: string[] = [];
  const reasons: string[] = [];
  let evaluatedMaximum = 0;
  let earnedTotal = 0;

  const evaluate = (key: CriterionKey, earned: number, reason?: string) => {
    const maximum = criteria[key].maximum;
    const safeEarned = clamp(Math.round(earned), 0, maximum);
    breakdown[key] = { ...criteria[key], earned: safeEarned };
    evaluatedMaximum += maximum;
    earnedTotal += safeEarned;
    if (reason) reasons.push(reason);
  };
  const markMissing = (key: CriterionKey) => missingCriteria.push(criteria[key].label);

  scoreBudget(profile, trip, evaluate, markMissing);
  scorePhysicalLevel(profile, trip, evaluate, markMissing);
  scoreAmbiences(profile, trip, evaluate, markMissing);
  scoreActivities(profile, trip, evaluate, markMissing);
  scoreAvailability(profile, trip, evaluate, markMissing);
  scoreDestination(profile, trip, evaluate, markMissing);
  scoreAccommodation(profile, trip, evaluate, markMissing);
  scoreGroup(profile, trip, evaluate, markMissing);
  scoreSafetyAndValues(profile, trip, evaluate, markMissing);

  const coverage = evaluatedMaximum / 100;
  const score = evaluatedMaximum > 0 ? clamp(Math.round((earnedTotal / evaluatedMaximum) * 100), 0, 100) : fallbackScore;
  const confidence: TripMatchConfidence = coverage < 0.4 ? "faible" : coverage <= 0.7 ? "moyenne" : "élevée";

  return {
    score,
    confidence,
    reasons: reasons.length ? reasons.slice(0, 5) : ["Peu de critères communs ont été trouvés"],
    missingCriteria,
    breakdown
  };
}

function scoreBudget(
  profile: UserProfile,
  trip: Trip,
  evaluate: EvaluateCriterion,
  markMissing: MarkMissingCriterion
) {
  const budget = parseBudgetRange(profile.budget_range);
  if (!budget || trip.budget_max <= 0) return markMissing("budget");

  const maximum = budget.maximum;
  if (maximum >= trip.budget_max) return evaluate("budget", 20, "Budget compatible avec ton profil");
  if (maximum >= trip.budget_min) return evaluate("budget", 14, "Budget proche de ta préférence");
  if (maximum >= trip.budget_min * 0.8) return evaluate("budget", 7, "Budget légèrement supérieur à ta préférence");
  return evaluate("budget", 0, "Budget potentiellement élevé pour ton profil");
}

function scorePhysicalLevel(profile: UserProfile, trip: Trip, evaluate: EvaluateCriterion, markMissing: MarkMissingCriterion) {
  const profileLevel = physicalLevelRank(profile.physical_level);
  const tripLevel = physicalLevelRank(trip.physical_level);
  if (profileLevel === null || tripLevel === null) return markMissing("physicalLevel");

  const difference = tripLevel - profileLevel;
  if (difference <= 0) return evaluate("physicalLevel", difference < -1 ? 13 : 15, "Niveau physique adapté");
  if (difference === 1) return evaluate("physicalLevel", 7, "Trip un peu plus sportif que ton niveau habituel");
  return evaluate("physicalLevel", 0, "Niveau physique à vérifier avant de rejoindre");
}

function scoreAmbiences(profile: UserProfile, trip: Trip, evaluate: EvaluateCriterion, markMissing: MarkMissingCriterion) {
  const profileAmbiences = cleanValues([...profile.preferred_ambiences, profile.adventure_style]);
  const tripAmbiences = cleanValues(trip.ambience_tags);
  if (!profileAmbiences.length || !tripAmbiences.length) return markMissing("ambiences");

  const matches = countMatches(profileAmbiences, tripAmbiences);
  if (matches >= 2) return evaluate("ambiences", 15, "Plusieurs ambiances correspondent à ton profil");
  if (matches === 1) return evaluate("ambiences", 10, "Une ambiance recherchée est présente");
  return evaluate("ambiences", 2, "Peu d'ambiances communes avec ton profil");
}

function scoreActivities(profile: UserProfile, trip: Trip, evaluate: EvaluateCriterion, markMissing: MarkMissingCriterion) {
  const preferredActivities = cleanValues(profile.travel_preferences?.preferred_activities ?? []);
  const tripActivities = cleanValues([...(trip.activity_tags ?? []), ...trip.activities]);
  if (!preferredActivities.length || !tripActivities.length) return markMissing("activities");

  const matches = countMatches(preferredActivities, tripActivities);
  const ratio = matches / preferredActivities.length;
  if (ratio >= 0.66 || matches >= 3) return evaluate("activities", 15, "Plusieurs activités proches de tes envies");
  if (matches >= 1) return evaluate("activities", 9, `${preferredActivities.find((item) => tripActivities.some((activity) => valuesMatch(item, activity))) ?? "Une activité appréciée"} est présente dans ce Trip`);
  return evaluate("activities", 1, "Les activités correspondent peu à tes préférences actuelles");
}

function scoreAvailability(profile: UserProfile, trip: Trip, evaluate: EvaluateCriterion, markMissing: MarkMissingCriterion) {
  const availability = cleanValues(profile.travel_preferences?.availability_periods ?? []);
  if (!availability.length) return markMissing("availability");

  if (trip.card_type === "catalog") return evaluate("availability", 10, "Dates flexibles à définir ensemble");
  const tripTiming = cleanValues([trip.dates, trip.duration]);
  const flexible = availability.some((item) => normalize(item).includes("flexible"));
  const compatible = flexible || availability.some((item) => tripTiming.some((timing) => valuesMatch(item, timing) || datesOverlap(item, timing)));
  return compatible
    ? evaluate("availability", 10, "Durée ou dates compatibles avec tes disponibilités")
    : evaluate("availability", 2, "Dates à vérifier avec tes disponibilités");
}

function scoreDestination(profile: UserProfile, trip: Trip, evaluate: EvaluateCriterion, markMissing: MarkMissingCriterion) {
  const preferredDestinations = cleanValues(profile.travel_preferences?.preferred_destinations ?? []);
  const city = isMeaningful(profile.city) ? profile.city : "";
  const sameDeparture = Boolean(city && trip.departure_city && valuesMatch(city, trip.departure_city));
  const destinationMatch = preferredDestinations.some((destination) => valuesMatch(destination, trip.destination) || valuesMatch(destination, trip.region ?? ""));

  if (!preferredDestinations.length && (!city || !trip.departure_city)) return markMissing("destination");
  if (sameDeparture) return evaluate("destination", 10, "Départ prévu depuis ta ville");
  if (destinationMatch) return evaluate("destination", 8, "Destination cohérente avec tes préférences");
  if (city && trip.departure_city) return evaluate("destination", 3, "Ville de départ différente de la tienne");
  return evaluate("destination", 2, "Destination différente de tes préférences enregistrées");
}

function scoreAccommodation(profile: UserProfile, trip: Trip, evaluate: EvaluateCriterion, markMissing: MarkMissingCriterion) {
  const preferences = cleanValues(profile.travel_preferences?.preferred_accommodation ?? []);
  const tripTags = findKnownTags(tripCorpus(trip), ["gite", "refuge", "hotel", "tente", "bivouac", "chambre", "camping", "hebergement"]);
  if (!preferences.length || !tripTags.length) return markMissing("accommodation");

  return countMatches(preferences, tripTags) > 0
    ? evaluate("accommodation", 5, "Hébergement compatible avec tes préférences")
    : evaluate("accommodation", 1, "Confort d'hébergement différent de ta préférence");
}

function scoreGroup(profile: UserProfile, trip: Trip, evaluate: EvaluateCriterion, markMissing: MarkMissingCriterion) {
  const preferences = profile.travel_preferences;
  const groupTags = cleanValues(trip.group_tags ?? []);
  const hasProfilePreference = Boolean(
    preferences?.group_preferences.length
    || preferences?.preferred_group_size_min
    || preferences?.preferred_group_size_max
  );
  if (!hasProfilePreference) return markMissing("group");

  const tagsMatch = countMatches(preferences?.group_preferences ?? [], groupTags) > 0;
  const sizeMatch = Boolean(
    trip.max_participants
    && (!preferences?.preferred_group_size_min || trip.max_participants >= preferences.preferred_group_size_min)
    && (!preferences?.preferred_group_size_max || trip.max_participants <= preferences.preferred_group_size_max)
  );
  return tagsMatch || sizeMatch
    ? evaluate("group", 5, "Taille ou ambiance de groupe compatible")
    : evaluate("group", 1, "Taille de groupe à vérifier");
}

function scoreSafetyAndValues(profile: UserProfile, trip: Trip, evaluate: EvaluateCriterion, markMissing: MarkMissingCriterion) {
  const userPreferences = cleanValues([
    ...profile.safety_preferences,
    ...(profile.travel_preferences?.food_preferences ?? []),
    ...(profile.travel_preferences?.personal_values ?? [])
  ]).filter((item) => normalize(item) !== "profil connecte");
  const tripPreferences = cleanValues([
    ...(trip.safety_tags ?? []),
    ...(trip.food_tags ?? []),
    ...(trip.value_tags ?? [])
  ]);
  if (!userPreferences.length || !tripPreferences.length) return markMissing("safety");

  return countMatches(userPreferences, tripPreferences) > 0
    ? evaluate("safety", 5, "Préférences de confiance ou de confort respectées")
    : evaluate("safety", 1, "Préférences de sécurité et de confort à vérifier");
}

type EvaluateCriterion = (key: CriterionKey, earned: number, reason?: string) => void;
type MarkMissingCriterion = (key: CriterionKey) => void;

function createEmptyBreakdown(): Record<string, TripMatchBreakdownItem> {
  return Object.fromEntries(
    Object.entries(criteria).map(([key, value]) => [key, { ...value, earned: 0 }])
  );
}

function parseBudgetRange(value: string) {
  if (!isMeaningful(value)) return null;
  if (normalize(value).includes("flexible")) return { minimum: 0, maximum: Number.POSITIVE_INFINITY };
  const numbers = value.match(/\d+/g)?.map(Number) ?? [];
  if (!numbers.length) return null;
  if (normalize(value).includes("moins")) return { minimum: 0, maximum: numbers[0] };
  if (normalize(value).includes("plus")) return { minimum: numbers[0], maximum: Number.POSITIVE_INFINITY };
  return { minimum: numbers[0], maximum: numbers[1] ?? numbers[0] };
}

function physicalLevelRank(value: string) {
  const normalized = normalize(value);
  if (!isMeaningful(value) || normalized.includes("ne sais pas")) return null;
  if (normalized.includes("tres sportif")) return 4;
  if (normalized.includes("sportif")) return 3;
  if (normalized.includes("intermediaire")) return 2;
  if (normalized.includes("tres facile")) return 0;
  if (normalized.includes("facile") || normalized.includes("debutant")) return 1;
  return null;
}

function tripCorpus(trip: Trip) {
  return cleanValues([
    ...(trip.accommodation_tags ?? []),
    ...trip.ambience_tags,
    ...trip.generation_reasons ?? [],
    trip.description,
    trip.brief ?? ""
  ]);
}

function findKnownTags(values: string[], keywords: string[]) {
  return values.filter((value) => keywords.some((keyword) => normalize(value).includes(keyword)));
}

function countMatches(left: string[], right: string[]) {
  return left.filter((value) => right.some((candidate) => valuesMatch(value, candidate))).length;
}

function valuesMatch(left: string, right: string) {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const aWords = significantWords(a);
  const bWords = significantWords(b);
  return aWords.some((word) => bWords.includes(word));
}

function datesOverlap(left: string, right: string) {
  const leftDates: string[] = left.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  const rightDates: string[] = right.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  return leftDates.some((date) => rightDates.includes(date));
}

function significantWords(value: string) {
  const ignored = new Set(["avec", "dans", "pour", "trip", "groupe", "nature", "souhaite", "accepte"]);
  return value.split(/\s+/).filter((word) => word.length >= 4 && !ignored.has(word));
}

function cleanValues(values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim() ?? "").filter(isMeaningful);
}

function isMeaningful(value: string) {
  const normalized = normalize(value);
  return Boolean(normalized && !["a preciser", "peu importe", "membre"].includes(normalized));
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
