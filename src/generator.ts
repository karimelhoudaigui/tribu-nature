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
  const scoredDestinations = mockDestinations
    .map((destination) => scoreDestination(destination, profile))
    .sort((a, b) => b.score - a.score);

  const best = scoredDestinations[0];
  const selectedActivities = selectActivities(best.destination.id, profile);
  const selectedMembers = selectMembers(profile, best.destination);
  const generatedItinerary = buildItinerary(selectedActivities);

  return {
    id: `generated-${best.destination.id}`,
    title: buildTripTitle(best.destination, profile),
    destination: `${best.destination.name}, ${best.destination.region}`,
    image_url: best.destination.image,
    dates: getDurationLabel(profile.availability),
    duration: getDurationLabel(profile.availability),
    budget_min: Math.max(60, best.destination.average_budget - 60),
    budget_max: best.destination.average_budget + 70,
    physical_level: profile.physical_level,
    ambience_tags: profile.ambience.slice(0, 3),
    compatibility_score: Math.min(98, Math.round(best.score)),
    interested_count: selectedMembers.length + getCollectiveCount(best.destination, profile),
    status: "Trip générée pour ton profil",
    description: `${best.destination.description} La proposition combine des membres compatibles, des activités locales adaptées et un planning réaliste.`,
    activities: selectedActivities.map((activity) => activity.name),
    generation_reasons: best.reasons,
    matched_member_ids: selectedMembers.map((member) => member.id),
    generated_activity_ids: selectedActivities.map((activity) => activity.id),
    generated_itinerary: generatedItinerary
  };
}

function scoreDestination(destination: MockDestination, profile: OnboardingProfile): ScoredDestination {
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

  const destinationActivities = mockLocalActivities.filter((activity) => activity.destinationId === destination.id);
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

function selectActivities(destinationId: string, profile: OnboardingProfile) {
  const weather = "nuageux";
  return mockLocalActivities
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

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
