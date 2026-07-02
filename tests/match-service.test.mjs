import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { transform } from "esbuild";

const source = await readFile(new URL("../src/services/matchService.ts", import.meta.url), "utf8");
const compiled = await transform(source, { loader: "ts", format: "esm", target: "es2020" });
const { calculateGroupMatch, calculateTripMatch, calculateUserMatch } = await import(`data:text/javascript;base64,${Buffer.from(compiled.code).toString("base64")}`);

const baseTrip = {
  id: "match-trip",
  title: "Week-end montagne calme",
  destination: "Valais, Suisse",
  image_url: "https://example.com/trip.jpg",
  dates: "Dates à décider ensemble",
  duration: "Week-end",
  budget_min: 200,
  budget_max: 350,
  physical_level: "Intermédiaire",
  ambience_tags: ["Calme & déconnexion", "Montagne"],
  compatibility_score: 76,
  interested_count: 4,
  status: "Idée publiée",
  description: "Randonnée, refuge et petit groupe calme.",
  activities: ["Randonnée", "Visite locale"],
  card_type: "catalog",
  created_by_type: "platform",
  region: "Valais",
  country: "Suisse",
  accommodation_tags: ["Refuge"],
  group_tags: ["Petit groupe", "Groupe calme"],
  safety_tags: ["Plan B météo"],
  activity_tags: ["Randonnée", "Patrimoine"],
  food_tags: ["Végétarien"],
  value_tags: ["Plan B météo"]
};

function createProfile(overrides = {}) {
  const id = overrides.id ?? "profile-compatible";
  const base = {
    id,
    name: "Karim",
    age_range: "25-35",
    city: "Bordeaux",
    photo_url: "https://example.com/avatar.jpg",
    bio: "Montagne et calme",
    verified: true,
    physical_level: "Intermédiaire",
    budget_range: "200 à 350 €",
    adventure_style: "Calme & déconnexion",
    preferred_ambiences: ["Calme & déconnexion", "Montagne"],
    safety_preferences: ["Plan B météo"],
    past_trips: 2,
    badges: [],
    travel_preferences: {
      user_id: id,
      departure_city: "Bordeaux",
      availability_start: null,
      availability_end: null,
      availability_flexible: true,
      budget_min: 200,
      budget_max: 350,
      physical_level: "Intermédiaire",
      nature_types: ["Montagne"],
      preferred_ambiences: ["Calme & déconnexion", "Montagne"],
      preferred_trip_durations: ["Week-end"],
      preferred_destinations: ["Valais"],
      preferred_activities: ["Randonnée", "Visite locale"],
      preferred_accommodation: ["Refuge"],
      food_preferences: ["Végétarien"],
      group_preferences: ["Petit groupe"],
      personal_values: ["Plan B météo"],
      availability_periods: ["Week-end"],
      max_distance_km: 500,
      preferred_group_size_min: 3,
      preferred_group_size_max: 6,
      onboarding_step: 7,
      onboarding_status: "completed"
    }
  };
  return { ...base, ...overrides };
}

test("un profil incomplet n'affiche pas un faux pourcentage", () => {
  const match = calculateTripMatch(createProfile({
    city: "À préciser",
    physical_level: "À préciser",
    budget_range: "À préciser",
    adventure_style: "À préciser",
    preferred_ambiences: [],
    safety_preferences: [],
    travel_preferences: null
  }), baseTrip);
  assert.equal(match.score, null);
  assert.equal(match.confidence, "low");
  assert.ok(match.coverage < 50);
  assert.ok(match.missingFields.includes("Activités préférées"));
});

test("un profil complet obtient un score explicable avec une forte couverture", () => {
  const match = calculateTripMatch(createProfile(), baseTrip);
  assert.equal(match.confidence, "high");
  assert.equal(match.coverage, 100);
  assert.ok(match.score !== null && match.score > 75);
  assert.ok(match.positiveReasons.includes("Budget totalement compatible"));
  assert.ok(match.positiveReasons.includes("Activités proches de tes envies"));
});

test("un budget incompatible produit un avertissement et pénalise le classement", () => {
  const compatible = calculateTripMatch(createProfile(), baseTrip);
  const incompatible = calculateTripMatch(createProfile({
    budget_range: "Moins de 100 €",
    travel_preferences: { ...createProfile().travel_preferences, budget_min: 0, budget_max: 100 }
  }), baseTrip);
  assert.equal(incompatible.breakdown.budget.earned, 0);
  assert.ok(incompatible.warningReasons.includes("Budget incompatible avec cette proposition"));
  assert.ok(incompatible.rankingScore <= 69);
  assert.ok(incompatible.rankingScore < compatible.rankingScore);
});

