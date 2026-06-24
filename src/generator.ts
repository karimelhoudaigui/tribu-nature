import {
  mockCollectiveIntents,
  mockDestinationSeeds,
  mockDestinations,
  mockLocalActivities,
  mockMembers
} from "./data";
import type { ItineraryItem, MockDestination, MockLocalActivity, MockMember, OnboardingProfile, Trip } from "./types";

type ScoredDestination = {
  destination: MockDestination;
  score: number;
  reasons: string[];
};

export function generateTripFromProfile(profile: OnboardingProfile): Trip {
  return generateTripsFromProfile(profile)[0];
}

export function generateTripsFromProfile(profile: OnboardingProfile, apiActivities: MockLocalActivity[] = []): Trip[] {
  const activityPool = mergeActivities(mockLocalActivities, apiActivities);
  const scoredDestinations = mockDestinations
    .filter((destination) => destinationMatchesFilters(destination, profile, activityPool))
    .map((destination) => scoreDestination(destination, profile, activityPool))
    .sort((a, b) => b.score - a.score);

  return scoredDestinations.map((scored) => buildTripFromScoredDestination(scored, profile, activityPool));
}

function buildTripFromScoredDestination(scored: ScoredDestination, profile: OnboardingProfile, activityPool: MockLocalActivity[]): Trip {
  const selectedActivities = selectActivities(scored.destination.id, profile, activityPool);
  const selectedMembers = selectMembers(profile, scored.destination);
  const generatedItinerary = buildItinerary(selectedActivities);

  return {
    id: `generated-${scored.destination.id}`,
    title: buildTripTitle(scored.destination, profile),
    destination: `${scored.destination.name}, ${scored.destination.region}`,
    image_url: scored.destination.image,
    dates: getDurationLabel(profile.availability),
    duration: getDurationLabel(profile.availability),
    budget_min: Math.max(60, scored.destination.average_budget - 60),
    budget_max: scored.destination.average_budget + 70,
    physical_level: profile.physical_level,
    ambience_tags: buildAmbienceTags(scored.destination, profile),
    compatibility_score: Math.min(98, Math.round(scored.score)),
    interested_count: selectedMembers.length + getCollectiveCount(scored.destination, profile),
    status: "Trip générée pour ton profil",
    description: `${scored.destination.description} La proposition combine des membres compatibles, des activités locales adaptées et un planning réaliste.`,
    activities: selectedActivities.map((activity) => activity.name),
    generation_reasons: scored.reasons,
    matched_member_ids: selectedMembers.map((member) => member.id),
    generated_activity_ids: selectedActivities.map((activity) => activity.id),
    generated_itinerary: generatedItinerary
  };
}

function buildAmbienceTags(destination: MockDestination, profile: OnboardingProfile) {
  const tags = [...profile.ambience, ...destination.nature_type];
  return Array.from(new Set(tags)).slice(0, 3);
}

function destinationMatchesFilters(destination: MockDestination, profile: OnboardingProfile, activityPool: MockLocalActivity[]) {
  const filters = profile.filters.map(normalize);
  const selectedNatureFilters = ["montagne", "foret", "mer", "campagne", "riviere", "lac", "parc naturel", "village / patrimoine local", "destination depaysante"]
    .filter((nature) => filters.includes(nature));
  const selectedDeparture = getDepartureFilter(profile);
  const selectedBudgetMax = getBudgetMaxFilter(profile);
  const selectedDuration = getDurationFilter(profile);
  const destinationNature = destination.nature_type.map(normalize);
  const compatibleActivities = selectActivities(destination.id, profile, activityPool);

  if (hasSpecificDestinationZones(profile) && !destinationMatchesSelectedZones(destination, profile.destination_zones)) {
    return false;
  }

  if (selectedNatureFilters.length > 0 && !selectedNatureFilters.some((nature) => natureMatchesDestination(nature, destinationNature, destination))) {
    return false;
  }

  if (selectedDeparture && !destination.compatible_departure_cities.map(normalize).includes(normalize(selectedDeparture))) {
    return false;
  }

  if (selectedBudgetMax && destination.average_budget > selectedBudgetMax) {
    return false;
  }

  if (!destination.recommended_physical_level.some((level) => normalize(level) === normalize(profile.physical_level)) && profile.physical_level !== "Je ne sais pas") {
    return false;
  }

  if (selectedDuration === "journee" && destination.average_budget > 120) {
    return false;
  }

  if (compatibleActivities.length === 0) {
    return false;
  }

  return true;
}

