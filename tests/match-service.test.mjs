import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { transform } from "esbuild";

const source = await readFile(new URL("../src/services/matchService.ts", import.meta.url), "utf8");
const compiled = await transform(source, { loader: "ts", format: "esm", target: "es2020" });
const { calculateTripMatch } = await import(`data:text/javascript;base64,${Buffer.from(compiled.code).toString("base64")}`);

const baseTrip = {
  id: "match-trip",
  title: "Week-end montagne calme",
  destination: "Valais, Suisse",
  image_url: "https://example.com/trip.jpg",
  dates: "Dates à décider ensemble",
  duration: "Week-end",
  budget_min: 200,
  budget_max: 350,
  physical_level: "intermédiaire",
  ambience_tags: ["Calme & déconnexion", "Montagne"],
  compatibility_score: 76,
  interested_count: 4,
  status: "Idée publiée",
  description: "Randonnée, refuge et petit groupe calme.",
  activities: ["Randonnée", "Visite locale"],
  card_type: "catalog",
  region: "Valais",
  country: "Suisse",
  accommodation_tags: ["Refuge"],
  group_tags: ["Petit groupe", "Groupe calme"],
  safety_tags: ["Profils vérifiés"],
  activity_tags: ["Randonnée", "Patrimoine"]
};

function createProfile(overrides = {}) {
  return {
    id: "profile-compatible",
    name: "Karim",
    age_range: "25-35",
    city: "Bordeaux",
    photo_url: "https://example.com/avatar.jpg",
    bio: "Montagne et calme",
    verified: true,
    physical_level: "intermédiaire",
    budget_range: "200 à 350 €",
    adventure_style: "Calme & déconnexion",
    preferred_ambiences: ["Calme & déconnexion", "Montagne"],
    safety_preferences: ["Profils vérifiés"],
    past_trips: 2,
    badges: [],
    travel_preferences: {
      user_id: "profile-compatible",
      preferred_destinations: ["Valais"],
      preferred_activities: ["Randonnée", "Visite locale"],
      preferred_accommodation: ["Refuge"],
      food_preferences: [],
      group_preferences: ["Petit groupe"],
      personal_values: [],
      availability_periods: ["Week-end"],
      max_distance_km: 500,
      preferred_group_size_min: 3,
      preferred_group_size_max: 6
    },
    ...overrides
  };
}

test("un budget couvrant le Trip obtient tous les points budget", () => {
  const match = calculateTripMatch(createProfile(), baseTrip);
  assert.equal(match.breakdown.budget.earned, 20);
  assert.ok(match.reasons.some((reason) => reason.includes("Budget compatible")));
});

test("un niveau physique identique obtient tous les points", () => {
  const match = calculateTripMatch(createProfile(), baseTrip);
  assert.equal(match.breakdown.physicalLevel.earned, 15);
});

test("plusieurs ambiances communes donnent un score ambiance élevé", () => {
  const match = calculateTripMatch(createProfile(), baseTrip);
  assert.equal(match.breakdown.ambiences.earned, 15);
});

test("un profil incomplet reçoit un score estimé avec une confiance faible", () => {
  const profile = createProfile({
    physical_level: "À préciser",
    preferred_ambiences: [],
    adventure_style: "À préciser",
    safety_preferences: [],
    city: "À préciser",
    travel_preferences: null
  });
  const match = calculateTripMatch(profile, baseTrip);
  assert.equal(match.confidence, "faible");
  assert.ok(match.missingCriteria.includes("Activités préférées"));
  assert.ok(match.missingCriteria.includes("Disponibilités"));
});

test("deux profils différents voient des scores différents pour le même Trip", () => {
  const compatible = calculateTripMatch(createProfile(), baseTrip);
  const different = calculateTripMatch(createProfile({
    id: "profile-different",
    physical_level: "très facile",
    budget_range: "Moins de 100 €",
    adventure_style: "Premium & confort",
    preferred_ambiences: ["Premium & confort"],
    safety_preferences: ["Hôtel confortable"],
    travel_preferences: {
      ...createProfile().travel_preferences,
      user_id: "profile-different",
      preferred_destinations: ["Paris"],
      preferred_activities: ["Spa"],
      preferred_accommodation: ["Hôtel"],
      group_preferences: ["Grand groupe"],
      preferred_group_size_min: 9,
      preferred_group_size_max: 15
    }
  }), baseTrip);
  assert.equal(compatible.score, 98);
  assert.equal(different.score, 18);
  assert.ok(compatible.score > different.score);
  assert.notEqual(compatible.score, different.score);
});

test("un Trip catalogue flexible ne pénalise pas les disponibilités", () => {
  const match = calculateTripMatch(createProfile(), baseTrip);
  assert.equal(match.breakdown.availability.earned, 10);
});

test("des dates incompatibles réduisent le score d'un projet utilisateur", () => {
  const project = { ...baseTrip, card_type: "user_project", dates: "2026-08-15 -> 2026-08-17", duration: "3 jours" };
  const unavailable = calculateTripMatch(createProfile(), project);
  const available = calculateTripMatch(createProfile({
    travel_preferences: {
      ...createProfile().travel_preferences,
      availability_periods: ["2026-08-15", "3 jours"]
    }
  }), project);
  assert.equal(unavailable.breakdown.availability.earned, 2);
  assert.equal(available.breakdown.availability.earned, 10);
  assert.ok(available.score > unavailable.score);
});

test("sans profil, le score catalogue reste un fallback clairement estimé", () => {
  const match = calculateTripMatch(null, baseTrip);
  assert.equal(match.score, baseTrip.compatibility_score);
  assert.equal(match.confidence, "faible");
  assert.deepEqual(match.reasons, ["Score catalogue estimé"]);
});
