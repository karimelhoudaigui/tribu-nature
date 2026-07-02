import type { TravelPreferences, Trip, UserProfile } from "../types";

export type MatchConfidence = "low" | "medium" | "high";
export type MatchBreakdownItem = { earned: number; maximum: number; label: string; evaluated: boolean };

export type MatchResult = {
  score: number | null;
  rankingScore: number;
  confidence: MatchConfidence;
  coverage: number;
  positiveReasons: string[];
  warningReasons: string[];
  missingFields: string[];
  breakdown: Record<string, MatchBreakdownItem>;
  // Compatibility aliases kept while the remaining legacy panels are extracted.
  reasons: string[];
  missingCriteria: string[];
};

export type TripMatchResult = MatchResult;

const tripCriteria = {
  availability: { maximum: 20, label: "Disponibilités" },
  budget: { maximum: 15, label: "Budget" },
  physicalSafety: { maximum: 15, label: "Niveau physique et sécurité" },
  activities: { maximum: 15, label: "Activités préférées" },
  ambienceSocial: { maximum: 15, label: "Ambiance et compatibilité sociale" },
  destination: { maximum: 10, label: "Destination et ville de départ" },
  comfortPersonal: { maximum: 5, label: "Confort et préférences personnelles" },
  reliability: { maximum: 5, label: "Fiabilité du profil ou du groupe" }
} as const;

export function calculateTripMatch(profile: UserProfile | null, trip: Trip): TripMatchResult {
  if (!profile) return emptyResult(trip.compatibility_score, "Connecte-toi pour obtenir un match personnalisé");
  const accumulator = createAccumulator(tripCriteria);
  const preferences = profile.travel_preferences;

  scoreTripAvailability(accumulator, preferences, trip);
  scoreTripBudget(accumulator, profile, preferences, trip);
  scoreTripPhysicalSafety(accumulator, profile, preferences, trip);
  scoreTripActivities(accumulator, preferences, trip);
  scoreTripAmbienceSocial(accumulator, profile, preferences, trip);
  scoreTripDestination(accumulator, profile, preferences, trip);
  scoreTripComfortPersonal(accumulator, preferences, trip);
  scoreTripReliability(accumulator, trip);

  return accumulator.finalize();
}

export function calculateUserMatch(profile: UserProfile | null, candidate: UserProfile): MatchResult {
  if (!profile) return emptyResult(0, "Complète ton profil pour comparer les membres");
  const criteria = {
    availability: { maximum: 20, label: "Disponibilités communes" },
    departure: { maximum: 10, label: "Zone de départ" },
    physical: { maximum: 10, label: "Niveau physique" },
    budget: { maximum: 10, label: "Budget" },
    ambience: { maximum: 15, label: "Ambiances" },
    activities: { maximum: 15, label: "Activités" },
    social: { maximum: 10, label: "Rythme social et groupe" },
    comfort: { maximum: 5, label: "Confort" },
    reliability: { maximum: 5, label: "Fiabilité" }
  } as const;
  const acc = createAccumulator(criteria);
  const left = profile.travel_preferences;
  const right = candidate.travel_preferences;

  evaluateSharedAvailability(acc, left, right);
  evaluateTextMatch(acc, "departure", meaningful(left?.departure_city) ? left?.departure_city : profile.city, meaningful(right?.departure_city) ? right?.departure_city : candidate.city, 10, "Même zone de départ", "Villes de départ différentes");
  evaluatePhysicalPair(acc, profile, candidate);
  evaluateBudgetPair(acc, profile, candidate);
  evaluateListPair(acc, "ambience", clean([...(left?.preferred_ambiences ?? []), ...profile.preferred_ambiences]), clean([...(right?.preferred_ambiences ?? []), ...candidate.preferred_ambiences]), 15, "Ambiances communes");
  evaluateListPair(acc, "activities", left?.preferred_activities ?? [], right?.preferred_activities ?? [], 15, "Activités appréciées en commun");
  evaluateListPair(acc, "social", left?.group_preferences ?? [], right?.group_preferences ?? [], 10, "Même dynamique de groupe");
  evaluateListPair(acc, "comfort", left?.preferred_accommodation ?? [], right?.preferred_accommodation ?? [], 5, "Confort compatible");
  acc.evaluate("reliability", candidate.verified ? 5 : candidate.bio && candidate.photo_url ? 3 : 1, candidate.verified ? "Profil vérifié" : "Profil public renseigné", candidate.verified ? undefined : "Identité non vérifiée");
  return acc.finalize();
}