function scoreDestination(destination: MockDestination, profile: OnboardingProfile, activityPool: MockLocalActivity[]): ScoredDestination {
  let score = 35;
  const reasons: string[] = [];
  const profileNature = normalize(profile.preferred_nature);
  const profileAmbiences = profile.ambience.map(normalize);

  if (destination.nature_type.some((nature) => normalize(nature) === profileNature)) {
    score += 18;
    reasons.push(`Elle correspond à ton envie de ${profile.preferred_nature.toLowerCase()}.`);
  }

  if (destination.compatible_departure_cities.includes(profile.departure_city)) {
    score += 14;
    reasons.push(`Elle est compatible avec un départ depuis ${profile.departure_city}.`);
  }

  if (budgetMatches(destination.average_budget, profile.budget)) {
    score += 12;
    reasons.push("Elle correspond à ton budget.");
  }

  if (destination.recommended_physical_level.some((level) => normalize(level) === normalize(profile.physical_level))) {
    score += 10;
    reasons.push(`Le niveau ${profile.physical_level.toLowerCase()} est adapté.`);
  }

  if (destination.compatible_ambiences.some((ambience) => profileAmbiences.includes(normalize(ambience)))) {
    score += 12;
    reasons.push("L'ambiance colle avec ce que tu recherches.");
  }

  if (destinationMatchesSelectedZones(destination, profile.destination_zones)) {
    score += 20;
    reasons.push("Elle se trouve dans une zone que tu as sélectionnée.");
  }

  const destinationActivities = activityPool.filter((activity) => activity.destinationId === destination.id);
  const compatibleActivities = destinationActivities.filter((activity) => activityMatches(activity, profile));
  if (compatibleActivities.length >= 3) {
    score += 12;
    reasons.push("Elle contient plusieurs activités locales adaptées au groupe.");
  }

  const matchingMembers = selectMembers(profile, destination);
  if (matchingMembers.length > 0) {
    score += Math.min(10, matchingMembers.length * 3);
    reasons.push(`${matchingMembers.length} personne${matchingMembers.length > 1 ? "s ont" : " a"} une envie similaire.`);
  }

  const seed = mockDestinationSeeds.find((item) => item.destinationId === destination.id && seedMatches(item.ambience, profile.ambience));
  if (seed) {
    score += 10;
    reasons.push("Jonathan veut déjà y aller, ce qui crée un point d'ancrage pour former le groupe.");
  }

  const collective = getCollectiveIntent(destination, profile);
  if (collective) {
    score += 8;
    reasons.push(`${collective.interested_count} personnes cherchent une aventure similaire depuis ${profile.departure_city}.`);
  }

  score += Math.round(destination.safety_score / 20);

  return { destination, score, reasons: reasons.slice(0, 5) };
}

function selectActivities(destinationId: string, profile: OnboardingProfile, activityPool: MockLocalActivity[] = mockLocalActivities) {
  const weather = "nuageux";
  return activityPool
    .filter((activity) => activity.destinationId === destinationId)
    .filter((activity) => activityMatches(activity, profile))
    .filter((activity) => activity.weather_compatible.includes(weather) || activity.weather_compatible.includes("pluie"))
    .sort((a, b) => activityScore(b, profile) - activityScore(a, profile))
    .slice(0, 6);
}