test("des dates sans chevauchement sont un conflit fort", () => {
  const project = { ...baseTrip, card_type: "user_project", created_by_type: "user", start_date: "2029-11-20", end_date: "2029-11-30", dates: "20 au 30 novembre 2029", creator_id: "owner" };
  const profile = createProfile({
    travel_preferences: {
      ...createProfile().travel_preferences,
      availability_flexible: false,
      availability_start: "2029-12-10",
      availability_end: "2029-12-20",
      availability_periods: []
    }
  });
  const match = calculateTripMatch(profile, project);
  assert.equal(match.breakdown.availability.earned, 0);
  assert.ok(match.warningReasons.some((reason) => reason.includes("disponibilités")));
  assert.ok(match.rankingScore <= 69);
});

test("un niveau potentiellement dangereux ne peut pas être recommandé fortement", () => {
  const dangerousTrip = { ...baseTrip, physical_level: "Très sportif" };
  const beginner = createProfile({
    physical_level: "Très facile",
    travel_preferences: { ...createProfile().travel_preferences, physical_level: "Très facile" }
  });
  const match = calculateTripMatch(beginner, dangerousTrip);
  assert.equal(match.breakdown.physicalSafety.earned, 0);
  assert.ok(match.warningReasons.includes("Niveau physique potentiellement dangereux"));
  assert.ok(match.rankingScore <= 69);
});

test("le classement change réellement selon les préférences du profil", () => {
  const mountainTrip = baseTrip;
  const seaTrip = {
    ...baseTrip,
    id: "sea-trip",
    title: "Surf et côte sauvage",
    destination: "Biarritz, France",
    region: "Nouvelle-Aquitaine",
    country: "France",
    ambience_tags: ["Sport & dépassement", "Mer"],
    activities: ["Surf"],
    activity_tags: ["Surf"],
    accommodation_tags: ["Hôtel"],
    group_tags: ["Groupe sociable"]
  };
  const mountainProfile = createProfile();
  const seaProfile = createProfile({
    adventure_style: "Sport & dépassement",
    preferred_ambiences: ["Sport & dépassement", "Mer"],
    travel_preferences: {
      ...createProfile().travel_preferences,
      preferred_destinations: ["Biarritz"],
      preferred_activities: ["Surf"],
      preferred_ambiences: ["Sport & dépassement", "Mer"],
      preferred_accommodation: ["Hôtel"],
      group_preferences: ["Groupe sociable"]
    }
  });
  assert.ok(calculateTripMatch(mountainProfile, mountainTrip).rankingScore > calculateTripMatch(mountainProfile, seaTrip).rankingScore);
  assert.ok(calculateTripMatch(seaProfile, seaTrip).rankingScore > calculateTripMatch(seaProfile, mountainTrip).rankingScore);
});

test("le match entre personnes utilise une formule distincte", () => {
  const compatible = createProfile({ id: "candidate-compatible", name: "Samy" });
  const incompatible = createProfile({
    id: "candidate-different",
    name: "Anne",
    city: "Nice",
    physical_level: "Très sportif",
    budget_range: "800 € et plus",
    preferred_ambiences: ["Fête"],
    travel_preferences: {
      ...createProfile().travel_preferences,
      user_id: "candidate-different",
      departure_city: "Nice",
      availability_flexible: false,
      availability_start: "2030-01-01",
      availability_end: "2030-01-10",
      budget_min: 800,
      budget_max: 1500,
      physical_level: "Très sportif",
      preferred_activities: ["Parapente"],
      preferred_ambiences: ["Fête"],
      group_preferences: ["Grand groupe"]
    }
  });
  const reference = createProfile();
  assert.ok(calculateUserMatch(reference, compatible).rankingScore > calculateUserMatch(reference, incompatible).rankingScore);
});

test("le match de groupe est distinct du match du Trip", () => {
  const profile = createProfile();
  const group = calculateGroupMatch(profile, baseTrip, [profile, createProfile({ id: "member-2", name: "Samy" })]);
  const trip = calculateTripMatch(profile, baseTrip);
  assert.ok(Object.hasOwn(group.breakdown, "groupAmbience"));
  assert.ok(Object.hasOwn(trip.breakdown, "activities"));
  assert.notDeepEqual(Object.keys(group.breakdown), Object.keys(trip.breakdown));
});

test("sans profil connecté, aucune compatibilité personnalisée n'est prétendue", () => {
  const match = calculateTripMatch(null, baseTrip);
  assert.equal(match.score, null);
  assert.equal(match.coverage, 0);
  assert.equal(match.rankingScore, baseTrip.compatibility_score);
});