export function calculateGroupMatch(profile: UserProfile | null, trip: Trip, members: UserProfile[]): MatchResult {
  if (!profile) return emptyResult(0, "Connecte-toi pour mesurer ton affinité avec le groupe");
  if (!members.length) return emptyResult(calculateTripMatch(profile, trip).rankingScore, "Le groupe n'est pas encore assez formé");
  const criteria = {
    tripConstraints: { maximum: 50, label: "Contraintes du Trip" },
    groupAvailability: { maximum: 10, label: "Disponibilités du groupe" },
    groupPhysical: { maximum: 10, label: "Rythme physique du groupe" },
    groupAmbience: { maximum: 10, label: "Ambiance du groupe" },
    groupSocial: { maximum: 10, label: "Préférences sociales" },
    groupReliability: { maximum: 10, label: "Fiabilité du groupe" }
  } as const;
  const acc = createAccumulator(criteria);
  const tripMatch = calculateTripMatch(profile, trip);
  if (tripMatch.coverage >= 50) {
    acc.evaluate("tripConstraints", Math.round(tripMatch.rankingScore / 2), "Contraintes du Trip prises en compte", tripMatch.warningReasons[0]);
  } else acc.missing("tripConstraints");

  const individualMatches = members.filter((member) => member.id !== profile.id).map((member) => calculateUserMatch(profile, member));
  if (!individualMatches.length) {
    acc.missing("groupAvailability"); acc.missing("groupPhysical"); acc.missing("groupAmbience"); acc.missing("groupSocial");
  } else {
    const average = (key: string, maximum: number) => Math.round(individualMatches.reduce((sum, match) => sum + (match.breakdown[key]?.earned ?? 0), 0) / individualMatches.length / Math.max(individualMatches[0].breakdown[key]?.maximum ?? maximum, 1) * maximum);
    acc.evaluate("groupAvailability", average("availability", 10), "Des disponibilités existent dans le groupe");
    acc.evaluate("groupPhysical", average("physical", 10), "Rythme physique proche du groupe");
    acc.evaluate("groupAmbience", average("ambience", 10), "Ambiances partagées avec le groupe");
    acc.evaluate("groupSocial", average("social", 10), "Préférences sociales proches du groupe");
  }
  const verifiedRatio = members.filter((member) => member.verified).length / members.length;
  acc.evaluate("groupReliability", Math.round(4 + verifiedRatio * 6), verifiedRatio >= 0.5 ? "Plusieurs profils vérifiés" : "Groupe composé de profils publics", verifiedRatio < 0.5 ? "Peu de profils vérifiés dans le groupe" : undefined);
  return acc.finalize();
}

type CriterionDefinition = Record<string, { maximum: number; label: string }>;
type Accumulator = ReturnType<typeof createAccumulator>;

function createAccumulator<T extends CriterionDefinition>(criteria: T) {
  const breakdown: Record<string, MatchBreakdownItem> = Object.fromEntries(Object.entries(criteria).map(([key, criterion]) => [key, { ...criterion, earned: 0, evaluated: false }]));
  const positiveReasons: string[] = [];
  const warningReasons: string[] = [];
  const missingFields: string[] = [];
  let evaluatedMaximum = 0;
  let earned = 0;
  let hardConflict = false;

  return {
    breakdown,
    evaluate(key: keyof T & string, points: number, positive?: string, warning?: string, hard = false) {
      const maximum = criteria[key].maximum;
      const safePoints = clamp(Math.round(points), 0, maximum);
      breakdown[key] = { ...criteria[key], earned: safePoints, evaluated: true };
      evaluatedMaximum += maximum;
      earned += safePoints;
      if (positive && safePoints >= maximum * 0.55) positiveReasons.push(positive);
      if (warning) warningReasons.push(warning);
      if (hard) hardConflict = true;
    },
    missing(key: keyof T & string, field?: string) {
      missingFields.push(field ?? criteria[key].label);
    },
    finalize(): MatchResult {
      const coverage = clamp(Math.round(evaluatedMaximum), 0, 100);
      const rawScore = evaluatedMaximum ? earned / evaluatedMaximum * 100 : 0;
      const coveragePenalty = 0.7 + 0.3 * (coverage / 100);
      let rankingScore = clamp(Math.round(rawScore * coveragePenalty), 0, 100);
      if (hardConflict) rankingScore = Math.min(rankingScore, 69);
      const score = coverage < 50 ? null : rankingScore;
      const confidence: MatchConfidence = coverage >= 85 ? "high" : coverage >= 60 ? "medium" : "low";
      const reasons = positiveReasons.length ? positiveReasons.slice(0, 5) : ["Peu de critères communs ont été confirmés"];
      return { score, rankingScore, confidence, coverage, positiveReasons: reasons, warningReasons, missingFields, breakdown, reasons, missingCriteria: missingFields };
    }
  };
}