function activityMatches(activity: MockLocalActivity, profile: OnboardingProfile) {
  const ambienceMatch = activity.ambience.some((item) => profile.ambience.map(normalize).includes(normalize(item)));
  const levelMatch = normalize(activity.physical_level) === "tres facile" || normalize(activity.physical_level) === normalize(profile.physical_level) || profile.physical_level === "Facile";
  const budgetOk = activity.estimated_price <= budgetMax(profile.budget) / 3;
  return activity.group_friendly && levelMatch && budgetOk && (ambienceMatch || activity.risk === "faible");
}

function activityScore(activity: MockLocalActivity, profile: OnboardingProfile) {
  let score = 0;
  if (activity.ambience.some((item) => profile.ambience.map(normalize).includes(normalize(item)))) score += 5;
  if (activity.risk === "faible") score += 2;
  if (!activity.booking_required) score += 1;
  if (activity.weather_compatible.includes("pluie")) score += 1;
  return score;
}

function selectMembers(profile: OnboardingProfile, destination: MockDestination): MockMember[] {
  return mockMembers
    .filter((member) => member.city === profile.departure_city)
    .filter((member) => member.preferred_nature.some((nature) => destination.nature_type.map(normalize).includes(normalize(nature))))
    .filter((member) => member.preferred_ambience.some((ambience) => profile.ambience.map(normalize).includes(normalize(ambience))))
    .filter((member) => budgetMatches(budgetMidpoint(member.budget), profile.budget))
    .slice(0, 5);
}

function buildItinerary(activities: MockLocalActivity[]): ItineraryItem[] {
  const [mainWalk, localVisit, dinner, dynamicActivity, backup] = activities;
  return [
    {
      id: "generated-1",
      trip_id: "generated",
      day: "Vendredi soir",
      time: "19:30",
      title: "Départ, arrivée et installation",
      description: "Le groupe se retrouve, s'installe et confirme le rythme du week-end.",
      duration: "2h"
    },
    {
      id: "generated-2",
      trip_id: "generated",
      day: "Samedi matin",
      time: "09:30",
      title: mainWalk?.name ?? "Balade nature accessible",
      description: mainWalk?.description ?? "Une activité douce pour lancer le week-end.",
      duration: mainWalk?.duration ?? "2h"
    },
    {
      id: "generated-3",
      trip_id: "generated",
      day: "Samedi après-midi",
      time: "15:00",
      title: localVisit?.name ?? "Découverte locale",
      description: localVisit?.description ?? "Une expérience locale adaptée au groupe.",
      duration: localVisit?.duration ?? "2h",
      alternative_if_rain: backup?.name
    },
    {
      id: "generated-4",
      trip_id: "generated",
      day: "Samedi soir",
      time: "20:00",
      title: dinner?.name ?? "Dîner collectif",
      description: dinner?.description ?? "Un moment simple pour créer du lien.",
      duration: dinner?.duration ?? "2h"
    },
    {
      id: "generated-5",
      trip_id: "generated",
      day: "Dimanche matin",
      time: "10:00",
      title: dynamicActivity?.name ?? "Activité nature selon météo",
      description: dynamicActivity?.description ?? "Une activité choisie selon la météo et l'énergie du groupe.",
      duration: dynamicActivity?.duration ?? "2h",
      alternative_if_rain: backup?.name
    },
    {
      id: "generated-6",
      trip_id: "generated",
      day: "Dimanche après-midi",
      time: "14:30",
      title: "Retour tranquille",
      description: "Dernier moment ensemble, bilan du groupe et retour.",
      duration: "2h"
    }
  ];
}

function buildTripTitle(destination: MockDestination, profile: OnboardingProfile) {
  const prefix = profile.preferred_nature === "Montagne" ? "Week-end nature" : "Échappée nature";
  return `${prefix} en ${destination.name}`;
}

function getDurationLabel(availability: string[]) {
  const duration = availability.find((item) => ["Journée", "Week-end", "2-3 jours", "Semaine"].includes(item));
  return duration ?? "Week-end";
}