function scoreTripAvailability(acc: Accumulator, preferences: TravelPreferences | null | undefined, trip: Trip) {
  if (!hasAvailability(preferences)) return acc.missing("availability");
  if (trip.card_type === "catalog" || !trip.start_date || !trip.end_date) return acc.evaluate("availability", 20, "Dates flexibles compatibles");
  if (preferences?.availability_flexible) return acc.evaluate("availability", 20, "Tes dates sont flexibles");
  const overlaps = dateRangesOverlap(preferences?.availability_start, preferences?.availability_end, trip.start_date, trip.end_date)
    || (preferences?.availability_periods ?? []).some((period) => valuesMatch(period, trip.dates));
  return overlaps
    ? acc.evaluate("availability", 20, "Disponibilités compatibles")
    : acc.evaluate("availability", 0, undefined, "Tes disponibilités ne correspondent pas aux dates du Trip", true);
}

function scoreTripBudget(acc: Accumulator, profile: UserProfile, preferences: TravelPreferences | null | undefined, trip: Trip) {
  const budget = numericBudget(profile, preferences);
  if (!budget || trip.budget_max <= 0) return acc.missing("budget");
  if (rangesOverlap(budget.minimum, budget.maximum, trip.budget_min, trip.budget_max)) {
    const covers = budget.maximum >= trip.budget_max && budget.minimum <= trip.budget_min;
    return acc.evaluate("budget", covers ? 15 : 11, covers ? "Budget totalement compatible" : "Budget partiellement compatible");
  }
  acc.evaluate("budget", 0, undefined, "Budget incompatible avec cette proposition", true);
}

function scoreTripPhysicalSafety(acc: Accumulator, profile: UserProfile, preferences: TravelPreferences | null | undefined, trip: Trip) {
  const profileRank = physicalLevelRank(preferences?.physical_level || profile.physical_level);
  const tripRank = physicalLevelRank(trip.physical_level);
  if (profileRank == null || tripRank == null) return acc.missing("physicalSafety", "Niveau physique");
  const difference = tripRank - profileRank;
  let points = difference <= 0 ? 12 : difference === 1 ? 7 : 0;
  const userSafety = clean([...profile.safety_preferences, ...(preferences?.personal_values ?? [])]);
  const tripSafety = clean(trip.safety_tags ?? []);
  const dangerous = difference >= 2;
  if (!dangerous && userSafety.length && tripSafety.length && countMatches(userSafety, tripSafety)) points += 3;
  acc.evaluate("physicalSafety", points, dangerous ? undefined : "Niveau physique adapté", dangerous ? "Niveau physique potentiellement dangereux" : userSafety.length && !tripSafety.length ? "Informations de sécurité incomplètes" : undefined, dangerous);
}

function scoreTripActivities(acc: Accumulator, preferences: TravelPreferences | null | undefined, trip: Trip) {
  const wanted = clean(preferences?.preferred_activities ?? []);
  const offered = clean([...(trip.activity_tags ?? []), ...trip.activities]);
  if (!wanted.length || !offered.length) return acc.missing("activities");
  const ratio = countMatches(wanted, offered) / wanted.length;
  acc.evaluate("activities", Math.max(1, Math.round(ratio * 15)), ratio > 0 ? "Activités proches de tes envies" : undefined, ratio === 0 ? "Aucune activité préférée identifiée" : undefined);
}

function scoreTripAmbienceSocial(acc: Accumulator, profile: UserProfile, preferences: TravelPreferences | null | undefined, trip: Trip) {
  const ambiences = clean([...(preferences?.preferred_ambiences ?? []), ...profile.preferred_ambiences, profile.adventure_style]);
  const social = clean(preferences?.group_preferences ?? []);
  const tripAmbiences = clean(trip.ambience_tags);
  const tripGroups = clean(trip.group_tags ?? []);
  if ((!ambiences.length || !tripAmbiences.length) && (!social.length || !tripGroups.length)) return acc.missing("ambienceSocial");
  const ambienceRatio = ambiences.length && tripAmbiences.length ? countMatches(ambiences, tripAmbiences) / ambiences.length : 0;
  const socialRatio = social.length && tripGroups.length ? countMatches(social, tripGroups) / social.length : 0;
  const points = Math.round(Math.min(1, ambienceRatio) * 10 + Math.min(1, socialRatio) * 5);
  acc.evaluate("ambienceSocial", points, points >= 8 ? "Ambiance et groupe compatibles" : undefined, points < 5 ? "Ambiance sociale peu documentée ou différente" : undefined);
}

function scoreTripDestination(acc: Accumulator, profile: UserProfile, preferences: TravelPreferences | null | undefined, trip: Trip) {
  const destinations = clean(preferences?.preferred_destinations ?? []);
  const departure = meaningful(preferences?.departure_city) ? preferences?.departure_city : profile.city;
  const destinationMatch = destinations.some((value) => valuesMatch(value, trip.destination) || valuesMatch(value, trip.region ?? "") || valuesMatch(value, trip.country ?? ""));
  const departureMatch = meaningful(departure) && meaningful(trip.departure_city) && valuesMatch(departure ?? "", trip.departure_city ?? "");
  if (!destinations.length && (!meaningful(departure) || !meaningful(trip.departure_city))) return acc.missing("destination");
  const points = (destinationMatch ? 7 : 0) + (departureMatch ? 3 : 0);
  acc.evaluate("destination", Math.max(points, 1), destinationMatch ? "Destination souhaitée" : departureMatch ? "Même ville de départ" : undefined, !destinationMatch && destinations.length ? "Destination différente de tes préférences" : undefined);
}

function scoreTripComfortPersonal(acc: Accumulator, preferences: TravelPreferences | null | undefined, trip: Trip) {
  const wanted = clean([...(preferences?.preferred_accommodation ?? []), ...(preferences?.food_preferences ?? []), ...(preferences?.personal_values ?? [])]);
  const offered = clean([...(trip.accommodation_tags ?? []), ...(trip.food_tags ?? []), ...(trip.value_tags ?? [])]);
  if (!wanted.length || !offered.length) return acc.missing("comfortPersonal");
  const matches = countMatches(wanted, offered);
  acc.evaluate("comfortPersonal", matches ? 5 : 1, matches ? "Confort ou préférences personnelles respectés" : undefined, matches ? undefined : "Confort ou préférences personnelles à vérifier");
}

function scoreTripReliability(acc: Accumulator, trip: Trip) {
  if (trip.created_by_type === "platform" || trip.card_type === "catalog") return acc.evaluate("reliability", 5, "Contenu catalogue documenté");
  const complete = Boolean(trip.creator_id && trip.description && trip.start_date && trip.end_date);
  acc.evaluate("reliability", complete ? 4 : 2, complete ? "Projet utilisateur bien renseigné" : undefined, complete ? undefined : "Certaines informations du projet ne sont pas vérifiées");
}

function evaluateSharedAvailability(acc: Accumulator, left?: TravelPreferences | null, right?: TravelPreferences | null) {
  if (!hasAvailability(left) || !hasAvailability(right)) return acc.missing("availability");
  if (left?.availability_flexible || right?.availability_flexible) return acc.evaluate("availability", 18, "Disponibilités flexibles en commun");
  const overlap = dateRangesOverlap(left?.availability_start, left?.availability_end, right?.availability_start, right?.availability_end)
    || countMatches(left?.availability_periods ?? [], right?.availability_periods ?? []) > 0;
  acc.evaluate("availability", overlap ? 20 : 0, overlap ? "Disponibilités communes" : undefined, overlap ? undefined : "Aucune disponibilité commune identifiée", !overlap);
}

function evaluatePhysicalPair(acc: Accumulator, left: UserProfile, right: UserProfile) {
  const a = physicalLevelRank(left.travel_preferences?.physical_level || left.physical_level);
  const b = physicalLevelRank(right.travel_preferences?.physical_level || right.physical_level);
  if (a == null || b == null) return acc.missing("physical");
  const difference = Math.abs(a - b);
  acc.evaluate("physical", difference === 0 ? 10 : difference === 1 ? 7 : 1, difference <= 1 ? "Rythme physique compatible" : undefined, difference >= 2 ? "Niveaux physiques très différents" : undefined, difference >= 3);
}