function getDurationFilter(profile: OnboardingProfile) {
  const source = [...profile.filters, ...profile.availability].map(normalize);
  if (source.includes("journee")) return "journee";
  if (source.includes("week-end")) return "week-end";
  if (source.includes("2-3 jours")) return "2-3 jours";
  if (source.includes("semaine")) return "semaine";
  return "";
}

function getDepartureFilter(profile: OnboardingProfile) {
  const departureFilter = profile.filters.find((filter) => normalize(filter).startsWith("depart "));
  return departureFilter?.replace(/^Départ\s+/i, "") ?? profile.departure_city;
}

function getBudgetMaxFilter(profile: OnboardingProfile) {
  const budgetFilter = profile.filters.find((filter) => normalize(filter).startsWith("budget max"));
  const match = budgetFilter?.match(/(\d+)/);
  return match ? Number(match[1]) : budgetMax(profile.budget);
}

function hasSpecificDestinationZones(profile: OnboardingProfile) {
  return profile.destination_zones.some((zone) => normalize(zone) !== "peu m'importe");
}

function destinationMatchesSelectedZones(destination: MockDestination, zones: string[]) {
  const specificZones = zones.map(normalize).filter((zone) => zone !== "peu m'importe");
  if (specificZones.length === 0) return false;

  const searchable = normalize([
    destination.id,
    destination.name,
    destination.region,
    destination.description,
    ...destination.nature_type
  ].join(" "));

  const zoneAliases: Record<string, string[]> = {
    pyrenees: ["pyrenees", "aspe", "basque"],
    "pays basque": ["basque"],
    alpes: ["alpes", "vercors"],
    bretagne: ["bretagne"],
    "vallee d'aspe": ["aspe"],
    suisse: ["suisse"],
    espagne: ["espagne"],
    "nouvelle-aquitaine": ["nouvelle-aquitaine", "pyrenees-atlantiques", "aspe", "basque", "dordogne", "gironde", "arcachon"],
    occitanie: ["occitanie", "pyrenees", "cevennes"],
    "auvergne-rhone-alpes": ["auvergne-rhone-alpes", "vercors", "alpes"],
    "provence-alpes-cote d'azur": ["provence-alpes-cote d'azur", "provence", "azur", "alpes du sud"],
    "ile-de-france": ["ile-de-france", "fontainebleau"],
    normandie: ["normandie"],
    corse: ["corse"],
    "pays de la loire": ["pays de la loire", "loire"],
    "centre-val de loire": ["centre-val de loire", "loire"],
    "bourgogne-franche-comte": ["bourgogne-franche-comte", "bourgogne", "franche-comte"],
    "grand est": ["grand est", "vosges", "alsace"],
    "hauts-de-france": ["hauts-de-france", "opale"],
    "espagne du nord": ["pyrenees", "aspe", "basque", "montagne"],
    catalogne: ["pyrenees", "montagne", "mer"],
    aragon: ["pyrenees", "montagne", "riviere"],
    navarre: ["pyrenees", "basque", "foret"],
    "pays basque espagnol": ["basque", "montagne", "mer"],
    andalousie: ["campagne", "village", "destination depaysante"],
    "italie du nord": ["alpes", "vercors", "montagne"],
    piemont: ["alpes", "montagne"],
    lombardie: ["alpes", "lac", "montagne"],
    toscane: ["campagne", "village", "dordogne"],
    "trentin-haut-adige": ["alpes", "montagne", "lac"],
    ligurie: ["mer", "arcachon"],
    "suisse romande": ["alpes", "vercors", "montagne"],
    valais: ["alpes", "montagne"],
    vaud: ["lac", "alpes", "montagne"],
    grisons: ["alpes", "montagne"],
    tessin: ["alpes", "lac", "montagne"],
    berne: ["alpes", "montagne", "lac"],
    baviere: ["alpes", "montagne", "lac"],
    "bade-wurtemberg": ["foret", "campagne"],
    "foret-noire": ["foret", "fontainebleau"],
    rhenanie: ["riviere", "campagne", "dordogne"],
    saxe: ["foret", "campagne"],
    "berlin-brandenburg": ["foret", "lac", "fontainebleau"],
    "nord du portugal": ["montagne", "riviere", "campagne"],
    "centre du portugal": ["foret", "riviere", "campagne"],
    "lisbonne et cote": ["mer", "arcachon"],
    alentejo: ["campagne", "village"],
    algarve: ["mer", "arcachon"],
    "ardennes belges": ["foret", "riviere"],
    wallonie: ["campagne", "foret"],
    flandre: ["mer", "campagne"],
    "bruxelles et alentours": ["foret", "fontainebleau"],
    zelande: ["mer", "arcachon"],
    frise: ["lac", "mer"],
    "hollande du nord": ["mer", "arcachon"],
    gueldre: ["foret", "fontainebleau"],
    "wild atlantic way": ["mer", "campagne"],
    connemara: ["lac", "montagne", "campagne"],
    "dublin et wicklow": ["montagne", "foret"],
    "cork et kerry": ["mer", "montagne"],
    ecosse: ["montagne", "lac", "destination depaysante"],
    "pays de galles": ["montagne", "mer"],
    "lake district": ["lac", "montagne"],
    "angleterre du sud-ouest": ["mer", "campagne"],
    crete: ["mer", "montagne", "destination depaysante"],
    cyclades: ["mer", "destination depaysante"],
    peloponnese: ["mer", "montagne", "village"],
    epire: ["montagne", "riviere"]
  };

  return specificZones.some((zone) => {
    const aliases = zoneAliases[zone] ?? [zone];
    return aliases.some((alias) => searchable.includes(alias));
  });
}

function natureMatchesDestination(nature: string, destinationNature: string[], destination: MockDestination) {
  const searchable = normalize(`${destination.name} ${destination.region} ${destination.description} ${destination.nature_type.join(" ")}`);
  if (destinationNature.includes(nature)) return true;
  if (nature === "parc naturel") return searchable.includes("parc") || searchable.includes("vercors");
  if (nature === "village / patrimoine local") return searchable.includes("village") || searchable.includes("patrimoine") || searchable.includes("basque") || searchable.includes("dordogne");
  if (nature === "destination depaysante") return destination.safety_score >= 85;
  return false;
}

function getCollectiveCount(destination: MockDestination, profile: OnboardingProfile) {
  return getCollectiveIntent(destination, profile)?.interested_count ?? 0;
}

function getCollectiveIntent(destination: MockDestination, profile: OnboardingProfile) {
  return mockCollectiveIntents.find(
    (intent) =>
      intent.departure_city === profile.departure_city &&
      destination.nature_type.map(normalize).includes(normalize(intent.nature_type)) &&
      intent.ambience.some((ambience) => profile.ambience.map(normalize).includes(normalize(ambience)))
  );
}

function seedMatches(seedAmbiences: string[], profileAmbiences: string[]) {
  return seedAmbiences.some((ambience) => profileAmbiences.map(normalize).includes(normalize(ambience)));
}

function budgetMatches(value: number, budget: string) {
  return value <= budgetMax(budget);
}

function budgetMax(budget: string) {
  if (budget.includes("100 à 200")) return 200;
  if (budget.includes("200 à 350")) return 350;
  if (budget.includes("350 à 500")) return 500;
  if (budget.includes("Moins")) return 100;
  return 500;
}

function budgetMidpoint(budget: string) {
  if (budget.includes("100 à 200")) return 150;
  if (budget.includes("200 à 350")) return 275;
  if (budget.includes("350 à 500")) return 425;
  if (budget.includes("Moins")) return 80;
  return 300;
}

function mergeActivities(mocked: MockLocalActivity[], fromApis: MockLocalActivity[]) {
  const byKey = new Map<string, MockLocalActivity>();
  [...fromApis, ...mocked].forEach((activity) => {
    const key = normalize(`${activity.destinationId}-${activity.name}`);
    if (!byKey.has(key)) byKey.set(key, activity);
  });
  return Array.from(byKey.values());
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