function evaluateBudgetPair(acc: Accumulator, left: UserProfile, right: UserProfile) {
  const a = numericBudget(left, left.travel_preferences);
  const b = numericBudget(right, right.travel_preferences);
  if (!a || !b) return acc.missing("budget");
  const overlap = rangesOverlap(a.minimum, a.maximum, b.minimum, b.maximum);
  acc.evaluate("budget", overlap ? 10 : 0, overlap ? "Budgets compatibles" : undefined, overlap ? undefined : "Budgets incompatibles", !overlap);
}

function evaluateTextMatch(acc: Accumulator, key: string, left: string | null | undefined, right: string | null | undefined, maximum: number, positive: string, warning: string) {
  if (!meaningful(left) || !meaningful(right)) return acc.missing(key);
  const match = valuesMatch(left ?? "", right ?? "");
  acc.evaluate(key, match ? maximum : Math.max(1, Math.round(maximum * 0.2)), match ? positive : undefined, match ? undefined : warning);
}

function evaluateListPair(acc: Accumulator, key: string, left: string[], right: string[], maximum: number, positive: string) {
  const a = clean(left); const b = clean(right);
  if (!a.length || !b.length) return acc.missing(key);
  const ratio = countMatches(a, b) / Math.max(a.length, b.length);
  acc.evaluate(key, Math.max(1, Math.round(ratio * maximum)), ratio > 0 ? positive : undefined, ratio === 0 ? `${acc.breakdown[key].label} différentes` : undefined);
}

function emptyResult(rankingScore: number, missing: string): MatchResult {
  const breakdown = Object.fromEntries(Object.entries(tripCriteria).map(([key, item]) => [key, { ...item, earned: 0, evaluated: false }]));
  return { score: null, rankingScore: clamp(Math.round(rankingScore || 0), 0, 100), confidence: "low", coverage: 0, positiveReasons: [], warningReasons: [], missingFields: [missing], breakdown, reasons: [], missingCriteria: [missing] };
}

function hasAvailability(value?: TravelPreferences | null) {
  return Boolean(value?.availability_flexible || value?.availability_start || value?.availability_periods?.length);
}

function numericBudget(profile: UserProfile, preferences?: TravelPreferences | null) {
  if (preferences?.budget_min != null || preferences?.budget_max != null) return { minimum: preferences.budget_min ?? 0, maximum: preferences.budget_max ?? Number.POSITIVE_INFINITY };
  return parseBudgetRange(profile.budget_range);
}

function parseBudgetRange(value: string) {
  if (!meaningful(value)) return null;
  if (normalize(value).includes("flexible")) return { minimum: 0, maximum: Number.POSITIVE_INFINITY };
  const numbers = value.match(/\d+/g)?.map(Number) ?? [];
  if (!numbers.length) return null;
  if (normalize(value).includes("moins")) return { minimum: 0, maximum: numbers[0] };
  if (normalize(value).includes("plus")) return { minimum: numbers[0], maximum: Number.POSITIVE_INFINITY };
  return { minimum: numbers[0], maximum: numbers[1] ?? numbers[0] };
}

function physicalLevelRank(value?: string | null) {
  const normalized = normalize(value ?? "");
  if (!meaningful(value) || normalized.includes("ne sais pas")) return null;
  if (normalized.includes("tres sportif")) return 4;
  if (normalized.includes("sportif")) return 3;
  if (normalized.includes("intermediaire")) return 2;
  if (normalized.includes("tres facile")) return 0;
  if (normalized.includes("facile") || normalized.includes("debutant")) return 1;
  return null;
}

function dateRangesOverlap(startA?: string | null, endA?: string | null, startB?: string | null, endB?: string | null) {
  if (!startA || !endA || !startB || !endB) return false;
  return startA <= endB && startB <= endA;
}

function rangesOverlap(minA: number, maxA: number, minB: number, maxB: number) {
  return minA <= maxB && minB <= maxA;
}

function countMatches(left: string[], right: string[]) {
  return left.filter((item) => right.some((candidate) => valuesMatch(item, candidate))).length;
}

function valuesMatch(left: string, right: string) {
  const a = normalize(left); const b = normalize(right);
  return Boolean(a && b && (a.includes(b) || b.includes(a)));
}

function clean(values: string[]) {
  return [...new Set(values.filter(meaningful).map((value) => value.trim()))];
}

function meaningful(value?: string | null) {
  const normalized = normalize(value ?? "");
  return Boolean(normalized && !["a preciser", "inconnu", "non renseigne", "membre", "nature"].includes(normalized));
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
