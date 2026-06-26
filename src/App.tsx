import { type ChangeEvent, type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import {
  BadgeCheck,
  Bell,
  CalendarDays,
  Camera,
  Compass,
  Copy,
  ExternalLink,
  Heart,
  HeartHandshake,
  Home,
  Menu,
  MessageCircle,
  Mountain,
  Send,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Users,
  X
} from "lucide-react";
import { activities, destination, members, mockMembers, providers, trips as localTrips, mockLocalActivities as localActivities } from "./data";
import {
  getCurrentProfile,
  getProfileById,
  getProfilesByIds,
  getStoredSession,
  hasSupabaseAuthConfig,
  signOut,
  signInWithEmail,
  signUpWithEmail,
  updateProfile,
  type AuthSession,
  type UserProfileUpdate,
  type UserProfileRecord
} from "./services/authService";
import { createTrip, hasSupabaseCatalogConfig, loadTripCatalog, type TripCatalog } from "./services/tripCatalogService";
import {
  createNotification,
  deleteNotification,
  getMyNotifications,
  markNotificationAsRead,
  type NotificationRecord
} from "./services/notificationService";
import {
  addTripToFavorites,
  getMyFavoriteTrips,
  removeTripFromFavorites
} from "./services/tripFavoriteService";
import {
  acceptTripInvitation,
  getMyTripInvitations,
  inviteUserToFavoriteTrip,
  rejectTripInvitation,
  type TripInvitation
} from "./services/tripInvitationService";
import {
  addConversationMember,
  addTripParticipant,
  acceptJoinRequest,
  expressInterestInCatalogTrip,
  ensureTripConversation,
  getConversationMembers,
  getConversationMessages,
  getTripParticipants,
  getUserTripActions,
  requestToJoinTrip,
  rejectJoinRequest,
  sendConversationMessage,
  type UserTripActions
} from "./services/tripSocialService";
import {
  acceptTribeRequest,
  cancelTribeRequest,
  getCompatibleProfiles,
  getMyTribeRequests,
  getTribeMessages,
  rejectTribeRequest,
  sendTribeMessage,
  sendTribeRequest,
  type TribeConnection,
  type TribeMessage,
  type TribeRequestBundle
} from "./services/tribeService";
import { uploadProfileAvatar, validateProfileAvatarFile } from "./services/profileService";
import type { Activity, MockLocalActivity, OnboardingProfile, Trip, UserProfile } from "./types";

type Page = "landing" | "dashboard" | "create-trip" | "trip" | "conversation" | "communaute" | "profil" | "prestataires" | "securite";
type CommunityTab = "compatibles" | "tribe" | "requests";

type Conversation = {
  id: string;
  trip: Trip;
  participants: UserProfile[];
  createdAt: string;
  messages: {
    id: string;
    authorId?: string;
    author: string;
    content: string;
    time: string;
    system?: boolean;
  }[];
};

const navItems: { page: Page; label: string }[] = [
  { page: "dashboard", label: "Explorer" },
  { page: "communaute", label: "Tribu" },
  { page: "profil", label: "Profil" }
];

const onboardingSteps = [
  { title: "Tes disponibilités", key: "availability", type: "calendar" },
  { title: "Tes filtres", key: "filters", type: "filters" },
  { title: "Préférence destination", key: "destinationZones", type: "destination" },
  { title: "Ton budget", key: "budget", options: ["Moins de 100 €", "100 à 200 €", "200 à 350 €", "350 à 500 €", "Flexible"] },
  { title: "Ton niveau physique", key: "level", options: ["Très facile", "Facile", "Intermédiaire", "Sportif", "Je ne sais pas"] },
  {
    title: "L'ambiance recherchée",
    key: "ambience",
    type: "ambience",
    multi: true,
    options: ["Calme & déconnexion", "Sport & dépassement", "Découverte locale", "Fun & aventure douce", "Spirituel & introspectif", "Premium & confort"]
  },
  { title: "Le type de nature", key: "nature", options: ["Montagne", "Forêt", "Rivière", "Campagne", "Mer", "Vallée", "Peu importe"] },
  { title: "Ton confort idéal", key: "comfort", options: ["Tente", "Refuge", "Gîte", "Hôtel simple", "Peu importe"] }
];

const pageHero = "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1800&q=80";

const ambienceCards = [
  {
    title: "Calme & déconnexion",
    text: "Marcher, respirer, admirer les paysages, sans pression sportive.",
    image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80",
    examples: ["balade douce", "paysages", "silence"]
  },
  {
    title: "Sport & dépassement",
    text: "Bouger, transpirer, se dépasser avec un groupe motivé.",
    image: "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=900&q=80",
    examples: ["randonnée intense", "trail", "bivouac"]
  },
  {
    title: "Découverte locale",
    text: "Explorer un territoire, ses villages, ses producteurs et ses traditions.",
    image: "https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=900&q=80",
    examples: ["ferme", "marché", "artisanat"]
  },
  {
    title: "Fun & aventure douce",
    text: "Des activités accessibles mais vivantes, pour partager un vrai moment.",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    examples: ["canoë", "rafting doux", "jeux de groupe"]
  },
  {
    title: "Spirituel & introspectif",
    text: "Calme, marche lente, temps personnel et ambiance respectueuse.",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80",
    examples: ["marche lente", "pauses", "nature"]
  },
  {
    title: "Premium & confort",
    text: "Nature, bons repas, hébergement confortable et peu de contraintes.",
    image: "https://images.unsplash.com/photo-1501117716987-c8e1ecb210bf?auto=format&fit=crop&w=900&q=80",
    examples: ["gîte", "bon repas", "organisation fluide"]
  }
];

const calendarMonth = {
  label: "Juin 2026",
  weekdays: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
  days: Array.from({ length: 30 }, (_, index) => {
    const day = index + 1;
    return {
      date: `2026-06-${String(day).padStart(2, "0")}`,
      day,
      disabled: day < 23
    };
  })
};

const filterGroups = [
  {
    title: "Profil du groupe",
    options: ["18-25", "25-35", "35-45", "45+", "Groupe mixte", "Groupe women-only", "Groupe homme uniquement", "Petit groupe : 3 à 5 personnes", "Groupe moyen : 6 à 8 personnes", "Grand groupe : 9 personnes et plus"]
  },
  {
    title: "Type de destination",
    options: ["Montagne", "Forêt", "Mer", "Campagne", "Rivière", "Lac", "Parc naturel", "Village / patrimoine local", "Destination dépaysante"]
  },
  {
    title: "Filtres sociaux",
    options: ["Ambiance calme", "Ambiance sportive", "Découverte locale", "Fun", "Contemplatif", "Premium/confort", "Débutant", "Très encadré", "Autonome"]
  },
  {
    title: "Préférences personnelles",
    options: ["Même pratique religieuse", "Groupe calme et respectueux", "Pauses personnelles respectées", "Valeurs similaires", "Groupe women-only"]
  }
];

type ResultFilterKey = "localisation" | "dates" | "budget" | "destination" | "type" | "ambiance" | "groupe" | "niveau" | "plus";

const resultFilterButtons: { key: ResultFilterKey; label: string }[] = [
  { key: "localisation", label: "Localisation" },
  { key: "dates", label: "Dates" },
  { key: "budget", label: "Budget" },
  { key: "destination", label: "Destination" },
  { key: "ambiance", label: "Ambiance" },
  { key: "groupe", label: "Groupe" },
  { key: "niveau", label: "Niveau" },
  { key: "plus", label: "Plus de filtres" }
];

const moreFilterGroups = [
  {
    title: "Alimentation",
    options: ["Repas halal souhaité", "Repas végétarien souhaité", "Repas sans alcool", "Allergies / restrictions alimentaires à respecter", "Repas local", "Repas simple / économique"]
  },
  {
    title: "Ambiance de groupe",
    options: ["Groupe calme et respectueux", "Petit groupe", "Groupe sociable", "Groupe mixte accepté", "Groupe non mixte souhaité", "Rythme tranquille", "Rythme sportif"]
  },
  {
    title: "Valeurs et pratiques personnelles",
    options: ["Valeurs similaires", "Pratique religieuse similaire", "Pauses personnelles respectées", "Temps de prière / pause spirituelle respecté", "Respect de la pudeur et de l'intimité", "Pas d'alcool dans le groupe"]
  },
  {
    title: "Hébergement",
    options: ["Hébergement simple", "Gîte / refuge", "Hôtel confortable", "Tente / bivouac", "Chambre partagée acceptée", "Chambre individuelle souhaitée"]
  },
  {
    title: "Sécurité et confiance",
    options: ["Sécurité renforcée", "Profils vérifiés uniquement", "Groupe avec organisateur identifié", "Expérience encadrée par professionnel", "Niveau physique cohérent", "Plan B météo prévu"]
  },
  {
    title: "Organisation",
    options: ["Dates flexibles", "Budget flexible", "Transport partagé", "Départ depuis ma ville", "Organisation collective", "Trip déjà planifié"]
  }
];

const resultFilterOptions: Record<Exclude<ResultFilterKey, "dates" | "destination">, string[]> = {
  localisation: ["Départ Bordeaux", "Départ Paris", "Départ Lyon", "Départ Toulouse", "30 km max", "100 km max", "300 km max"],
  budget: ["Moins de 100 €", "100 à 200 €", "200 à 350 €", "350 à 500 €", "500 € et plus"],
  type: ["Tous", "Idées de voyage", "Projets utilisateurs"],
  ambiance: ["Calme & déconnexion", "Sport & dépassement", "Découverte locale", "Fun & aventure douce", "Contemplatif", "Premium & confort", "Spirituel / introspectif"],
  groupe: ["18-25", "25-35", "35-45", "45+", "Groupe mixte", "Groupe women-only", "Groupe homme uniquement", "Petit groupe : 3 à 5 personnes", "Groupe moyen : 6 à 8 personnes", "Grand groupe : 9 personnes et plus"],
  niveau: ["Débutant", "Intermédiaire", "Sportif", "Très encadré", "Autonome", "Activités à faible risque", "Activités encadrées par un professionnel"],
  plus: moreFilterGroups.flatMap((group) => group.options)
};

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const franceRegionsGeoUrl = "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions.geojson";

const selectableCountries: Record<string, string> = {
  France: "France",
  Spain: "Espagne",
  Switzerland: "Suisse",
  Italy: "Italie",
  Portugal: "Portugal",
  Germany: "Allemagne",
  Belgium: "Belgique",
  Netherlands: "Pays-Bas",
  Ireland: "Irlande",
  "United Kingdom": "Royaume-Uni",
  Greece: "Grèce"
};

const franceRegions = [
  { name: "Auvergne-Rhône-Alpes", hint: "Alpes, Vercors, Chartreuse", coordinates: [4.7, 45.4] },
  { name: "Bourgogne-Franche-Comté", hint: "Villages, vignobles, lacs", coordinates: [5.0, 47.2] },
  { name: "Bretagne", hint: "Littoral, îles, sentiers", coordinates: [-2.9, 48.1] },
  { name: "Centre-Val de Loire", hint: "Loire, forêts, patrimoine", coordinates: [1.8, 47.5] },
  { name: "Corse", hint: "Montagne, mer, dépaysement", coordinates: [9.1, 42.1] },
  { name: "Grand Est", hint: "Vosges, villages, forêts", coordinates: [5.9, 48.7] },
  { name: "Hauts-de-France", hint: "Côte d'Opale, campagne", coordinates: [2.8, 50.1] },
  { name: "Île-de-France", hint: "Forêts, micro-aventures, patrimoine", coordinates: [2.4, 48.7] },
  { name: "Normandie", hint: "Littoral, campagne, falaises", coordinates: [0.1, 49.1] },
  { name: "Nouvelle-Aquitaine", hint: "Pyrénées, Pays basque, Dordogne", coordinates: [-0.3, 45.2] },
  { name: "Occitanie", hint: "Pyrénées, Cévennes, villages", coordinates: [2.3, 43.8] },
  { name: "Pays de la Loire", hint: "Loire, océan, nature douce", coordinates: [-0.8, 47.4] },
  { name: "Provence-Alpes-Côte d'Azur", hint: "Alpes du Sud, mer, villages", coordinates: [6.1, 43.9] }
] satisfies { name: string; hint: string; coordinates: [number, number] }[];

type CountryRegionCatalog = Record<
  string,
  {
    center: [number, number];
    zoom: number;
    regions: { name: string; hint: string }[];
  }
>;

const countryRegionCatalog: CountryRegionCatalog = {
  France: {
    center: [2.2, 46.8],
    zoom: 2.7,
    regions: franceRegions.map(({ name, hint }) => ({ name, hint }))
  },
  Espagne: {
    center: [-3.7, 40.2],
    zoom: 2.9,
    regions: [
      { name: "Espagne du Nord", hint: "Côte, montagnes, villages" },
      { name: "Catalogne", hint: "Pyrénées, mer, culture locale" },
      { name: "Aragon", hint: "Pyrénées, canyons, villages" },
      { name: "Navarre", hint: "Montagne douce, forêts" },
      { name: "Pays basque espagnol", hint: "Côte, montagnes, gastronomie" },
      { name: "Andalousie", hint: "Villages, parcs naturels, soleil" }
    ]
  },
  Italie: {
    center: [12.4, 42.9],
    zoom: 2.7,
    regions: [
      { name: "Italie du Nord", hint: "Lacs, Alpes, villages" },
      { name: "Piémont", hint: "Alpes, collines, gastronomie" },
      { name: "Lombardie", hint: "Lacs, montagne, villes culturelles" },
      { name: "Toscane", hint: "Campagne, villages, art de vivre" },
      { name: "Trentin-Haut-Adige", hint: "Dolomites, randonnée, lacs" },
      { name: "Ligurie", hint: "Mer, sentiers, villages colorés" }
    ]
  },
  Suisse: {
    center: [8.2, 46.8],
    zoom: 4.2,
    regions: [
      { name: "Suisse romande", hint: "Lacs, montagnes, villes douces" },
      { name: "Valais", hint: "Alpes, vallées, glaciers" },
      { name: "Vaud", hint: "Léman, vignobles, villages" },
      { name: "Grisons", hint: "Haute montagne, lacs, nature" },
      { name: "Tessin", hint: "Lacs, soleil, ambiance italienne" },
      { name: "Berne", hint: "Oberland, lacs, sommets" }
    ]
  },
  Allemagne: {
    center: [10.4, 51.0],
    zoom: 3,
    regions: [
      { name: "Bavière", hint: "Alpes, lacs, villages" },
      { name: "Bade-Wurtemberg", hint: "Forêt-Noire, vignobles, thermes" },
      { name: "Forêt-Noire", hint: "Forêts, sentiers, villages" },
      { name: "Rhénanie", hint: "Vallées, patrimoine, vignobles" },
      { name: "Saxe", hint: "Parcs naturels, villes culturelles" },
      { name: "Berlin-Brandenburg", hint: "Lacs, forêts, micro-aventures" }
    ]
  },
  Portugal: {
    center: [-8.0, 39.7],
    zoom: 3.5,
    regions: [
      { name: "Nord du Portugal", hint: "Montagnes, vallées, villages" },
      { name: "Centre du Portugal", hint: "Forêts, rivières, patrimoine" },
      { name: "Lisbonne et côte", hint: "Océan, falaises, villes" },
      { name: "Alentejo", hint: "Campagne, villages, ciel ouvert" },
      { name: "Algarve", hint: "Falaises, plages, sentiers" }
    ]
  },
  Belgique: {
    center: [4.6, 50.6],
    zoom: 5,
    regions: [
      { name: "Ardennes belges", hint: "Forêts, rivières, villages" },
      { name: "Wallonie", hint: "Campagne, patrimoine, nature" },
      { name: "Flandre", hint: "Villes, canaux, côte" },
      { name: "Bruxelles et alentours", hint: "Culture, parcs, sorties faciles" }
    ]
  },
  "Pays-Bas": {
    center: [5.4, 52.2],
    zoom: 4.5,
    regions: [
      { name: "Zélande", hint: "Mer, dunes, vélo" },
      { name: "Frise", hint: "Lacs, îles, grand air" },
      { name: "Hollande du Nord", hint: "Dunes, plages, villages" },
      { name: "Gueldre", hint: "Forêts, parcs, châteaux" }
    ]
  },
  Irlande: {
    center: [-8.0, 53.3],
    zoom: 3.7,
    regions: [
      { name: "Wild Atlantic Way", hint: "Falaises, océan, villages" },
      { name: "Connemara", hint: "Lacs, montagnes, grands espaces" },
      { name: "Dublin et Wicklow", hint: "Montagnes proches, culture" },
      { name: "Cork et Kerry", hint: "Péninsules, mer, randonnée" }
    ]
  },
  "Royaume-Uni": {
    center: [-2.8, 54.3],
    zoom: 3.2,
    regions: [
      { name: "Écosse", hint: "Highlands, lochs, nature brute" },
      { name: "Pays de Galles", hint: "Montagnes, côte, villages" },
      { name: "Lake District", hint: "Lacs, randonnée, cottages" },
      { name: "Angleterre du Sud-Ouest", hint: "Côte, falaises, villages" }
    ]
  },
  Grèce: {
    center: [22.5, 39.0],
    zoom: 3.1,
    regions: [
      { name: "Crète", hint: "Montagne, mer, culture" },
      { name: "Cyclades", hint: "Îles, villages, mer" },
      { name: "Péloponnèse", hint: "Patrimoine, plages, montagnes" },
      { name: "Épire", hint: "Gorges, villages, randonnée" }
    ]
  }
};

function getValidatedTripMembers(tripId: string) {
  const validatedByTrip: Record<string, string[]> = {
    aspe: ["sarah", "amine", "lea", "nora"],
    fontainebleau: ["sarah", "amine", "nora"],
    vercors: ["amine", "lea"],
    dordogne: ["sarah", "lea", "nora"],
    "pays-basque": ["sarah", "amine", "lea"]
  };

  const ids = validatedByTrip[tripId] ?? ["sarah", "amine"];
  return members.filter((member) => ids.includes(member.id));
}

function getTripMembers(trip: Trip) {
  if (trip.matched_member_ids?.length) {
    return trip.matched_member_ids
      .map((id) => mockMembers.find((member) => member.id === id))
      .filter(Boolean)
      .map((member) => mockMemberToUserProfile(member!));
  }

  return getValidatedTripMembers(trip.id);
}

function mockMemberToUserProfile(member: (typeof mockMembers)[number]): UserProfile {
  return {
    id: member.id,
    name: member.name,
    age_range: member.age,
    city: member.city,
    photo_url: member.photo,
    bio: `Envie de ${member.preferred_nature.join(", ").toLowerCase()} dans une ambiance ${member.preferred_ambience.join(", ").toLowerCase()}.`,
    verified: member.trust_badges.some((badge) => badge.includes("vérifié")),
    physical_level: member.physical_level,
    budget_range: member.budget,
    adventure_style: member.preferred_ambience[0] ?? "Nature",
    preferred_ambiences: member.preferred_ambience,
    safety_preferences: member.trust_badges,
    past_trips: member.trust_badges.some((badge) => badge.includes("3 Trips")) ? 3 : 1,
    badges: member.trust_badges
  };
}

function profileRecordToUserProfile(profile: UserProfileRecord): UserProfile {
  return {
    id: profile.id,
    name: profile.display_name,
    age_range: profile.age_range ?? "Membre",
    city: profile.city ?? "Ville à préciser",
    photo_url: profile.avatar_url ?? "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=80",
    bio: profile.bio ?? "Profil Tribu Nature en construction.",
    verified: Boolean(profile.verified ?? true),
    physical_level: profile.physical_level ?? "À préciser",
    budget_range: profile.budget_range ?? "À préciser",
    adventure_style: profile.adventure_style ?? "Nature",
    preferred_ambiences: profile.preferred_ambiences?.length ? profile.preferred_ambiences : ["Nature", "Découverte locale"],
    safety_preferences: profile.safety_preferences?.length ? profile.safety_preferences : ["Profil connecté"],
    past_trips: profile.past_trips ?? 0,
    badges: profile.badges?.length ? profile.badges : ["profil connecté"]
  };
}

function fallbackProfileRecord(profileId: string): UserProfileRecord {
  return {
    id: profileId,
    email: null,
    display_name: "Profil Tribu",
    avatar_url: null,
    city: null,
    bio: "Ce profil est en cours de chargement. Les informations publiques apparaîtront ici dès qu'elles seront disponibles.",
    age_range: "Membre",
    verified: true,
    physical_level: "À préciser",
    budget_range: "À préciser",
    adventure_style: "Nature",
    preferred_ambiences: ["Nature", "Découverte locale"],
    safety_preferences: ["Profil connecté"],
    past_trips: 0,
    badges: ["profil connecté"]
  };
}

function getTripCardType(trip: Trip) {
  return trip.card_type ?? (trip.community ? "user_project" : "catalog");
}

function isTripPubliclyVisible(trip: Trip) {
  return (trip.visibility ?? "public") === "public" && (trip.moderation_status ?? "approved") === "approved";
}

function getTripTypeLabel(trip: Trip) {
  return getTripCardType(trip) === "user_project" ? "Projet utilisateur" : "Idée de voyage";
}

function getTripContextText(trip: Trip) {
  if (getTripCardType(trip) === "user_project") {
    return `Proposé par ${trip.creator_name ?? trip.created_by ?? "un membre"}`;
  }

  return "À organiser ensemble";
}

function getTripActionLabel(trip: Trip, actionState?: string) {
  if (actionState === "interested") return "Tu es intéressé";
  if (actionState === "pending") return "Demande envoyée";
  if (actionState === "accepted" || actionState === "participant") return "Conversation ouverte";
  return getTripCardType(trip) === "user_project" ? "Demander à rejoindre" : "Rejoindre les intéressés";
}

function getTripActionState(trip: Trip, userTripActions: UserTripActions | null) {
  if (!userTripActions) return undefined;

  if (getTripCardType(trip) === "catalog") {
    return userTripActions.interests.some((interest) => interest.trip_id === trip.id && interest.status === "interested") ? "interested" : undefined;
  }

  if (userTripActions.participants.some((participant) => participant.trip_id === trip.id && participant.status === "active")) return "participant";
  return userTripActions.joinRequests.find((request) => request.trip_id === trip.id)?.status;
}

function getTripDateLabel(trip: Trip) {
  return getTripCardType(trip) === "catalog" ? "Dates à décider ensemble" : trip.dates;
}

function getTripConversationType(trip: Trip) {
  return getTripCardType(trip) === "catalog" ? "catalog_interest" : "user_project";
}

function getTripConversationId(trip: Trip) {
  return `${getTripConversationType(trip)}-${trip.id}`;
}

function formatConversationTime(value?: string) {
  if (!value) return "maintenant";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return "maintenant";
  }
}

function getTripDurationLabel(trip: Trip) {
  return getTripCardType(trip) === "catalog" ? `Durée suggérée : ${trip.duration}` : trip.duration;
}

function getPlanningStatusLabel(status: Trip["planning_status"]) {
  const labels: Record<NonNullable<Trip["planning_status"]>, string> = {
    idea: "Idée à co-construire",
    forming_group: "Groupe en formation",
    planned: "Départ en préparation",
    confirmed: "Départ confirmé",
    cancelled: "Annulé"
  };

  return labels[status ?? "idea"];
}

const tribeExtraMembers: UserProfile[] = [
  {
    id: "sofia-tribe",
    name: "Sofia",
    age_range: "28 ans",
    city: "Bordeaux",
    photo_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=700&q=80",
    bio: "J'aime les week-ends nature, les randonnées accessibles et les repas locaux en petit groupe.",
    verified: true,
    physical_level: "intermédiaire",
    budget_range: "200 à 350 €",
    adventure_style: "Calme & déconnexion",
    preferred_ambiences: ["Calme & déconnexion", "Montagne", "Découverte locale"],
    safety_preferences: ["Petit groupe", "Profils vérifiés", "Groupe calme et respectueux"],
    past_trips: 4,
    badges: ["profil vérifié", "petit groupe", "découverte locale"]
  },
  {
    id: "yassine-tribe",
    name: "Yassine",
    age_range: "30 ans",
    city: "Bordeaux",
    photo_url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=700&q=80",
    bio: "Toujours partant pour une randonnée, un marché local et une ambiance simple sans pression.",
    verified: true,
    physical_level: "facile/intermédiaire",
    budget_range: "100 à 200 €",
    adventure_style: "Nature calme",
    preferred_ambiences: ["Montagne", "Week-end", "Repas local"],
    safety_preferences: ["Groupe mixte", "Activités encadrées"],
    past_trips: 2,
    badges: ["fiable", "rythme doux", "nature"]
  },
  {
    id: "emma-tribe",
    name: "Emma",
    age_range: "26 ans",
    city: "Lyon",
    photo_url: "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=700&q=80",
    bio: "J'aime les Alpes, les gîtes confortables et les aventures bien organisées avec des profils respectueux.",
    verified: true,
    physical_level: "sportif",
    budget_range: "350 à 500 €",
    adventure_style: "Sport & dépassement",
    preferred_ambiences: ["Alpes", "Sport & dépassement", "Premium & confort"],
    safety_preferences: ["Profils vérifiés", "Activités encadrées", "Valeurs similaires"],
    past_trips: 6,
    badges: ["profil vérifié", "sport", "avis 4.8"]
  },
  {
    id: "ines-tribe",
    name: "Inès",
    age_range: "33 ans",
    city: "Toulouse",
    photo_url: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=700&q=80",
    bio: "Plutôt villages, producteurs, balades tranquilles et discussions autour d'un bon repas.",
    verified: false,
    physical_level: "facile",
    budget_range: "200 à 350 €",
    adventure_style: "Découverte locale",
    preferred_ambiences: ["Découverte locale", "Campagne", "Village"],
    safety_preferences: ["Pauses personnelles respectées", "Petit groupe"],
    past_trips: 1,
    badges: ["nouvelle", "local", "slow travel"]
  }
];

function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [selectedTripId, setSelectedTripId] = useState("aspe");
  const [menuOpen, setMenuOpen] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [communityTrips, setCommunityTrips] = useState<Trip[]>([]);
  const [tripMemberProfiles, setTripMemberProfiles] = useState<Record<string, UserProfile[]>>({});
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [currentProfile, setCurrentProfile] = useState<UserProfileRecord | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [viewedProfile, setViewedProfile] = useState<UserProfileRecord | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authPrompt, setAuthPrompt] = useState("Connecte-toi pour accéder aux actions sociales de Tribu Nature.");
  const [userTripActions, setUserTripActions] = useState<UserTripActions | null>(null);
  const [favoriteTripIds, setFavoriteTripIds] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [tribeProfiles, setTribeProfiles] = useState<UserProfileRecord[]>([]);
  const [tribeRequests, setTribeRequests] = useState<TribeRequestBundle>({ received: [], sent: [], accepted: [] });
  const [tripInvitations, setTripInvitations] = useState<TripInvitation[]>([]);
  const [createTripSeed, setCreateTripSeed] = useState<Trip | null>(null);
  const [shareTrip, setShareTrip] = useState<Trip | null>(null);
  const [communityInitialTab, setCommunityInitialTab] = useState<CommunityTab>("compatibles");
  const [tribeUnreadMessageCount, setTribeUnreadMessageCount] = useState(0);
  const [initialTripLinkHandled, setInitialTripLinkHandled] = useState(false);
  const [socialNotice, setSocialNotice] = useState("");
  const [catalogLoaded, setCatalogLoaded] = useState(!hasSupabaseCatalogConfig());
  const [catalog, setCatalog] = useState<TripCatalog>(() => ({
    trips: localTrips,
    activities: localActivities,
    source: "local"
  }));

  useEffect(() => {
    let mounted = true;

    const loadAuth = async () => {
      if (!hasSupabaseAuthConfig()) {
        setAuthLoading(false);
        return;
      }

      try {
        const session = await getStoredSession();
        if (!mounted) return;
        setAuthSession(session);

        if (session) {
          const profile = await getCurrentProfile(session);
          if (mounted) setCurrentProfile(profile);
        }
      } catch (error) {
        console.warn("Session utilisateur indisponible.", error);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    loadAuth();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasSupabaseCatalogConfig()) {
      setCatalogLoaded(true);
      return;
    }

    let mounted = true;
    loadTripCatalog()
      .then((nextCatalog) => {
        if (mounted) setCatalog(nextCatalog);
      })
      .finally(() => {
        if (mounted) setCatalogLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const refreshSocialData = async (session: AuthSession) => {
    try {
      const [actions, favorites, nextNotifications, profiles, requests, invitations] = await Promise.all([
        getUserTripActions(session.user.id, session.access_token),
        getMyFavoriteTrips(session.user.id, session.access_token),
        getMyNotifications(session.user.id, session.access_token),
        getCompatibleProfiles(session.user.id, session.access_token),
        getMyTribeRequests(session.user.id, session.access_token),
        getMyTripInvitations(session.user.id, session.access_token)
      ]);

      setUserTripActions(actions);
      setFavoriteTripIds(favorites.map((favorite) => favorite.trip_id));
      setNotifications(nextNotifications);
      setTribeProfiles(profiles);
      setTribeRequests(requests);
      setTripInvitations(invitations);

      try {
        const unreadTribeMessages = await getUnreadTribeMessageCount(session.user.id, requests.accepted, session.access_token);
        setTribeUnreadMessageCount(unreadTribeMessages);
      } catch (error) {
        console.warn("Compteur de messages Tribu indisponible.", error);
      }
    } catch (error) {
      console.warn("Données sociales indisponibles.", error);
    }
  };

  useEffect(() => {
    if (!authSession) {
      setUserTripActions(null);
      setFavoriteTripIds([]);
      setNotifications([]);
      setTribeProfiles([]);
      setTribeRequests({ received: [], sent: [], accepted: [] });
      setTripInvitations([]);
      setTribeUnreadMessageCount(0);
      return;
    }

    let mounted = true;
    refreshSocialData(authSession)
      .then(() => {
        if (!mounted) return;
      })
      .catch((error) => console.warn("Actions utilisateur indisponibles.", error));

    return () => {
      mounted = false;
    };
  }, [authSession]);

  useEffect(() => {
    if (!authSession) return;

    const refresh = () => {
      refreshSocialData(authSession);
    };
    const interval = window.setInterval(refresh, 15_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [authSession]);

  useEffect(() => {
    if (!selectedProfileId) {
      setViewedProfile(null);
      return;
    }

    const knownProfile = [currentProfile, ...tribeProfiles].find((profile) => profile?.id === selectedProfileId) ?? null;
    if (knownProfile) {
      setViewedProfile(knownProfile);
      return;
    }

    if (!authSession) {
      setViewedProfile(fallbackProfileRecord(selectedProfileId));
      return;
    }

    let mounted = true;
    setViewedProfile(fallbackProfileRecord(selectedProfileId));

    getProfileById(selectedProfileId, authSession.access_token)
      .then((profile) => {
        if (mounted) setViewedProfile(profile ?? fallbackProfileRecord(selectedProfileId));
      })
      .catch((error) => {
        console.warn("Profil distant indisponible.", error);
        if (mounted) setViewedProfile(fallbackProfileRecord(selectedProfileId));
      });

    return () => {
      mounted = false;
    };
  }, [authSession, currentProfile, selectedProfileId, tribeProfiles]);

  const visibleCatalogTrips = catalog.trips.filter(isTripPubliclyVisible);
  const availableTrips = [...communityTrips, ...visibleCatalogTrips];
  const favoriteTrips = availableTrips.filter((trip) => favoriteTripIds.includes(trip.id));
  const selectedTrip = availableTrips.find((trip) => trip.id === selectedTripId) ?? availableTrips[0] ?? catalog.trips[0];
  const currentUser = currentProfile ? profileRecordToUserProfile(currentProfile) : members[0];
  const isAuthenticated = Boolean(authSession && currentProfile);
  const pendingReceivedJoinRequests = userTripActions?.joinRequests.filter((request) => request.creator_id === currentProfile?.id && request.status === "pending") ?? [];
  const notifiedJoinRequestIds = new Set(
    notifications
      .filter((notification) => notification.type === "join_request_received" && notification.related_request_id)
      .map((notification) => notification.related_request_id)
  );
  const pendingReceivedJoinRequestsWithoutNotification = pendingReceivedJoinRequests.filter((request) => !notifiedJoinRequestIds.has(request.id));
  const unreadNotificationCount = notifications.filter((notification) => !notification.read_at).length + pendingReceivedJoinRequestsWithoutNotification.length;
  const profilePageRecord = selectedProfileId ? viewedProfile ?? fallbackProfileRecord(selectedProfileId) : currentProfile;
  const profilePageUser = profilePageRecord ? profileRecordToUserProfile(profilePageRecord) : currentUser;
  const isOwnProfilePage = !selectedProfileId || selectedProfileId === currentProfile?.id;
  const validatedMembers = tripMemberProfiles[selectedTrip.id] ?? getTripMembers(selectedTrip);
  const acceptedTribeMemberIds = useMemo(() => new Set(
    tribeRequests.accepted.map((request) => request.requester_id === currentUser.id ? request.receiver_id : request.requester_id)
  ), [currentUser.id, tribeRequests.accepted]);
  const tribeShareMembers = useMemo(
    () => tribeProfiles
      .filter((profile) => acceptedTribeMemberIds.has(profile.id))
      .map(profileRecordToUserProfile),
    [acceptedTribeMemberIds, tribeProfiles]
  );
  const getAcceptedTribeConnection = (memberId: string) => tribeRequests.accepted.find((request) =>
    (request.requester_id === currentUser.id && request.receiver_id === memberId) ||
    (request.receiver_id === currentUser.id && request.requester_id === memberId)
  );
  const getKnownProfileRecord = (profileId?: string | null) => {
    if (!profileId) return null;
    return [currentProfile, ...tribeProfiles].find((profile) => profile?.id === profileId) ?? null;
  };
  useEffect(() => {
    if (initialTripLinkHandled || availableTrips.length === 0 || typeof window === "undefined") return;

    const sharedTripId = new URLSearchParams(window.location.search).get("trip") ?? window.location.hash.match(/trip-([^&]+)/)?.[1] ?? "";
    if (!sharedTripId) {
      setInitialTripLinkHandled(true);
      return;
    }

    const sharedTrip = availableTrips.find((trip) => trip.id === sharedTripId);
    if (!sharedTrip && !catalogLoaded) return;

    if (sharedTrip) {
      setSelectedTripId(sharedTrip.id);
      setPage("trip");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    setInitialTripLinkHandled(true);
  }, [availableTrips, catalogLoaded, initialTripLinkHandled]);
  const go = (next: Page, options?: { keepSelectedProfile?: boolean }) => {
    if (next !== "profil" || !options?.keepSelectedProfile) {
      setSelectedProfileId(null);
    }
    setPage(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openTrip = (id: string) => {
    setSelectedTripId(id);
    go("trip");
  };
  const openTripFromProfile = async (trip: Trip, shouldOpenConversation: boolean) => {
    if (shouldOpenConversation) {
      await openTripConversation(trip, getTripConversationId(trip));
      return;
    }

    openTrip(trip.id);
  };
  const openProfile = (profileId?: string | null) => {
    setSelectedProfileId(profileId && profileId !== currentProfile?.id ? profileId : null);
    setNotificationsOpen(false);
    go("profil", { keepSelectedProfile: true });
  };
  const openTribeInbox = () => {
    if (currentProfile?.id) markTribeMessagesSeen(currentProfile.id);
    setCommunityInitialTab("tribe");
    setTribeUnreadMessageCount(0);
    setNotificationsOpen(false);
    go("communaute");
  };
  const loadTripMembers = async (trip: Trip, session = authSession) => {
    if (!session) return;

    try {
      const conversationId = getTripConversationId(trip);
      const [participantRows, memberRows] = await Promise.all([
        getTripParticipants(trip.id, session.access_token).catch(() => []),
        getConversationMembers(conversationId, session.access_token).catch(() => [])
      ]);
      const memberIds = [
        ...participantRows.map((participant) => participant.user_id),
        ...memberRows.map((member) => member.user_id)
      ];
      const uniqueMemberIds = [...new Set(memberIds)].filter(Boolean);

      if (uniqueMemberIds.length === 0) {
        setTripMemberProfiles((prev) => ({ ...prev, [trip.id]: getTripMembers(trip) }));
        return;
      }

      const remoteProfiles = await getProfilesByIds(uniqueMemberIds, session.access_token);
      const knownProfiles = [currentProfile, ...tribeProfiles, ...remoteProfiles].filter(Boolean) as UserProfileRecord[];
      const profileById = new Map(knownProfiles.map((profile) => [profile.id, profile]));
      const nextMembers = uniqueMemberIds.map((id) => profileRecordToUserProfile(profileById.get(id) ?? fallbackProfileRecord(id)));

      setTripMemberProfiles((prev) => ({ ...prev, [trip.id]: nextMembers }));
    } catch (error) {
      console.warn("Membres du Trip indisponibles.", error);
    }
  };
  const openAuthModal = (prompt = "Connecte-toi pour continuer.") => {
    setAuthPrompt(prompt);
    setAuthModalOpen(true);
  };
  useEffect(() => {
    if (!authSession || !selectedTrip?.id) return;
    loadTripMembers(selectedTrip, authSession);
  }, [authSession, selectedTrip.id, userTripActions]);

  const handleAuthSuccess = async (session: AuthSession) => {
    const profile = await getCurrentProfile(session);
    setAuthSession(session);
    setCurrentProfile(profile);
    await refreshSocialData(session);
    setAuthModalOpen(false);
  };
  const handleSignOut = async () => {
    await signOut(authSession?.access_token);
    setAuthSession(null);
    setCurrentProfile(null);
    setSelectedProfileId(null);
    setViewedProfile(null);
    setUserTripActions(null);
    setFavoriteTripIds([]);
    setNotifications([]);
    setNotificationsOpen(false);
    setTribeProfiles([]);
    setTribeRequests({ received: [], sent: [], accepted: [] });
    setTripInvitations([]);
    setTribeUnreadMessageCount(0);
    setSocialNotice("");
  };
  const requireAuth = (prompt: string) => {
    if (authSession && currentProfile) return authSession;
    openAuthModal(prompt);
    return null;
  };
  const updateProfileFlow = async (updates: UserProfileUpdate) => {
    const session = requireAuth("Connecte-toi pour modifier ton profil.");
    if (!session || !currentProfile) throw new Error("Connexion nécessaire pour modifier le profil.");

    const nextProfile = await updateProfile(currentProfile.id, updates, session.access_token);
    setCurrentProfile(nextProfile);
    setTribeProfiles((prev) => prev.map((profile) => profile.id === nextProfile.id ? nextProfile : profile));
    if (!selectedProfileId || selectedProfileId === nextProfile.id) {
      setViewedProfile(nextProfile);
    }
    setSocialNotice("Profil mis à jour.");
    return nextProfile;
  };
  const uploadProfileAvatarFlow = async (file: File) => {
    const session = requireAuth("Connecte-toi pour modifier ta photo de profil.");
    if (!session || !currentProfile) throw new Error("Connexion nécessaire pour modifier la photo.");

    const uploadedAvatar = await uploadProfileAvatar(currentProfile.id, file, session.access_token);
    const nextProfile = await updateProfile(currentProfile.id, uploadedAvatar, session.access_token);
    setCurrentProfile(nextProfile);
    setTribeProfiles((prev) => prev.map((profile) => profile.id === nextProfile.id ? nextProfile : profile));
    if (!selectedProfileId || selectedProfileId === nextProfile.id) {
      setViewedProfile(nextProfile);
    }
    setSocialNotice("Photo de profil mise à jour.");
    return nextProfile;
  };
  const refreshUserTripActions = async (session: AuthSession) => {
    await refreshSocialData(session);
  };
  const toggleTripFavorite = async (trip: Trip) => {
    const session = requireAuth("Connecte-toi pour sauvegarder un Trip dans tes favoris.");
    if (!session) return;

    const alreadyFavorite = favoriteTripIds.includes(trip.id);
    try {
      if (alreadyFavorite) {
        await removeTripFromFavorites(trip.id, session.user.id, session.access_token);
        setFavoriteTripIds((prev) => prev.filter((id) => id !== trip.id));
        setSocialNotice("Trip retiré de tes favoris.");
      } else {
        await addTripToFavorites(trip.id, session.user.id, session.access_token);
        setFavoriteTripIds((prev) => Array.from(new Set([...prev, trip.id])));
        setSocialNotice("Trip ajouté à tes favoris.");
      }
    } catch (error) {
      console.error("Favori impossible.", error);
      setSocialNotice(error instanceof Error ? error.message : "Impossible de modifier ce favori.");
    }
  };
  const sendFavoriteTripInvitation = async (trip: Trip, member: UserProfile) => {
    const session = requireAuth("Connecte-toi pour inviter un membre à un Trip favori.");
    if (!session || !currentProfile) return;

    try {
      await inviteUserToFavoriteTrip(trip.id, member.id, session.user.id, session.access_token);
      await createNotification({
        user_id: member.id,
        type: "trip_invitation_received",
        title: `${currentProfile.display_name} t'a invité à rejoindre un Trip`,
        body: `${currentProfile.display_name} t'a invité à rejoindre "${trip.title}".`,
        related_trip_id: trip.id,
        related_user_id: session.user.id
      }, session.access_token);
      setSocialNotice(`Invitation envoyée à ${member.name} pour ${trip.title}.`);
      await refreshSocialData(session);
    } catch (error) {
      console.error("Invitation impossible.", error);
      setSocialNotice(error instanceof Error ? error.message : "Impossible d'envoyer cette invitation.");
    }
  };
  const updateTripInvitation = async (invitationId: string, action: "accept" | "reject") => {
    const session = requireAuth("Connecte-toi pour répondre à cette invitation.");
    if (!session || !currentProfile) return;

    const invitation = tripInvitations.find((item) => item.id === invitationId);
    const trip = invitation ? availableTrips.find((item) => item.id === invitation.trip_id) : undefined;
    if (!invitation || !trip) {
      setSocialNotice("Invitation introuvable.");
      return;
    }

    try {
      const updatedInvitation = action === "accept"
        ? await acceptTripInvitation(invitationId, session.access_token)
        : await rejectTripInvitation(invitationId, session.access_token);

      if (action === "accept") {
        if (getTripCardType(trip) === "catalog") {
          await expressInterestInCatalogTrip(trip.id, session.user.id, session.access_token);
          await addTripParticipant(trip.id, session.user.id, session.access_token, "participant").catch((error) => {
            console.warn("Participant catalogue non ajouté depuis l'invitation.", error);
          });
        } else {
          await addTripParticipant(trip.id, session.user.id, session.access_token, "participant").catch((error) => {
            console.warn("Participant non ajouté depuis l'invitation.", error);
          });
        }

        const conversation = await ensureTripConversation(trip.id, getTripCardType(trip) === "catalog" ? "catalog_interest" : "user_project", session.access_token);
        await addConversationMember(conversation.id, session.user.id, session.access_token);
        await addConversationMember(conversation.id, invitation.inviter_id, session.access_token).catch((error) => {
          console.warn("Invitant non ajouté à la conversation.", error);
        });
      }

      await createNotification({
        user_id: invitation.inviter_id,
        type: action === "accept" ? "trip_invitation_accepted" : "trip_invitation_rejected",
        title: action === "accept"
          ? `${currentProfile.display_name} a accepté ton invitation`
          : `${currentProfile.display_name} a répondu à ton invitation`,
        body: action === "accept"
          ? `${currentProfile.display_name} a accepté l'invitation pour "${trip.title}".`
          : `${currentProfile.display_name} n'a pas retenu l'invitation pour "${trip.title}".`,
        related_trip_id: trip.id,
        related_user_id: session.user.id,
        related_request_id: updatedInvitation.id
      }, session.access_token);

      setSocialNotice(action === "accept" ? "Invitation acceptée. Tu as été ajouté à la conversation." : "Invitation refusée.");
      await refreshSocialData(session);
      await loadTripMembers(trip, session);
    } catch (error) {
      console.error("Réponse à l'invitation impossible.", error);
      setSocialNotice(error instanceof Error ? error.message : "Impossible de répondre à cette invitation.");
    }
  };
  const sendTribeConnectionRequest = async (member: UserProfile) => {
    const session = requireAuth("Connecte-toi pour ajouter une personne à ta tribu.");
    if (!session || !currentProfile) return;

    try {
      await sendTribeRequest(member.id, session.user.id, session.access_token);
      await createNotification({
        user_id: member.id,
        type: "friend_request_received",
        title: `${currentProfile.display_name} souhaite t'ajouter à sa tribu`,
        body: "Tu peux accepter ou refuser cette demande depuis ton espace Tribu.",
        related_user_id: session.user.id
      }, session.access_token);
      setSocialNotice(`Demande envoyée à ${member.name}.`);
      await refreshSocialData(session);
    } catch (error) {
      console.error("Demande Tribu impossible.", error);
      setSocialNotice(error instanceof Error ? error.message : "Impossible d'envoyer cette demande.");
    }
  };
  const updateTribeConnection = async (connectionId: string, action: "accept" | "reject" | "cancel") => {
    const session = requireAuth("Connecte-toi pour gérer tes demandes Tribu.");
    if (!session || !currentProfile) return;

    try {
      const connection = action === "accept"
        ? await acceptTribeRequest(connectionId, session.access_token)
        : action === "reject"
          ? await rejectTribeRequest(connectionId, session.access_token)
          : await cancelTribeRequest(connectionId, session.access_token);

      if (action === "accept") {
        await createNotification({
          user_id: connection.requester_id,
          type: "friend_request_accepted",
          title: `${currentProfile.display_name} a accepté ta demande`,
          body: `${currentProfile.display_name} fait maintenant partie de ta tribu.`,
          related_user_id: session.user.id
        }, session.access_token);
      }

      setSocialNotice(action === "accept" ? "Demande Tribu acceptée." : action === "reject" ? "Demande Tribu refusée." : "Demande annulée.");
      await refreshSocialData(session);
    } catch (error) {
      console.error("Mise à jour Tribu impossible.", error);
      setSocialNotice(error instanceof Error ? error.message : "Impossible de mettre à jour cette demande.");
    }
  };
  const acceptJoinRequestFlow = async (requestId: string) => {
    const session = requireAuth("Connecte-toi pour accepter cette demande.");
    if (!session) return;

    const request = userTripActions?.joinRequests.find((item) => item.id === requestId);
    const trip = request ? availableTrips.find((item) => item.id === request.trip_id) : undefined;
    if (!request || !trip) {
      setSocialNotice("Demande introuvable.");
      return;
    }

    try {
      await acceptJoinRequest(request.id, session.access_token);
      await addTripParticipant(request.trip_id, request.requester_id, session.access_token, "participant");
      const conversation = await ensureTripConversation(request.trip_id, "user_project", session.access_token);
      await addConversationMember(conversation.id, request.creator_id, session.access_token);
      await addConversationMember(conversation.id, request.requester_id, session.access_token);
      await createNotification({
        user_id: request.requester_id,
        type: "join_request_accepted",
        title: `Ta demande pour "${trip.title}" a été acceptée`,
        body: "Tu as été ajouté à la conversation du groupe.",
        related_trip_id: trip.id,
        related_user_id: session.user.id,
        related_request_id: request.id
      }, session.access_token);
      setSocialNotice("Demande acceptée. Le membre a été ajouté au Trip et à la conversation.");
      await refreshSocialData(session);
      await loadTripMembers(trip, session);
    } catch (error) {
      console.error("Acceptation impossible.", error);
      setSocialNotice(error instanceof Error ? error.message : "Impossible d'accepter cette demande.");
    }
  };
  const rejectJoinRequestFlow = async (requestId: string) => {
    const session = requireAuth("Connecte-toi pour refuser cette demande.");
    if (!session) return;

    const request = userTripActions?.joinRequests.find((item) => item.id === requestId);
    const trip = request ? availableTrips.find((item) => item.id === request.trip_id) : undefined;
    if (!request || !trip) {
      setSocialNotice("Demande introuvable.");
      return;
    }

    try {
      await rejectJoinRequest(request.id, session.access_token);
      await createNotification({
        user_id: request.requester_id,
        type: "join_request_rejected",
        title: `Réponse pour "${trip.title}"`,
        body: "Le créateur n'a pas retenu ta demande pour ce Trip.",
        related_trip_id: trip.id,
        related_user_id: session.user.id,
        related_request_id: request.id
      }, session.access_token);
      setSocialNotice("Demande refusée.");
      await refreshSocialData(session);
    } catch (error) {
      console.error("Refus impossible.", error);
      setSocialNotice(error instanceof Error ? error.message : "Impossible de refuser cette demande.");
    }
  };
  const markNotificationRead = async (notificationId: string) => {
    if (!authSession) return;
    try {
      await markNotificationAsRead(notificationId, authSession.access_token);
      setNotifications((prev) => prev.map((notification) => notification.id === notificationId ? { ...notification, read_at: new Date().toISOString() } : notification));
    } catch (error) {
      console.warn("Notification non marquée comme lue.", error);
    }
  };
  const deleteNotificationFlow = async (notificationId: string) => {
    if (!authSession) return;
    setNotifications((prev) => prev.filter((notification) => notification.id !== notificationId));
    try {
      await deleteNotification(notificationId, authSession.access_token);
    } catch (error) {
      console.warn("Notification non supprimée.", error);
      await refreshSocialData(authSession);
    }
  };
  const shareTripWithTribeMember = async (trip: Trip, member: UserProfile) => {
    const session = requireAuth("Connecte-toi pour partager un Trip avec ta tribu.");
    if (!session || !currentProfile) return;

    const connection = getAcceptedTribeConnection(member.id);
    if (!connection) {
      setSocialNotice(`${member.name} doit faire partie de ta tribu pour recevoir ce partage.`);
      return;
    }

    try {
      await sendTribeMessage(connection.id, currentProfile.id, buildTripShareMessage(trip), session.access_token);
      setShareTrip(null);
      setSocialNotice(`Trip partagé à ${member.name} dans votre conversation.`);
    } catch (error) {
      console.error("Partage Tribu impossible.", error);
      setSocialNotice(error instanceof Error ? error.message : "Impossible de partager ce Trip dans ta tribu.");
    }
  };
  const formalizeCatalogTrip = (trip: Trip) => {
    setCreateTripSeed(trip);
    setSelectedTripId(trip.id);
    go("create-trip");
  };
  const publishCommunityTrip = async (trip: Trip) => {
    const session = requireAuth("Connecte-toi pour publier un Trip avec ton vrai profil.");
    if (!session || !currentProfile) {
      throw new Error("Connecte-toi pour publier un Trip.");
    }

    const authenticatedTrip: Trip = {
      ...trip,
      community: true,
      created_by: currentProfile.display_name,
      creator_name: currentProfile.display_name,
      creator_id: session.user.id,
      card_type: "user_project",
      created_by_type: "user",
      planning_status: "planned",
      visibility: "public",
      moderation_status: "approved",
      current_participants: Math.max(1, trip.current_participants ?? 1),
      generation_reasons: [`Proposée par ${currentProfile.display_name}`, ...(trip.generation_reasons ?? []).filter((reason) => !reason.startsWith("Proposée par "))]
    };

    try {
      const publishedTrip = hasSupabaseCatalogConfig() ? await createTrip(authenticatedTrip, session.access_token) : authenticatedTrip;
      if (hasSupabaseCatalogConfig()) {
        await addTripParticipant(publishedTrip.id, session.user.id, session.access_token, "creator").catch((error) => {
          console.warn("Participant créateur non ajouté automatiquement.", error);
        });
        const conversation = await ensureTripConversation(publishedTrip.id, "user_project", session.access_token);
        await addConversationMember(conversation.id, session.user.id, session.access_token).catch((error) => {
          console.warn("Créateur non ajouté automatiquement à la conversation.", error);
        });
      }
      setCommunityTrips((prev) => [publishedTrip, ...prev.filter((item) => item.id !== publishedTrip.id)]);
      setSelectedTripId(publishedTrip.id);
      setCreateTripSeed(null);
      await refreshUserTripActions(session);
      await loadTripMembers(publishedTrip, session);
    } catch (error) {
      console.error("Impossible de publier le Trip.", error);
      throw error;
    }
    go("dashboard");
  };
  const openTripConversation = async (trip: Trip, conversationId?: string) => {
    const session = authSession;
    let participants = tripMemberProfiles[trip.id] ?? getTripMembers(trip);
    let resolvedConversationId = conversationId ?? `conversation-${trip.id}`;
    let createdAt = "Maintenant";

    if (session) {
      try {
        const remoteConversation = conversationId
          ? { id: conversationId, trip_id: trip.id, conversation_type: getTripConversationType(trip), created_at: undefined }
          : await ensureTripConversation(trip.id, getTripConversationType(trip), session.access_token);

        resolvedConversationId = remoteConversation.id;
        createdAt = remoteConversation.created_at ? formatConversationTime(remoteConversation.created_at) : "Maintenant";

        const memberRows = await getConversationMembers(remoteConversation.id, session.access_token);
        const memberIds = [...new Set(memberRows.map((member) => member.user_id))].filter(Boolean);

        if (memberIds.length > 0) {
          const remoteProfiles = await getProfilesByIds(memberIds, session.access_token);
          const knownProfiles = [currentProfile, ...tribeProfiles, ...remoteProfiles].filter(Boolean) as UserProfileRecord[];
          const profileById = new Map(knownProfiles.map((profile) => [profile.id, profile]));
          participants = memberIds.map((id) => profileRecordToUserProfile(profileById.get(id) ?? fallbackProfileRecord(id)));
        } else {
          participants = [currentUser, ...participants.filter((member) => member.id !== currentUser.id)];
        }

        setTripMemberProfiles((prev) => ({ ...prev, [trip.id]: participants }));
      } catch (error) {
        console.warn("Conversation distante indisponible, affichage local temporaire.", error);
        participants = [currentUser, ...participants.filter((member) => member.id !== currentUser.id)];
      }
    } else {
      participants = [currentUser, ...participants.filter((member) => member.id !== currentUser.id)];
    }

    setConversation({
      id: resolvedConversationId,
      trip,
      participants,
      createdAt,
      messages: [
        {
          id: "system-1",
          author: "Tribu Nature",
          content: getTripCardType(trip) === "user_project"
            ? `Conversation créée pour demander à rejoindre le projet ${trip.title}.`
            : `Conversation d'intérêt créée pour ${trip.title}. Organisez ensemble les dates, le transport, l'hébergement et les activités.`,
          time: "maintenant",
          system: true
        }
      ]
    });
    setSelectedTripId(trip.id);
    go("conversation");
  };
  const joinTrip = async (trip: Trip) => {
    const session = requireAuth(
      getTripCardType(trip) === "user_project"
        ? "Connecte-toi pour demander à rejoindre ce projet."
        : "Connecte-toi pour rejoindre les personnes intéressées par cette idée de voyage."
    );
    if (!session || !currentProfile) return;

    try {
      if (getTripCardType(trip) === "catalog") {
        await expressInterestInCatalogTrip(trip.id, session.user.id, session.access_token);
        const conversation = await ensureTripConversation(trip.id, "catalog_interest", session.access_token);
        await addTripParticipant(trip.id, session.user.id, session.access_token, "participant").catch((error) => {
          console.warn("Participant catalogue non ajouté automatiquement.", error);
        });
        await addConversationMember(conversation.id, session.user.id, session.access_token);
        setSocialNotice("Tu es maintenant marqué comme intéressé. La conversation peut servir à décider des dates ensemble.");
        await refreshUserTripActions(session);
        await loadTripMembers(trip, session);
        await openTripConversation(trip, conversation.id);
      } else if (trip.creator_id === session.user.id) {
        const conversation = await ensureTripConversation(trip.id, "user_project", session.access_token);
        await addConversationMember(conversation.id, session.user.id, session.access_token);
        setSocialNotice("C'est ton projet : tu peux déjà préparer la conversation avec les membres.");
        await refreshUserTripActions(session);
        await loadTripMembers(trip, session);
        await openTripConversation(trip, conversation.id);
      } else if (trip.creator_id) {
        const request = await requestToJoinTrip(trip.id, session.user.id, trip.creator_id, session.access_token);
        await createNotification({
          user_id: trip.creator_id,
          type: "join_request_received",
          title: `${currentProfile.display_name} souhaite rejoindre ton Trip`,
          body: `${currentProfile.display_name} souhaite rejoindre ton Trip "${trip.title}". Consulte son profil pour accepter ou refuser.`,
          related_trip_id: trip.id,
          related_user_id: session.user.id,
          related_request_id: request.id
        }, session.access_token);
        setSocialNotice("Demande envoyée au créateur du Trip.");
        await refreshUserTripActions(session);
      } else {
        setSocialNotice("Projet ouvert en conversation locale. Le créateur devra être rattaché à un compte pour valider les demandes.");
        await openTripConversation(trip);
      }
    } catch (error) {
      console.error("Action sociale impossible.", error);
      setSocialNotice(error instanceof Error ? error.message : "Action impossible pour le moment.");
    }
  };

  return (
    <div className="min-h-screen bg-cream text-forest-900">
      <Header
        page={page}
        go={go}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        authLoading={authLoading}
        currentProfile={currentProfile}
        unreadNotificationCount={unreadNotificationCount}
        unreadMessageCount={tribeUnreadMessageCount}
        onAuthClick={() => openAuthModal("Connecte-toi pour accéder à ton profil et aux Trips.")}
        onNotificationsClick={() => setNotificationsOpen((value) => !value)}
        onMessagesClick={openTribeInbox}
        onSignOut={handleSignOut}
      />
      <main>
        {notificationsOpen && (
          <NotificationPanel
            notifications={notifications}
            trips={availableTrips}
            profiles={[...(currentProfile ? [currentProfile] : []), ...tribeProfiles]}
            currentUserId={currentProfile?.id}
            joinRequests={userTripActions?.joinRequests ?? []}
            tripInvitations={tripInvitations}
            onAcceptJoinRequest={acceptJoinRequestFlow}
            onRejectJoinRequest={rejectJoinRequestFlow}
            onUpdateTripInvitation={updateTripInvitation}
            onViewProfile={openProfile}
            onMarkRead={markNotificationRead}
            onDeleteNotification={deleteNotificationFlow}
            onClose={() => setNotificationsOpen(false)}
          />
        )}
        {socialNotice && <div className="container-page pt-4"><div className="rounded-[1rem] bg-skysoft px-4 py-3 text-sm font-semibold text-forest-900">{socialNotice}</div></div>}
        {page === "landing" && <Landing trips={availableTrips} go={go} openTrip={openTrip} onTripAction={joinTrip} userTripActions={userTripActions} favoriteTripIds={favoriteTripIds} onToggleFavorite={toggleTripFavorite} />}
        {page === "dashboard" && (
          <Dashboard
            trips={availableTrips}
            generatedMode={false}
            isGenerating={false}
            openTrip={openTrip}
            onTripAction={joinTrip}
            onCreateTrip={() => go("create-trip")}
            userTripActions={userTripActions}
            favoriteTripIds={favoriteTripIds}
            onToggleFavorite={toggleTripFavorite}
          />
        )}
        {page === "create-trip" && <CreateTripPage proposerName={currentUser.name} initialTrip={createTripSeed} onPublish={publishCommunityTrip} />}
        {page === "trip" && <TripDetail trip={selectedTrip} catalogActivities={catalog.activities} validatedMembers={validatedMembers} joinTrip={joinTrip} userTripActions={userTripActions} isFavorite={favoriteTripIds.includes(selectedTrip.id)} onToggleFavorite={toggleTripFavorite} onShareTrip={setShareTrip} creatorProfile={getKnownProfileRecord(selectedTrip.creator_id)} onViewProfile={openProfile} />}
        {page === "conversation" && <ConversationPage conversation={conversation} go={go} currentUser={currentUser} accessToken={authSession?.access_token} isAuthenticated={isAuthenticated} onRequireAuth={() => openAuthModal("Connecte-toi pour écrire dans la conversation.")} onFormalizeTrip={formalizeCatalogTrip} />}
        {page === "communaute" && (
          <Community
            currentUser={currentUser}
            trips={availableTrips}
            favoriteTrips={favoriteTrips}
            profiles={tribeProfiles}
            tribeRequests={tribeRequests}
            tripInvitations={tripInvitations}
            joinRequests={userTripActions?.joinRequests ?? []}
            accessToken={authSession?.access_token}
            isAuthenticated={isAuthenticated}
            initialTab={communityInitialTab}
            onRequireAuth={() => openAuthModal("Connecte-toi pour contacter ou inviter des membres.")}
            onTribeOpened={() => {
              if (currentProfile?.id) markTribeMessagesSeen(currentProfile.id);
              setTribeUnreadMessageCount(0);
            }}
            onSendTribeRequest={sendTribeConnectionRequest}
            onUpdateTribeConnection={updateTribeConnection}
            onAcceptJoinRequest={acceptJoinRequestFlow}
            onRejectJoinRequest={rejectJoinRequestFlow}
            onUpdateTripInvitation={updateTripInvitation}
            onViewProfile={openProfile}
            onInviteToTrip={sendFavoriteTripInvitation}
          />
        )}
        {page === "profil" && (
          <Profile
            profileRecord={profilePageRecord}
            profileUser={profilePageUser}
            currentProfile={currentProfile}
            isOwnProfile={isOwnProfilePage}
            isAuthenticated={isAuthenticated}
            onAuthClick={() => openAuthModal("Connecte-toi pour voir ton profil.")}
            onShowOwnProfile={() => openProfile(null)}
            onUpdateProfile={updateProfileFlow}
            onUploadAvatar={uploadProfileAvatarFlow}
            onOpenTrip={openTripFromProfile}
            trips={availableTrips}
            userTripActions={userTripActions}
          />
        )}
        {page === "prestataires" && <Providers />}
        {page === "securite" && <Safety />}
      </main>
      <Footer go={go} />
      {authModalOpen && <AuthModal prompt={authPrompt} onClose={() => setAuthModalOpen(false)} onAuthenticated={handleAuthSuccess} />}
      {shareTrip && (
        <ShareTripModal
          trip={shareTrip}
          tribeMembers={tribeShareMembers}
          onClose={() => setShareTrip(null)}
          onShareWithTribeMember={(member) => shareTripWithTribeMember(shareTrip, member)}
        />
      )}
    </div>
  );
}

function Header({
  page,
  go,
  menuOpen,
  setMenuOpen,
  authLoading,
  currentProfile,
  unreadNotificationCount,
  unreadMessageCount,
  onAuthClick,
  onNotificationsClick,
  onMessagesClick,
  onSignOut
}: {
  page: Page;
  go: (page: Page) => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  authLoading: boolean;
  currentProfile: UserProfileRecord | null;
  unreadNotificationCount: number;
  unreadMessageCount: number;
  onAuthClick: () => void;
  onNotificationsClick: () => void;
  onMessagesClick: () => void;
  onSignOut: () => void;
}) {
  const visibleNavItems = currentProfile ? navItems.filter((item) => item.page !== "profil") : navItems;

  return (
    <header className="sticky top-0 z-50 border-b border-forest-100 bg-cream/90 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between">
        <button className="flex items-center gap-2 font-semibold" onClick={() => go("dashboard")} aria-label="Accueil Tribu Nature">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-forest-800 text-white">
            <Mountain size={19} />
          </span>
          <span>Tribu Nature</span>
        </button>
        <nav className="hidden items-center gap-1 lg:flex">
          {visibleNavItems.map((item) => (
            <button
              key={item.page}
              onClick={() => go(item.page)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${page === item.page ? "bg-white text-forest-900 shadow-sm" : "text-forest-700 hover:bg-white/70"}`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <button className="btn-primary py-2" onClick={() => go("create-trip")}>Créer un Trip</button>
          {currentProfile ? (
            <div className="flex items-center gap-2">
              <button className="relative rounded-full bg-white p-2 text-forest-800 shadow-sm transition hover:bg-forest-50" onClick={onMessagesClick} aria-label="Messages">
                <MessageCircle size={18} />
                {unreadMessageCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-forest-800 px-1 text-[10px] font-bold text-white">
                    {unreadMessageCount}
                  </span>
                )}
              </button>
              <button className="relative rounded-full bg-white p-2 text-forest-800 shadow-sm transition hover:bg-forest-50" onClick={onNotificationsClick} aria-label="Notifications">
                <Bell size={18} />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-sun px-1 text-[10px] font-bold text-white">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>
              <button className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-forest-800 shadow-sm" onClick={() => go("profil")}>
                {currentProfile.display_name}
              </button>
              <button className="rounded-full bg-forest-50 px-4 py-2 text-sm font-semibold text-forest-700 transition hover:bg-forest-100" onClick={onSignOut}>
                Déconnexion
              </button>
            </div>
          ) : (
            <button className="btn-secondary py-2" onClick={onAuthClick}>{authLoading ? "Connexion..." : "Connexion"}</button>
          )}
        </div>
        <button className="rounded-lg border border-forest-100 bg-white p-2 lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>
      {menuOpen && (
        <div className="container-page border-t border-forest-100 py-3 lg:hidden">
          <div className="grid gap-2">
            {[...visibleNavItems, { page: "create-trip" as Page, label: "Créer un Trip" }].map((item) => (
              <button key={item.page} className="rounded-lg bg-white px-4 py-3 text-left font-medium" onClick={() => go(item.page)}>
                {item.label}
              </button>
            ))}
            {currentProfile ? (
              <>
                <button className="rounded-lg bg-white px-4 py-3 text-left font-medium" onClick={onMessagesClick}>Messages ({unreadMessageCount})</button>
                <button className="rounded-lg bg-white px-4 py-3 text-left font-medium" onClick={onNotificationsClick}>Notifications ({unreadNotificationCount})</button>
                <button className="rounded-lg bg-white px-4 py-3 text-left font-medium" onClick={() => go("profil")}>{currentProfile.display_name}</button>
                <button className="rounded-lg bg-forest-800 px-4 py-3 text-left font-medium text-white" onClick={onSignOut}>Déconnexion</button>
              </>
            ) : (
              <button className="rounded-lg bg-forest-800 px-4 py-3 text-left font-medium text-white" onClick={onAuthClick}>Connexion</button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function AuthModal({
  prompt,
  onClose,
  onAuthenticated
}: {
  prompt: string;
  onClose: () => void;
  onAuthenticated: (session: AuthSession) => Promise<void> | void;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (isSubmitting) return;
    setFeedback("");
    setIsSubmitting(true);

    try {
      const session = mode === "signup"
        ? await signUpWithEmail(email.trim(), password, displayName.trim() || email.split("@")[0])
        : await signInWithEmail(email.trim(), password);

      if (!session) {
        setFeedback("Compte créé. Vérifie ton email si Supabase demande une confirmation, puis connecte-toi.");
        setMode("signin");
        return;
      }

      await onAuthenticated(session);
    } catch (error) {
      setFeedback(getFriendlyAuthFeedback(error, mode));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-forest-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.5rem] bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="pill">{mode === "signup" ? "Créer ton compte" : "Connexion"}</p>
            <h2 className="mt-3 text-2xl font-semibold">Entre dans ta tribu.</h2>
            <p className="mt-2 text-sm leading-6 text-forest-700">{prompt}</p>
          </div>
          <button className="rounded-full bg-forest-50 p-2" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-full bg-forest-50 p-1">
          <button className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "signin" ? "bg-white shadow-sm" : "text-forest-700"}`} onClick={() => setMode("signin")}>
            Se connecter
          </button>
          <button className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "signup" ? "bg-white shadow-sm" : "text-forest-700"}`} onClick={() => setMode("signup")}>
            Créer un compte
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {mode === "signup" && (
            <label className="grid gap-2 text-sm font-semibold text-forest-700">
              Nom affiché
              <input className="rounded-lg border border-forest-100 bg-forest-50 px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-forest-600" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Ex : Karim" />
            </label>
          )}
          <label className="grid gap-2 text-sm font-semibold text-forest-700">
            Email
            <input className="rounded-lg border border-forest-100 bg-forest-50 px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-forest-600" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="toi@email.com" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-forest-700">
            Mot de passe
            <input className="rounded-lg border border-forest-100 bg-forest-50 px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-forest-600" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 6 caractères" />
          </label>
        </div>

        {feedback && <p className="mt-4 rounded-lg bg-skysoft px-4 py-3 text-sm font-semibold text-forest-900">{feedback}</p>}

        <button className="btn-primary mt-5 w-full disabled:cursor-wait disabled:opacity-70" disabled={isSubmitting} onClick={submit}>
          {isSubmitting ? mode === "signup" ? "Création..." : "Connexion..." : mode === "signup" ? "Créer mon compte" : "Me connecter"}
        </button>
      </div>
    </div>
  );
}

function getFriendlyAuthFeedback(error: unknown, mode: "signin" | "signup") {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();

  if (normalized.includes("email rate limit") || normalized.includes("rate limit")) {
    return "La limite d'emails Supabase est atteinte pour le moment. Pour la beta, désactive la confirmation email dans Supabase Auth ou branche un SMTP, puis réessaie dans quelques minutes.";
  }

  if (normalized.includes("user already registered") || normalized.includes("already registered")) {
    return "Ce compte existe déjà. Passe sur Se connecter avec le même email et mot de passe.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Email ou mot de passe incorrect. Vérifie les informations ou crée un compte si tu n'en as pas encore.";
  }

  if (normalized.includes("password") && normalized.includes("6")) {
    return "Choisis un mot de passe d'au moins 6 caractères.";
  }

  return message || (mode === "signup" ? "Création de compte impossible pour le moment." : "Connexion impossible pour le moment.");
}

function NotificationPanel({
  notifications,
  trips,
  profiles,
  currentUserId,
  joinRequests,
  tripInvitations,
  onAcceptJoinRequest,
  onRejectJoinRequest,
  onUpdateTripInvitation,
  onViewProfile,
  onMarkRead,
  onDeleteNotification,
  onClose
}: {
  notifications: NotificationRecord[];
  trips: Trip[];
  profiles: UserProfileRecord[];
  currentUserId?: string;
  joinRequests: UserTripActions["joinRequests"];
  tripInvitations: TripInvitation[];
  onAcceptJoinRequest: (requestId: string) => void | Promise<void>;
  onRejectJoinRequest: (requestId: string) => void | Promise<void>;
  onUpdateTripInvitation: (invitationId: string, action: "accept" | "reject") => void | Promise<void>;
  onViewProfile: (profileId: string) => void;
  onMarkRead: (notificationId: string) => void | Promise<void>;
  onDeleteNotification: (notificationId: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const pendingJoinRequests = joinRequests.filter((request) => request.creator_id === currentUserId && request.status === "pending");
  const notifiedJoinRequestIds = new Set(
    notifications
      .filter((notification) => notification.type === "join_request_received" && notification.related_request_id)
      .map((notification) => notification.related_request_id)
  );
  const pendingJoinRequestsWithoutNotification = pendingJoinRequests.filter((request) => !notifiedJoinRequestIds.has(request.id));
  const findTrip = (id: string) => trips.find((trip) => trip.id === id);
  const findProfile = (id: string) => profiles.find((profile) => profile.id === id);

  return (
    <section className="fixed right-4 top-20 z-[70] w-[calc(100%-2rem)] max-w-xl">
      <div className="ml-auto w-full rounded-[1.5rem] bg-white p-4 shadow-soft ring-1 ring-forest-100">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="pill">Notifications</p>
            <h2 className="mt-2 text-2xl font-semibold">Ce qui demande ton attention</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-forest-50 px-3 py-1 text-xs font-bold text-forest-700">{notifications.length + pendingJoinRequestsWithoutNotification.length}</span>
            <button className="rounded-full bg-forest-50 p-2 transition hover:bg-forest-100" onClick={onClose} aria-label="Fermer les notifications">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="mt-4 grid max-h-[min(620px,calc(100vh-9rem))] gap-3 overflow-y-auto pr-1">
          {pendingJoinRequestsWithoutNotification.map((request) => {
            const trip = findTrip(request.trip_id);
            const profile = findProfile(request.requester_id);
            return (
              <article className="rounded-[1rem] border border-sun/40 bg-sun/10 p-4" key={`join-${request.id}`}>
                <p className="font-semibold">{profile?.display_name ?? "Un membre"} souhaite rejoindre ton Trip</p>
                <p className="mt-1 text-sm leading-6 text-forest-700">
                  {profile?.display_name ?? "Un membre"} a demandé à rejoindre {trip ? `"${trip.title}"` : "ton voyage"}. Tu peux accepter ou refuser.
                </p>
                {(trip || profile) && (
                  <div className="mt-3 rounded-lg bg-white p-3 text-sm text-forest-700">
                    {profile && <p><strong>Profil :</strong> {profile.display_name} · {profile.city ?? "Ville à préciser"}</p>}
                    {trip && <p><strong>Trip :</strong> {trip.title}</p>}
                  </div>
                )}
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <button className="btn-secondary py-2" onClick={() => onViewProfile(request.requester_id)}>Voir profil</button>
                  <button className="btn-primary py-2" onClick={() => onAcceptJoinRequest(request.id)}>Accepter</button>
                  <button className="btn-secondary py-2" onClick={() => onRejectJoinRequest(request.id)}>Refuser</button>
                </div>
              </article>
            );
          })}
          {notifications.length === 0 && pendingJoinRequestsWithoutNotification.length === 0 && <p className="rounded-lg bg-forest-50 p-4 text-sm font-semibold text-forest-700">Aucune notification pour le moment.</p>}
          {notifications.map((notification) => {
            const trip = notification.related_trip_id ? findTrip(notification.related_trip_id) : undefined;
            const profile = notification.related_user_id ? findProfile(notification.related_user_id) : undefined;
            const request = notification.related_request_id ? joinRequests.find((item) => item.id === notification.related_request_id) : undefined;
            const invitation = notification.type === "trip_invitation_received"
              ? tripInvitations.find((item) =>
                  item.trip_id === notification.related_trip_id &&
                  item.inviter_id === notification.related_user_id &&
                  item.status === "pending"
                )
              : undefined;
            return (
              <SwipeToDeleteNotification key={notification.id} notification={notification} onDelete={() => onDeleteNotification(notification.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{notification.title}</p>
                    {notification.body && <p className="mt-1 text-sm leading-6 text-forest-700">{notification.body}</p>}
                  </div>
                  {!notification.read_at && (
                    <button className="text-xs font-bold text-forest-700 underline underline-offset-4" onClick={() => onMarkRead(notification.id)}>
                      Lu
                    </button>
                  )}
                </div>
                {(trip || profile) && (
                  <div className="mt-3 rounded-lg bg-forest-50 p-3 text-sm text-forest-700">
                    {profile && <p><strong>Profil :</strong> {profile.display_name} · {profile.city ?? "Ville à préciser"}</p>}
                    {trip && <p><strong>Trip :</strong> {trip.title}</p>}
                    {notification.related_user_id && (
                      <button className="mt-3 rounded-full bg-white px-3 py-2 text-xs font-bold text-forest-800 shadow-sm transition hover:bg-forest-100" onClick={() => onViewProfile(notification.related_user_id!)}>
                        Voir le profil
                      </button>
                    )}
                  </div>
                )}
                {notification.type === "join_request_received" && request?.status === "pending" && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <button className="btn-secondary py-2" onClick={() => onViewProfile(request.requester_id)}>Voir profil</button>
                    <button className="btn-primary py-2" onClick={() => onAcceptJoinRequest(request.id)}>Accepter</button>
                    <button className="btn-secondary py-2" onClick={() => onRejectJoinRequest(request.id)}>Refuser</button>
                  </div>
                )}
                {notification.type === "trip_invitation_received" && invitation && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button className="btn-primary py-2" onClick={() => onUpdateTripInvitation(invitation.id, "accept")}>Accepter</button>
                    <button className="btn-secondary py-2" onClick={() => onUpdateTripInvitation(invitation.id, "reject")}>Refuser</button>
                  </div>
                )}
              </SwipeToDeleteNotification>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SwipeToDeleteNotification({
  notification,
  onDelete,
  children
}: {
  notification: NotificationRecord;
  onDelete: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteCurrent = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    await onDelete();
  };

  return (
    <div className="relative overflow-hidden rounded-[1rem]">
      <article className={`relative border p-4 pr-12 transition ${notification.read_at ? "border-forest-100 bg-white" : "border-sun/40 bg-sun/10"}`}>
        <button
          className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-forest-700 shadow-sm transition hover:bg-forest-100 hover:text-red-600 disabled:opacity-50"
          onClick={deleteCurrent}
          disabled={isDeleting}
          aria-label="Supprimer cette notification"
        >
          <Trash2 size={15} />
        </button>
        {children}
      </article>
    </div>
  );
}

function Landing({
  trips,
  go,
  openTrip,
  onTripAction,
  userTripActions,
  favoriteTripIds,
  onToggleFavorite
}: {
  trips: Trip[];
  go: (page: Page) => void;
  openTrip: (id: string) => void;
  onTripAction: (trip: Trip) => void | Promise<void>;
  userTripActions: UserTripActions | null;
  favoriteTripIds: string[];
  onToggleFavorite: (trip: Trip) => void | Promise<void>;
}) {
  return (
    <>
      <section className="relative min-h-[720px] overflow-hidden">
        <img className="absolute inset-0 h-full w-full object-cover" src={pageHero} alt="Lac de montagne au lever du jour" />
        <div className="absolute inset-0 bg-gradient-to-b from-forest-900/45 via-forest-900/25 to-cream" />
        <div className="container-page relative flex min-h-[720px] items-center py-20">
          <div className="max-w-3xl pt-12 text-white">
            <span className="mb-5 inline-flex rounded-full bg-white/18 px-4 py-2 text-sm font-semibold backdrop-blur-md">
              Plateforme sociale intelligente pour micro-aventures nature
            </span>
            <h1 className="text-5xl font-semibold leading-tight sm:text-6xl lg:text-7xl">Pars seul. Trouve ton groupe. Vis ton aventure.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/92">
              Tribu Nature t'aide à rejoindre des personnes compatibles, découvrir une destination nature, composer des activités locales et générer un planning prêt à vivre.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button className="btn-primary bg-white text-forest-900 hover:bg-forest-50" onClick={() => go("dashboard")}>Voir mes Trips compatibles</button>
              <button className="btn-secondary border-white/30 bg-white/15 text-white backdrop-blur-md hover:bg-white/25" onClick={() => go("dashboard")}>Voir les Trips disponibles</button>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page grid gap-8 py-16 lg:grid-cols-2">
        <InfoBlock
          eyebrow="Le problème humain"
          title="Tu veux partir, mais tu ne sais pas avec qui ?"
          text="Routine, fatigue, amis indisponibles, envie de nature mais pas l'énergie d'organiser. L'app transforme cette envie floue en proposition collective rassurante."
        />
        <InfoBlock
          eyebrow="La solution"
          title="On trouve le groupe, la destination, les activités et le planning."
          text="Tu choisis tes dates, ton ambiance et tes préférences. L'app sélectionne une zone adaptée, puis compose une aventure réaliste avec des activités locales, des alternatives météo et un rythme compatible avec le groupe."
        />
      </section>

      <section className="bg-forest-900 py-16 text-white">
        <div className="container-page">
          <h2 className="section-title text-white">Comment ça marche</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-5">
            {["Exprime ton envie", "Découvre des personnes compatibles", "Rejoins un Trip", "Vote pour les activités", "Pars en sécurité"].map((step, index) => (
              <div className="rounded-lg bg-white/10 p-5 backdrop-blur" key={step}>
                <span className="text-3xl font-semibold text-sun">0{index + 1}</span>
                <p className="mt-4 font-semibold">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="pill">Trips exemples</p>
            <h2 className="section-title mt-4">De ton envie floue à ton week-end prêt à vivre.</h2>
          </div>
          <button className="btn-secondary" onClick={() => go("dashboard")}>Tout voir</button>
        </div>
        <TripGrid trips={trips.slice(0, 3)} openTrip={openTrip} onTripAction={onTripAction} userTripActions={userTripActions} favoriteTripIds={favoriteTripIds} onToggleFavorite={onToggleFavorite} />
      </section>

      <section className="container-page pb-16">
        <div className="card grid gap-8 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-10">
          <div>
            <p className="pill">Confiance</p>
            <h2 className="section-title mt-4">Petit groupe, profils vérifiés, rythme adapté.</h2>
            <p className="mt-4 leading-8 text-forest-700">Tribu Nature n'est pas une app de dating ni une agence qui vend un package fermé. C'est un espace pour composer une aventure avec des personnes compatibles et des prestataires locaux fiables.</p>
          </div>
          <div className="grid gap-3">
            {["Profils vérifiés", "Avis et badges", "Groupes limités", "Activités encadrées", "Charte de comportement", "Signalement possible"].map((item) => (
              <div className="flex items-center gap-3 rounded-lg bg-forest-50 p-4" key={item}>
                <ShieldCheck className="text-forest-700" />
                <span className="font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-skysoft py-16">
        <div className="container-page text-center">
          <h2 className="section-title">Tu n'as pas besoin d'attendre d'avoir des amis disponibles pour partir.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-forest-700">Découvre les Trips compatibles, ajuste les filtres et rejoins les personnes qui veulent vivre la même aventure que toi.</p>
          <button className="btn-primary mt-8" onClick={() => go("dashboard")}>Voir les Trips compatibles</button>
        </div>
      </section>
    </>
  );
}

function Onboarding({ isGenerating, onGeneratedTrip }: { isGenerating: boolean; onGeneratedTrip: (profile: OnboardingProfile) => Promise<void> }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({
    availability: ["2026-06-26", "2026-06-28", "Week-end"],
    filters: ["Petit groupe", "Budget max 350 €", "Montagne", "Week-end", "Ambiance calme"],
    destinationZones: ["Peu m'importe"],
    budget: "200 à 350 €",
    level: "Facile",
    ambience: ["Calme & déconnexion"],
    nature: "Montagne",
    comfort: "Gîte"
  });
  const current = onboardingSteps[step];
  const done = step === onboardingSteps.length;

  const toggle = (key: string, value: string, multi?: boolean) => {
    if (!multi) {
      setAnswers((prev) => ({ ...prev, [key]: value }));
      return;
    }
    setAnswers((prev) => {
      const list = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
      return { ...prev, [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] };
    });
  };

  return (
    <section className="container-page py-10">
      <div className="mx-auto max-w-5xl">
        <p className="pill">Profil d'aventure</p>
        <h1 className="mt-4 text-4xl font-semibold">Choisis tes dates, ton ambiance, tes préférences.</h1>
        <p className="mt-3 max-w-2xl text-forest-700">Quelques choix simples suffisent. L'app s'occupe ensuite de proposer un Trip et des personnes compatibles.</p>
        <div className="mt-6 h-2 rounded-full bg-forest-100">
          <div className="h-full rounded-full bg-forest-700 transition-all" style={{ width: `${Math.min((step / onboardingSteps.length) * 100, 100)}%` }} />
        </div>
        <div className="card mt-8 p-5 sm:p-8">
          {!done ? (
            <>
              {current.type !== "destination" && <h2 className="text-2xl font-semibold">{current.title}</h2>}
              {current.type === "calendar" ? (
                <AvailabilityPicker answers={answers} setAnswers={setAnswers} />
              ) : current.type === "filters" ? (
                <FiltersPicker answers={answers} setAnswers={setAnswers} />
              ) : current.type === "destination" ? (
                <DestinationPreferenceStep answers={answers} setAnswers={setAnswers} />
              ) : current.type === "ambience" ? (
                <AmbiencePicker answers={answers} setAnswers={setAnswers} />
              ) : (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {current.options?.map((option) => {
                    const selected = current.multi ? (answers[current.key] as string[] | undefined)?.includes(option) : answers[current.key] === option;
                    return (
                      <button
                        className={`rounded-lg border p-4 text-left font-medium transition ${selected ? "border-forest-700 bg-forest-800 text-white" : "border-forest-100 bg-white hover:bg-forest-50"}`}
                        key={option}
                        onClick={() => toggle(current.key, option, current.multi)}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="mt-8 flex justify-between gap-3">
                <button className="btn-secondary" disabled={step === 0} onClick={() => setStep(Math.max(step - 1, 0))}>Retour</button>
                <button className="btn-primary" onClick={() => setStep(step + 1)}>Continuer</button>
              </div>
            </>
          ) : (
            <AdventureProfileCard answers={answers} isGenerating={isGenerating} onGeneratedTrip={onGeneratedTrip} />
          )}
        </div>
      </div>
    </section>
  );
}

function AvailabilityPicker({
  answers,
  setAnswers
}: {
  answers: Record<string, string | string[]>;
  setAnswers: Dispatch<SetStateAction<Record<string, string | string[]>>>;
}) {
  const selected = Array.isArray(answers.availability) ? answers.availability : [];
  const selectedDates = selected.filter(isIsoDate).sort();
  const duration = selected.find((item) => ["Journée", "Week-end", "2-3 jours", "Semaine"].includes(item)) ?? "Week-end";
  const startDate = selectedDates[0];
  const endDate = selectedDates[1];

  const selectDate = (value: string) => {
    setAnswers((prev) => {
      const list = Array.isArray(prev.availability) ? prev.availability : [];
      const base = list.filter((item) => !isIsoDate(item));
      const dates = list.filter(isIsoDate).sort();
      let nextDates: string[];

      if (dates.length === 0 || dates.length === 2 || value < dates[0]) {
        nextDates = [value];
      } else if (value === dates[0]) {
        nextDates = [];
      } else {
        nextDates = [dates[0], value];
      }

      return { ...prev, availability: [...nextDates, ...base] };
    });
  };

  const setDuration = (value: string) => {
    setAnswers((prev) => {
      const list = Array.isArray(prev.availability) ? prev.availability : [];
      const dates = list.filter(isIsoDate);
      return { ...prev, availability: [...dates, value] };
    });
  };

  const selectedNights = startDate && endDate ? Math.max(1, daysBetween(startDate, endDate)) : 0;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-forest-700">
            <CalendarDays size={18} />
            Sélectionne une date de départ puis une date de retour
          </div>
          <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-forest-800 shadow-sm">{calendarMonth.label}</span>
        </div>

        <div className="mt-4 rounded-[1.5rem] bg-white p-3 shadow-sm">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-forest-600">
            {calendarMonth.weekdays.map((weekday) => (
              <span className="py-2" key={weekday}>{weekday}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarMonth.days.map((day) => {
            const selectedStart = day.date === startDate;
            const selectedEnd = day.date === endDate;
            const inRange = Boolean(startDate && endDate && day.date > startDate && day.date < endDate);
            return (
              <button
                className={[
                  "aspect-square rounded-2xl text-sm font-semibold transition",
                  day.disabled ? "cursor-not-allowed text-forest-200" : "hover:bg-forest-100",
                  inRange ? "bg-forest-100 text-forest-900" : "",
                  selectedStart || selectedEnd ? "bg-forest-800 text-white shadow-soft hover:bg-forest-800" : "",
                  !day.disabled && !inRange && !selectedStart && !selectedEnd ? "bg-forest-50 text-forest-900" : ""
                ].join(" ")}
                disabled={day.disabled}
                key={day.date}
                onClick={() => selectDate(day.date)}
              >
                {day.day}
              </button>
            );
          })}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {["Journée", "Week-end", "2-3 jours", "Semaine"].map((item) => (
            <button
              className={`rounded-full px-4 py-2 text-sm font-semibold ${duration === item ? "bg-sun text-white" : "bg-forest-50 text-forest-800"}`}
              key={item}
              onClick={() => setDuration(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-[1.5rem] bg-forest-50 p-5">
        <p className="text-sm font-semibold text-forest-700">Disponibilités sélectionnées</p>
        <h3 className="mt-2 text-2xl font-semibold">{duration}</h3>
        <div className="mt-5 grid gap-3">
          <MiniFact label="Départ" value={startDate ? formatFrenchDate(startDate) : "À choisir"} />
          <MiniFact label="Retour" value={endDate ? formatFrenchDate(endDate) : "À choisir"} />
          <MiniFact label="Durée" value={selectedNights ? `${selectedNights} nuit${selectedNights > 1 ? "s" : ""}` : "Sélectionne 2 dates"} />
        </div>
        <p className="mt-5 text-sm text-forest-700">Simple comme réserver un trajet ou un logement : tu poses tes dates, on te propose le groupe.</p>
      </div>
    </div>
  );
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatFrenchDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long"
  }).format(new Date(`${value}T12:00:00`));
}

function daysBetween(start: string, end: string) {
  const startTime = new Date(`${start}T12:00:00`).getTime();
  const endTime = new Date(`${end}T12:00:00`).getTime();
  return Math.round((endTime - startTime) / 86_400_000);
}

function AmbiencePicker({
  answers,
  setAnswers
}: {
  answers: Record<string, string | string[]>;
  setAnswers: Dispatch<SetStateAction<Record<string, string | string[]>>>;
}) {
  const selected = Array.isArray(answers.ambience) ? answers.ambience : [];
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {ambienceCards.map((card) => {
        const active = selected.includes(card.title);
        return (
          <button
            className={`overflow-hidden rounded-[1.5rem] border bg-white text-left transition hover:-translate-y-1 hover:shadow-soft ${active ? "border-forest-800 ring-2 ring-forest-800" : "border-forest-100"}`}
            key={card.title}
            onClick={() =>
              setAnswers((prev) => {
                const list = Array.isArray(prev.ambience) ? prev.ambience : [];
                return { ...prev, ambience: list.includes(card.title) ? list.filter((item) => item !== card.title) : [...list, card.title] };
              })
            }
          >
            <img className="h-36 w-full object-cover" src={card.image} alt={card.title} />
            <div className="p-4">
              <h3 className="font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-forest-700">{card.text}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {card.examples.map((item) => <span className="pill text-xs" key={item}>{item}</span>)}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function FiltersPicker({
  answers,
  setAnswers
}: {
  answers: Record<string, string | string[]>;
  setAnswers: Dispatch<SetStateAction<Record<string, string | string[]>>>;
}) {
  const selected = Array.isArray(answers.filters) ? answers.filters : [];
  const toggleFilter = (value: string) => {
    setAnswers((prev) => {
      const list = Array.isArray(prev.filters) ? prev.filters : [];
      return { ...prev, filters: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] };
    });
  };
  return (
    <div className="mt-6 grid gap-5">
      <div className="rounded-[1.5rem] bg-skysoft p-5">
        <div className="flex items-center gap-2 font-semibold">
          <SlidersHorizontal size={18} />
          Filtres compatibles
        </div>
        <p className="mt-2 text-sm text-forest-700">Choisis seulement ce qui compte vraiment pour toi. Le reste peut rester flexible.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {filterGroups.map((group) => (
          <div className="rounded-[1.5rem] border border-forest-100 bg-white p-4" key={group.title}>
            <h3 className="font-semibold">{group.title}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {group.options.map((option) => (
                <button
                  className={`rounded-full px-3 py-2 text-sm font-semibold transition ${selected.includes(option) ? "bg-forest-800 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"}`}
                  key={option}
                  onClick={() => toggleFilter(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DestinationPreferenceStep({
  answers,
  setAnswers
}: {
  answers: Record<string, string | string[]>;
  setAnswers: Dispatch<SetStateAction<Record<string, string | string[]>>>;
}) {
  const selectedZones = Array.isArray(answers.destinationZones) ? answers.destinationZones : ["Peu m'importe"];
  const toggleZone = (value: string) => {
    setAnswers((prev) => {
      const list = Array.isArray(prev.destinationZones) ? prev.destinationZones : [];
      if (value === "Peu m'importe") return { ...prev, destinationZones: ["Peu m'importe"] };
      const withoutAny = list.filter((item) => item !== "Peu m'importe");
      const next = withoutAny.includes(value) ? withoutAny.filter((item) => item !== value) : [...withoutAny, value];
      return { ...prev, destinationZones: next };
    });
  };
  const removeSelectedZone = (value: string) => {
    setAnswers((prev) => {
      const list = Array.isArray(prev.destinationZones) ? prev.destinationZones : [];
      return { ...prev, destinationZones: list.filter((item) => item !== value) };
    });
  };

  return (
    <div className="mt-6">
      <DestinationMapPicker selectedZones={selectedZones} onToggleZone={toggleZone} onRemoveZone={removeSelectedZone} />
    </div>
  );
}

function DestinationMapPicker({
  selectedZones,
  onToggleZone,
  onRemoveZone
}: {
  selectedZones: string[];
  onToggleZone: (zone: string) => void;
  onRemoveZone: (zone: string) => void;
}) {
  const flexibleSelected = selectedZones.length === 0 || selectedZones.includes("Peu m'importe");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const currentRegions = selectedCountry ? countryRegionCatalog[selectedCountry]?.regions ?? [] : [];

  return (
    <section className="rounded-[1.75rem] border border-forest-100 bg-white p-5 shadow-soft lg:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="pill">Préférence destination</p>
          <h3 className="mt-4 text-2xl font-semibold">Tu as déjà une zone en tête ?</h3>
          <p className="mt-3 leading-7 text-forest-700">Clique sur un pays en Europe, puis affine avec une région. Tu peux aussi laisser l'app proposer la destination idéale selon ton profil.</p>
        </div>
        <button
          className={`rounded-full px-4 py-3 text-sm font-semibold transition ${flexibleSelected ? "bg-forest-800 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"}`}
          onClick={() => onToggleZone("Peu m'importe")}
        >
          Peu m'importe
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-forest-100 bg-gradient-to-br from-skysoft via-forest-50 to-cream p-3 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-forest-700">
              <span>Europe</span>
              {selectedCountry && (
                <>
                  <span className="text-forest-400">&gt;</span>
                  <span>{selectedCountry}</span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-forest-700">
              {selectedCountry ? `Sélectionne une région en ${selectedCountry}.` : "Clique sur un pays pour afficher ses régions."}
            </p>
          </div>
          {selectedCountry && (
            <button className="btn-secondary py-2 text-sm" onClick={() => setSelectedCountry(null)}>
              ← Retour à l'Europe
            </button>
          )}
        </div>
        <div className="overflow-hidden rounded-[1.25rem] bg-white/75 shadow-inner">
          {!selectedCountry ? (
            <EuropeSelectionMap selectedZones={selectedZones} onSelectCountry={(zoneName) => setSelectedCountry(zoneName)} />
          ) : selectedCountry === "France" ? (
            <>
              <FranceRegionMap selectedZones={selectedZones} onToggleZone={onToggleZone} />
            </>
          ) : (
            <CountryRegionSelector country={selectedCountry} regions={currentRegions} selectedZones={selectedZones} onToggleZone={onToggleZone} />
          )}
        </div>
        <p className="mt-3 text-center text-xs font-semibold text-forest-700">Carte vectorielle sans routes ni labels routiers. Les pays et régions sélectionnés servent directement à générer les Trips.</p>
      </div>

      <div className="mt-5 rounded-[1.25rem] bg-forest-50 p-4">
        <p className="text-sm font-semibold text-forest-700">Zones sélectionnées</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedZones.length > 0 ? (
            selectedZones.map((zone) => (
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-forest-800 shadow-sm" key={zone}>
                {zone}
                <button className="rounded-full p-1 text-forest-500 transition hover:bg-forest-100 hover:text-forest-900" onClick={() => onRemoveZone(zone)} aria-label={`Retirer ${zone}`}>
                  <X size={13} />
                </button>
              </span>
            ))
          ) : (
            <span className="text-sm text-forest-700">Aucune zone verrouillée. L'app peut proposer librement la meilleure destination.</span>
          )}
        </div>
      </div>
    </section>
  );
}

function EuropeSelectionMap({
  selectedZones,
  onSelectCountry
}: {
  selectedZones: string[];
  onSelectCountry: (zoneName: string) => void;
}) {
  return (
    <ComposableMap
      projection="geoAzimuthalEqualArea"
      projectionConfig={{ rotate: [-10, -52, 0], scale: 760 }}
      width={760}
      height={560}
      className="h-auto w-full"
    >
      <ZoomableGroup center={[8, 49]} zoom={1}>
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const countryName = geo.properties.name as string;
              const zoneName = selectableCountries[countryName];
              const active = zoneName ? countryHasSelectedZone(zoneName, selectedZones) : false;
              return (
                <Geography
                  geography={geo}
                  key={geo.rsmKey}
                  onClick={() => zoneName && onSelectCountry(zoneName)}
                  role={zoneName ? "button" : "img"}
                  tabIndex={zoneName ? 0 : -1}
                  onKeyDown={(event) => {
                    if (zoneName && (event.key === "Enter" || event.key === " ")) onSelectCountry(zoneName);
                  }}
                  style={mapGeographyStyle(active, Boolean(zoneName))}
                />
              );
            })
          }
        </Geographies>
      </ZoomableGroup>
    </ComposableMap>
  );
}

function CountryRegionSelector({
  country,
  regions,
  selectedZones,
  onToggleZone
}: {
  country: string;
  regions: { name: string; hint: string }[];
  selectedZones: string[];
  onToggleZone: (zoneName: string) => void;
}) {
  const focus = countryRegionCatalog[country];

  return (
    <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <ComposableMap
        projection="geoAzimuthalEqualArea"
        projectionConfig={{ rotate: [-10, -52, 0], scale: 760 }}
        width={760}
        height={560}
        className="h-auto w-full"
      >
        <ZoomableGroup center={focus?.center ?? [8, 49]} zoom={focus?.zoom ?? 2.5}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const countryName = geo.properties.name as string;
                const zoneName = selectableCountries[countryName];
                const active = zoneName === country;
                return (
                  <Geography
                    geography={geo}
                    key={geo.rsmKey}
                    style={mapGeographyStyle(active, false)}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
      <div className="bg-white/85 p-4 lg:p-5">
        <p className="text-sm font-semibold text-forest-700">Régions de {country}</p>
        <p className="mt-2 text-sm leading-6 text-forest-700">Choisis une zone régionale. Elle affinera ensuite les Trips compatibles.</p>
        <div className="mt-4 grid gap-2">
          {regions.map((region) => {
            const active = selectedZones.includes(region.name);
            return (
              <button
                className={`rounded-lg px-3 py-3 text-left text-sm font-semibold transition ${active ? "bg-forest-800 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"}`}
                key={region.name}
                onClick={() => onToggleZone(region.name)}
              >
                <span>{region.name}</span>
                <span className={`mt-1 block text-xs font-medium ${active ? "text-white/80" : "text-forest-600"}`}>{region.hint}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FranceRegionMap({
  selectedZones,
  onToggleZone
}: {
  selectedZones: string[];
  onToggleZone: (zoneName: string) => void;
}) {
  return (
    <div>
      <ComposableMap
        projection="geoConicConformal"
        projectionConfig={{ center: [2.2, 46.8], parallels: [44, 49], scale: 2650 }}
        width={760}
        height={560}
        className="h-auto w-full"
      >
        <Geographies geography={franceRegionsGeoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const regionName = getRegionName(geo.properties);
              const active = selectedZones.includes(regionName);
              return (
                <Geography
                  geography={geo}
                  key={geo.rsmKey}
                  onClick={() => onToggleZone(regionName)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") onToggleZone(regionName);
                  }}
                  style={mapGeographyStyle(active, true)}
                />
              );
            })
          }
        </Geographies>
        {franceRegions.map((region) => (
          <Marker coordinates={region.coordinates} key={`${region.name}-label`}>
            <text textAnchor="middle" className="select-none text-[11px] font-bold fill-forest-900" paintOrder="stroke" stroke="#ffffff" strokeWidth={4}>
              {shortRegionLabel(region.name)}
            </text>
            <title>{region.name} · {region.hint}</title>
          </Marker>
        ))}
      </ComposableMap>
      <div className="border-t border-forest-100 bg-white/80 p-4">
        <p className="text-xs font-semibold uppercase text-forest-600">Régions sélectionnables</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {franceRegions.map((region) => {
            const active = selectedZones.includes(region.name);
            return (
              <button
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${active ? "bg-forest-800 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"}`}
                key={region.name}
                onClick={() => onToggleZone(region.name)}
                title={region.hint}
              >
                {region.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function mapGeographyStyle(active: boolean, interactive: boolean) {
  return {
    default: {
      fill: active ? "#183e31" : "#dfeadf",
      stroke: "#ffffff",
      strokeWidth: 0.75,
      outline: "none",
      cursor: interactive ? "pointer" : "default"
    },
    hover: {
      fill: interactive ? "#f59e42" : "#dfeadf",
      stroke: "#ffffff",
      strokeWidth: 0.85,
      outline: "none",
      cursor: interactive ? "pointer" : "default"
    },
    pressed: {
      fill: "#183e31",
      outline: "none"
    }
  };
}

function countryHasSelectedZone(country: string, selectedZones: string[]) {
  if (selectedZones.includes(country)) return true;
  return countryRegionCatalog[country]?.regions.some((region) => selectedZones.includes(region.name)) ?? false;
}

function getRegionName(properties: Record<string, unknown>) {
  return String(properties.nom ?? properties.name ?? properties.libgeo ?? "Région");
}

function shortRegionLabel(label: string) {
  return label
    .replace("Nouvelle-Aquitaine", "N. Aquitaine")
    .replace("Auvergne-Rhône-Alpes", "AURA")
    .replace("Provence-Alpes-Côte d'Azur", "PACA")
    .replace("Bourgogne-Franche-Comté", "Bourgogne")
    .replace("Centre-Val de Loire", "Centre")
    .replace("Pays de la Loire", "P. Loire");
}

function AdventureProfileCard({
  answers,
  isGenerating,
  onGeneratedTrip
}: {
  answers: Record<string, string | string[]>;
  isGenerating: boolean;
  onGeneratedTrip: (profile: OnboardingProfile) => Promise<void>;
}) {
  const ambience = Array.isArray(answers.ambience) ? answers.ambience.join(", ") : "Calme & déconnexion";
  const filters = Array.isArray(answers.filters) ? answers.filters.slice(0, 3).join(", ") : "filtres flexibles";
  const selectedZones = Array.isArray(answers.destinationZones) ? answers.destinationZones : ["Peu m'importe"];
  const zones = selectedZones.length > 0 ? selectedZones.join(", ") : "flexible";
  const availability = Array.isArray(answers.availability)
    ? answers.availability.map((item) => (isIsoDate(item) ? formatFrenchDate(item) : item)).join(" · ")
    : "week-end";
  return (
    <div>
      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-sun text-white">
        <Sparkles />
      </div>
      <h2 className="mt-5 text-3xl font-semibold">Ton ADN d'aventure</h2>
      <p className="mt-4 rounded-lg bg-forest-50 p-5 text-lg leading-8">
        {availability}. {answers.nature ?? "Montagne"}, zone {zones.toLowerCase()}, niveau {answers.level ?? "facile"}, budget {answers.budget ?? "200 à 350 €"}, ambiance {ambience.toLowerCase()}, confort {answers.comfort ?? "gîte"}, filtres {filters.toLowerCase()}.
      </p>
      <p className="mt-4 text-forest-700">On peut générer plusieurs Trips possibles, classées selon ton profil, les membres compatibles et les activités réellement disponibles autour des destinations.</p>
      <button className="btn-primary mt-8 disabled:cursor-wait disabled:opacity-70" disabled={isGenerating} onClick={() => onGeneratedTrip(toOnboardingProfile(answers))}>
        {isGenerating ? "Recherche des activités locales..." : "Voir toutes les Trips possibles"}
      </button>
    </div>
  );
}

function toOnboardingProfile(answers: Record<string, string | string[]>): OnboardingProfile {
  return {
    availability: Array.isArray(answers.availability) ? answers.availability : ["Week-end"],
    filters: Array.isArray(answers.filters) ? answers.filters : [],
    budget: typeof answers.budget === "string" ? answers.budget : "200 à 350 €",
    physical_level: typeof answers.level === "string" ? answers.level : "Facile",
    preferred_nature: typeof answers.nature === "string" ? answers.nature : "Montagne",
    ambience: Array.isArray(answers.ambience) ? answers.ambience : ["Calme & déconnexion"],
    comfort_level: typeof answers.comfort === "string" ? answers.comfort : "Gîte",
    safety_needs: inferSafetyNeeds(answers),
    departure_city: inferDepartureCity(answers),
    destination_zones: Array.isArray(answers.destinationZones) ? answers.destinationZones : ["Peu m'importe"]
  };
}

function inferSafetyNeeds(answers: Record<string, string | string[]>) {
  const filters = Array.isArray(answers.filters) ? answers.filters : [];
  const safetyFilters = filters.filter((filter) =>
    ["Groupe", "Petit groupe", "Très encadré", "Groupe calme", "Valeurs similaires", "Même pratique", "Pauses personnelles"].some((keyword) =>
      filter.toLowerCase().includes(keyword.toLowerCase())
    )
  );
  return safetyFilters.length ? safetyFilters : ["Profils vérifiés"];
}

function inferDepartureCity(answers: Record<string, string | string[]>) {
  const filters = Array.isArray(answers.filters) ? answers.filters : [];
  const departure = filters.find((filter) => filter.startsWith("Départ "));
  return departure?.replace("Départ ", "") ?? "Bordeaux";
}

function CreateTripPage({
  proposerName,
  initialTrip,
  onPublish
}: {
  proposerName: string;
  initialTrip: Trip | null;
  onPublish: (trip: Trip) => Promise<void> | void;
}) {
  const [title, setTitle] = useState("Week-end nature en Vallée d'Aspe");
  const [destinationText, setDestinationText] = useState("Vallée d'Aspe");
  const [duration, setDuration] = useState("Week-end");
  const [budget, setBudget] = useState("200 à 350 €");
  const [level, setLevel] = useState("Facile");
  const [groupSize, setGroupSize] = useState("Petit groupe : 3 à 5 personnes");
  const [groupType, setGroupType] = useState("Groupe mixte");
  const [creatorName, setCreatorName] = useState(proposerName);
  const [brief, setBrief] = useState("Je veux proposer une aventure simple, nature et conviviale, avec un petit groupe qui aime marcher tranquillement, découvrir le local et partager un bon moment.");
  const [coverUrl, setCoverUrl] = useState("");
  const [selectedZones, setSelectedZones] = useState<string[]>(["Nouvelle-Aquitaine"]);
  const [ambiences, setAmbiences] = useState<string[]>(["Calme & déconnexion", "Découverte locale"]);
  const [activitiesWanted, setActivitiesWanted] = useState<string[]>(["Randonnée", "Ferme locale", "Restaurant local"]);
  const [groupPreferences, setGroupPreferences] = useState<string[]>(["Profils vérifiés uniquement", "Groupe calme et respectueux"]);
  const [customActivity, setCustomActivity] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");

  useEffect(() => {
    setCreatorName(proposerName);
  }, [proposerName]);

  useEffect(() => {
    if (!initialTrip) return;

    setTitle(initialTrip.title);
    setDestinationText(initialTrip.destination);
    setDuration("Dates à compléter");
    setBudget(numbersToBudgetRange(initialTrip.budget_min, initialTrip.budget_max));
    setLevel(initialTrip.physical_level);
    setCreatorName(proposerName);
    setBrief(initialTrip.description || initialTrip.brief || "Je veux transformer cette idée de voyage en vraie Trip avec un groupe motivé.");
    setCoverUrl(initialTrip.image_url);
    setSelectedZones([inferZoneFromDestination(initialTrip.destination)]);
    setAmbiences(initialTrip.ambience_tags.length ? initialTrip.ambience_tags.slice(0, 4) : ["Découverte locale"]);
    setActivitiesWanted(initialTrip.activities.length ? initialTrip.activities : ["Activité locale", "Découverte nature"]);
    setShowPreview(true);
  }, [initialTrip, proposerName]);

  const previewTrip = {
    ...buildCommunityTrip({
    proposerName,
    title,
    destinationText,
    selectedZones,
    duration,
    budget,
    level,
    ambiences,
    activitiesWanted,
    groupPreferences,
    groupSize,
    groupType,
    creatorName,
    brief,
    coverUrl
    }),
    source_catalog_trip_id: initialTrip?.id,
    created_from_catalog: Boolean(initialTrip),
    generated_activity_ids: initialTrip?.generated_activity_ids,
    generated_itinerary: initialTrip?.generated_itinerary
  };
  const toggleValue = (value: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };
  const addCustomActivity = () => {
    const value = customActivity.trim();
    if (!value) return;
    setActivitiesWanted((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setCustomActivity("");
  };
  const toggleZone = (value: string) => {
    if (value === "Peu m'importe") {
      setSelectedZones([]);
      return;
    }
    setSelectedZones((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };
  const publishTrip = async () => {
    if (isPublishing) return;
    setPublishError("");
    setIsPublishing(true);

    try {
      await onPublish(previewTrip);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Le Trip n'a pas pu être publié. Réessaie dans un instant.";
      setPublishError(message);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <section className="container-page py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="pill">Créer un Trip</p>
          <h1 className="mt-4 text-4xl font-semibold">Propose ton aventure à la tribu.</h1>
          <p className="mt-3 max-w-2xl text-forest-700">Tu sais déjà où tu veux aller ? Crée une proposition simple, publie-la, et laisse les personnes compatibles te rejoindre.</p>
        </div>
        <div className="rounded-[1.25rem] bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-forest-700">Proposée par</p>
          <p className="mt-1 text-xl font-semibold">{proposerName}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <section className="rounded-[1.5rem] bg-white p-5 shadow-soft sm:p-6">
            <h2 className="text-2xl font-semibold">L'essentiel</h2>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-forest-700">Titre du Trip</span>
                <input className="rounded-lg border border-forest-100 bg-forest-50 px-4 py-3 outline-none focus:ring-2 focus:ring-forest-600" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Donne un nom à ton aventure" />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-forest-700">Destination précise</span>
                <input className="rounded-lg border border-forest-100 bg-forest-50 px-4 py-3 outline-none focus:ring-2 focus:ring-forest-600" value={destinationText} onChange={(event) => setDestinationText(event.target.value)} placeholder="Ex : Vallée d'Aspe, Bali, Bretagne..." />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-forest-700">Nom affiché sur le Trip</span>
                <input className="rounded-lg border border-forest-100 bg-forest-50 px-4 py-3 outline-none focus:ring-2 focus:ring-forest-600" value={creatorName} onChange={(event) => setCreatorName(event.target.value)} placeholder="Ton prénom" />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-forest-700">Décris l'esprit du Trip</span>
                <textarea className="min-h-32 rounded-lg border border-forest-100 bg-forest-50 px-4 py-3 outline-none focus:ring-2 focus:ring-forest-600" value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Décris l'esprit du Trip" />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-forest-700">Image de couverture</span>
                <input className="rounded-lg border border-forest-100 bg-forest-50 px-4 py-3 outline-none focus:ring-2 focus:ring-forest-600" value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} placeholder="URL d'image, optionnel" />
              </label>
            </div>
          </section>

          <section className="rounded-[1.5rem] bg-white p-5 shadow-soft sm:p-6">
            <h2 className="text-2xl font-semibold">Activités souhaitées</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Randonnée", "Plage", "Visite locale", "Temple", "Surf", "Ferme locale", "Rafting", "Balade à cheval", "Restaurant local", "Atelier artisanal", "Bivouac", "Snorkeling", "Yoga", "Marché local"].map((activity) => (
                <button className={`rounded-full px-3 py-2 text-sm font-semibold transition ${activitiesWanted.includes(activity) ? "bg-forest-800 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"}`} key={activity} onClick={() => toggleValue(activity, activitiesWanted, setActivitiesWanted)}>
                  {activity}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input className="min-w-0 flex-1 rounded-lg border border-forest-100 bg-forest-50 px-4 py-3 outline-none focus:ring-2 focus:ring-forest-600" value={customActivity} onChange={(event) => setCustomActivity(event.target.value)} placeholder="Ajouter une activité" />
              <button className="btn-secondary" onClick={addCustomActivity}>Ajouter</button>
            </div>
          </section>

          <section className="rounded-[1.5rem] bg-white p-5 shadow-soft sm:p-6">
            <h2 className="text-2xl font-semibold">Préférences du groupe</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Profils vérifiés uniquement", "Activité encadrée si nécessaire", "Niveau physique clairement indiqué", "Groupe calme et respectueux", "Pas d'alcool si souhaité", "Pauses personnelles respectées", "Repas halal souhaité", "Repas végétarien souhaité"].map((preference) => (
                <button className={`rounded-full px-3 py-2 text-sm font-semibold transition ${groupPreferences.includes(preference) ? "bg-forest-800 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"}`} key={preference} onClick={() => toggleValue(preference, groupPreferences, setGroupPreferences)}>
                  {preference}
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[1.5rem] bg-white p-5 shadow-soft sm:p-6">
            <h2 className="text-2xl font-semibold">Cadre du voyage</h2>
            <div className="mt-5 grid gap-4">
              <ChipSelect label="Dates ou durée" value={duration} options={["Week-end", "2-3 jours", "Une semaine", "10 jours", "Dates flexibles en août"]} onChange={setDuration} />
              <ChipSelect label="Budget estimé" value={budget} options={["Moins de 100 €", "100 à 200 €", "200 à 350 €", "350 à 500 €", "500 € et plus", "Budget à définir ensemble"]} onChange={setBudget} />
              <ChipSelect label="Niveau physique" value={level} options={["Facile", "Intermédiaire", "Sportif", "Très sportif"]} onChange={setLevel} />
              <ChipSelect label="Taille du groupe" value={groupSize} options={["Petit groupe : 3 à 5 personnes", "Groupe moyen : 6 à 8 personnes", "Grand groupe : 9 personnes et plus"]} onChange={setGroupSize} />
              <ChipSelect label="Type de groupe" value={groupType} options={["Groupe mixte", "Groupe women-only", "Groupe homme uniquement", "Peu importe"]} onChange={setGroupType} />
            </div>
            <div className="mt-5">
              <p className="text-sm font-semibold text-forest-700">Ambiance recherchée</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Calme & déconnexion", "Sport & dépassement", "Découverte locale", "Fun & aventure douce", "Contemplatif", "Premium & confort", "Spirituel / introspectif"].map((ambience) => (
                  <button className={`rounded-full px-3 py-2 text-sm font-semibold transition ${ambiences.includes(ambience) ? "bg-forest-800 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"}`} key={ambience} onClick={() => toggleValue(ambience, ambiences, setAmbiences)}>
                    {ambience}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[1.5rem] bg-white p-5 shadow-soft sm:p-6">
            <h2 className="text-2xl font-semibold">Zone de destination</h2>
            <DestinationMapPicker selectedZones={selectedZones} onToggleZone={toggleZone} onRemoveZone={(zone) => setSelectedZones((prev) => prev.filter((item) => item !== zone))} />
          </section>

          {showPreview && <CreateTripPreview trip={previewTrip} />}

          <div className="sticky bottom-4 grid gap-3 rounded-[1.5rem] bg-white/92 p-4 shadow-soft backdrop-blur sm:grid-cols-2">
            {publishError && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:col-span-2">{publishError}</p>}
            <button className="btn-secondary" onClick={() => setShowPreview((value) => !value)}>Prévisualiser le Trip</button>
            <button className="btn-primary disabled:cursor-wait disabled:opacity-70" disabled={isPublishing} onClick={publishTrip}>
              {isPublishing ? "Publication..." : "Publier le Trip"}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ChipSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-forest-700">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button className={`rounded-full px-3 py-2 text-sm font-semibold transition ${value === option ? "bg-forest-800 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"}`} key={option} onClick={() => onChange(option)}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function CreateTripPreview({ trip }: { trip: Trip }) {
  return (
    <article className="overflow-hidden rounded-[1.5rem] bg-white shadow-soft">
      <div className="relative h-60">
        <img className="h-full w-full object-cover" src={trip.image_url} alt={trip.destination} />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-900/90 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <p className="text-sm font-semibold text-white/85">{trip.destination}</p>
          <h3 className="mt-1 text-2xl font-semibold">{trip.title}</h3>
        </div>
      </div>
      <div className="p-5">
        <span className="pill">Trip communautaire</span>
        <p className="mt-3 text-sm leading-6 text-forest-700">{trip.brief}</p>
        <TagList tags={trip.ambience_tags} />
      </div>
    </article>
  );
}

function buildCommunityTrip({
  proposerName,
  title,
  destinationText,
  selectedZones,
  duration,
  budget,
  level,
  ambiences,
  activitiesWanted,
  groupPreferences,
  groupSize,
  groupType,
  creatorName,
  brief,
  coverUrl
}: {
  proposerName: string;
  title: string;
  destinationText: string;
  selectedZones: string[];
  duration: string;
  budget: string;
  level: string;
  ambiences: string[];
  activitiesWanted: string[];
  groupPreferences: string[];
  groupSize: string;
  groupType: string;
  creatorName: string;
  brief: string;
  coverUrl: string;
}): Trip {
  const [budgetMin, budgetMax] = budgetRangeToNumbers(budget);
  const destinationLabel = [selectedZones.join(" > "), destinationText.trim()].filter(Boolean).join(" > ") || "Destination à préciser";
  const displayName = creatorName.trim() || proposerName;
  const maxParticipants = maxParticipantsFromGroupSize(groupSize);
  return {
    id: `community-${Date.now()}`,
    title: title.trim() || "Nouveau Trip communautaire",
    destination: destinationLabel,
    image_url: coverUrl.trim() || inferCommunityTripImage(destinationLabel, activitiesWanted, ambiences),
    dates: duration,
    duration,
    budget_min: budgetMin,
    budget_max: budgetMax,
    physical_level: level,
    ambience_tags: Array.from(new Set([...ambiences, groupType])).slice(0, 4),
    compatibility_score: 91,
    interested_count: 1,
    status: "Projet utilisateur",
    description: brief,
    activities: activitiesWanted.length ? activitiesWanted : ["Activité locale", "Découverte nature"],
    generation_reasons: [`Proposée par ${displayName}`, ...groupPreferences.slice(0, 2)],
    matched_member_ids: ["sarah", "amine", "lea"],
    community: true,
    created_by: displayName,
    brief,
    card_type: "user_project",
    created_by_type: "user",
    planning_status: "planned",
    visibility: "public",
    moderation_status: "approved",
    creator_name: displayName,
    max_participants: maxParticipants,
    current_participants: 1
  };
}

function maxParticipantsFromGroupSize(label: string) {
  if (label.includes("Petit")) return 5;
  if (label.includes("moyen")) return 8;
  if (label.includes("Grand")) return 12;
  return 6;
}

function budgetRangeToNumbers(label: string): [number, number] {
  if (label.includes("Moins")) return [40, 100];
  if (label.includes("100 à 200")) return [100, 200];
  if (label.includes("200 à 350")) return [200, 350];
  if (label.includes("350 à 500")) return [350, 500];
  if (label.includes("500")) return [500, 900];
  return [0, 0];
}

function numbersToBudgetRange(min: number, max: number) {
  if (max <= 100) return "Moins de 100 €";
  if (max <= 200) return "100 à 200 €";
  if (max <= 350) return "200 à 350 €";
  if (max <= 500) return "350 à 500 €";
  if (min >= 500 || max > 500) return "500 € et plus";
  return "Budget à définir ensemble";
}

function inferZoneFromDestination(destinationLabel: string) {
  const normalized = normalizeUiText(destinationLabel);
  if (normalized.includes("occitanie")) return "Occitanie";
  if (normalized.includes("provence") || normalized.includes("azur") || normalized.includes("paca")) return "Provence-Alpes-Côte d'Azur";
  if (normalized.includes("bretagne")) return "Bretagne";
  if (normalized.includes("normandie")) return "Normandie";
  if (normalized.includes("alpes") || normalized.includes("vercors")) return "Auvergne-Rhône-Alpes";
  if (normalized.includes("basque") || normalized.includes("aspe") || normalized.includes("dordogne") || normalized.includes("pyrenees")) return "Nouvelle-Aquitaine";
  return "Peu m'importe";
}

function inferCommunityTripImage(destinationLabel: string, activitiesWanted: string[], ambiences: string[]) {
  const searchable = normalizeUiText(`${destinationLabel} ${activitiesWanted.join(" ")} ${ambiences.join(" ")}`);
  if (searchable.includes("bali") || searchable.includes("plage") || searchable.includes("surf")) return "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1600&q=80";
  if (searchable.includes("bretagne") || searchable.includes("mer")) return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80";
  if (searchable.includes("ecosse")) return "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80";
  if (searchable.includes("foret")) return "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=80";
  return "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80";
}

function Dashboard({
  trips: dashboardTrips,
  generatedMode,
  isGenerating,
  openTrip,
  onTripAction,
  onCreateTrip,
  userTripActions,
  favoriteTripIds,
  onToggleFavorite
}: {
  trips: Trip[];
  generatedMode: boolean;
  isGenerating: boolean;
  openTrip: (id: string) => void;
  onTripAction: (trip: Trip) => void | Promise<void>;
  onCreateTrip: () => void;
  userTripActions: UserTripActions | null;
  favoriteTripIds: string[];
  onToggleFavorite: (trip: Trip) => void | Promise<void>;
}) {
  const [activeSection, setActiveSection] = useState<"trips" | "explore">("trips");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [openFilter, setOpenFilter] = useState<ResultFilterKey | null>(null);
  const [filterAnswers, setFilterAnswers] = useState<Record<string, string | string[]>>({
    availability: [],
    destinationZones: []
  });
  const userProjectTrips = useMemo(() => dashboardTrips.filter((trip) => getTripCardType(trip) === "user_project"), [dashboardTrips]);
  const catalogTrips = useMemo(() => dashboardTrips.filter((trip) => getTripCardType(trip) === "catalog"), [dashboardTrips]);
  const sectionTrips = activeSection === "trips" ? userProjectTrips : catalogTrips;
  const activeFilterTags = useMemo(() => buildActiveResultFilterTags(activeFilters, filterAnswers), [activeFilters, filterAnswers]);
  const filteredTrips = useMemo(() => filterTripsByResultFilters(sectionTrips, activeFilterTags), [activeFilterTags, sectionTrips]);
  const sectionSubtitle = activeSection === "trips"
    ? "Les voyages créés par les membres, avec un créateur, une intention et un groupe à rejoindre."
    : "Des idées de voyage catalogue à liker, rejoindre avec les intéressés ou transformer en vrai Trip.";
  const toggleResultFilter = (filter: string) => {
    setActiveFilters((prev) => (prev.includes(filter) ? prev.filter((item) => item !== filter) : [...prev, filter]));
  };
  const removeResultFilter = (filter: string) => {
    setActiveFilters((prev) => prev.filter((item) => item !== filter));
    setFilterAnswers((prev) => ({
      ...prev,
      availability: Array.isArray(prev.availability) ? prev.availability.filter((item) => item !== filter) : prev.availability,
      destinationZones: Array.isArray(prev.destinationZones) ? prev.destinationZones.filter((item) => item !== filter) : prev.destinationZones
    }));
  };
  const clearResultFilters = () => {
    setActiveFilters([]);
    setFilterAnswers((prev) => ({ ...prev, availability: [], destinationZones: [] }));
  };
  const switchSection = (section: "trips" | "explore") => {
    setActiveSection(section);
    setOpenFilter(null);
  };

  return (
    <section className="container-page py-10">
      <div className="overflow-hidden rounded-[2rem] bg-forest-900 text-white shadow-soft">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="inline-flex rounded-full bg-white/12 px-4 py-2 text-sm font-bold text-sun">Explorer les Trips</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold sm:text-5xl">Découvre des idées de voyage et des projets proposés par les membres.</h1>
            <p className="mt-4 max-w-2xl text-white/75">
              {generatedMode ? "Des aventures adaptées à ton profil, avec un score de match sur chaque card." : "Explore, filtre, sauvegarde, rejoins les intéressés ou crée ton propre Trip."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: Compass, title: "Explorer", text: "Idées catalogue à co-construire" },
              { icon: Users, title: "Rejoindre", text: "Projets concrets de membres" },
              { icon: Heart, title: "Sauvegarder", text: "Favoris et match visibles" }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article className="rounded-[1.15rem] bg-white/10 p-4 backdrop-blur" key={item.title}>
                  <Icon className="text-sun" size={20} />
                  <h3 className="mt-3 font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-white/70">{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Résultats</h2>
          <p className="mt-1 text-sm font-semibold text-forest-700">Affinez avec les filtres, puis ouvrez le Trip qui vous attire.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-forest-700 shadow-sm">{filteredTrips.length} proposition{filteredTrips.length > 1 ? "s" : ""}</span>
          <button className="btn-primary py-2" onClick={onCreateTrip}>Créer un Trip</button>
        </div>
      </div>
      <div className="mt-6 grid gap-3 rounded-[1.5rem] bg-white p-3 shadow-sm sm:grid-cols-2">
        <button
          className={`rounded-[1.15rem] p-4 text-left transition ${activeSection === "trips" ? "bg-forest-900 text-white" : "bg-forest-50 text-forest-900 hover:bg-forest-100"}`}
          onClick={() => switchSection("trips")}
        >
          <span className="text-sm font-bold opacity-80">Section Trip</span>
          <span className="mt-1 block text-2xl font-semibold">Trips</span>
          <span className="mt-2 block text-sm leading-6 opacity-80">{userProjectTrips.length} projet{userProjectTrips.length > 1 ? "s" : ""} créé{userProjectTrips.length > 1 ? "s" : ""} par les membres</span>
        </button>
        <button
          className={`rounded-[1.15rem] p-4 text-left transition ${activeSection === "explore" ? "bg-forest-900 text-white" : "bg-forest-50 text-forest-900 hover:bg-forest-100"}`}
          onClick={() => switchSection("explore")}
        >
          <span className="text-sm font-bold opacity-80">Section Explore</span>
          <span className="mt-1 block text-2xl font-semibold">Explore</span>
          <span className="mt-2 block text-sm leading-6 opacity-80">{catalogTrips.length} idée{catalogTrips.length > 1 ? "s" : ""} de voyage à co-construire</span>
        </button>
      </div>
      <p className="mt-4 text-sm font-semibold text-forest-700">{sectionSubtitle}</p>
      <ResultFilters
        activeFilters={activeFilterTags}
        filterAnswers={filterAnswers}
        openFilter={openFilter}
        resultCount={filteredTrips.length}
        totalCount={sectionTrips.length}
        setFilterAnswers={setFilterAnswers}
        onClear={clearResultFilters}
        onRemove={removeResultFilter}
        onToggle={toggleResultFilter}
        onTogglePanel={(filter) => setOpenFilter((current) => (current === filter ? null : filter))}
      />
      {isGenerating ? (
        <div className="mt-8 rounded-[1.5rem] bg-white p-8 text-center shadow-soft">
          <h2 className="text-2xl font-semibold">Recherche des activités locales...</h2>
          <p className="mx-auto mt-3 max-w-xl text-forest-700">On compose les meilleures options autour de tes envies.</p>
        </div>
      ) : (
        filteredTrips.length === 0 && activeSection === "trips" ? (
          <div className="mt-8 rounded-[1.5rem] bg-white p-8 text-center shadow-soft">
            <h2 className="text-2xl font-semibold">Aucun Trip membre pour ces filtres.</h2>
            <p className="mx-auto mt-3 max-w-xl text-forest-700">Tu peux créer le premier Trip ou passer dans Explore pour partir d'une idée de voyage.</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button className="btn-primary" onClick={onCreateTrip}>Créer un Trip</button>
              <button className="btn-secondary" onClick={() => switchSection("explore")}>Voir Explore</button>
            </div>
          </div>
        ) : (
          <TripGrid trips={filteredTrips} openTrip={openTrip} onTripAction={onTripAction} userTripActions={userTripActions} favoriteTripIds={favoriteTripIds} onToggleFavorite={onToggleFavorite} />
        )
      )}
    </section>
  );
}

function ResultFilters({
  activeFilters,
  filterAnswers,
  openFilter,
  resultCount,
  totalCount,
  setFilterAnswers,
  onClear,
  onRemove,
  onToggle,
  onTogglePanel
}: {
  activeFilters: string[];
  filterAnswers: Record<string, string | string[]>;
  openFilter: ResultFilterKey | null;
  resultCount: number;
  totalCount: number;
  setFilterAnswers: Dispatch<SetStateAction<Record<string, string | string[]>>>;
  onClear: () => void;
  onRemove: (filter: string) => void;
  onToggle: (filter: string) => void;
  onTogglePanel: (filter: ResultFilterKey) => void;
}) {
  return (
    <section className="mt-6 rounded-[1.25rem] bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {resultFilterButtons.map((filter) => {
          const active = openFilter === filter.key;
          return (
            <button
              className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition ${active ? "bg-forest-800 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"}`}
              key={filter.key}
              onClick={() => onTogglePanel(filter.key)}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {openFilter && (
        <ResultFilterPanel
          activeFilters={activeFilters}
          filterAnswers={filterAnswers}
          openFilter={openFilter}
          setFilterAnswers={setFilterAnswers}
          onToggle={onToggle}
        />
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-forest-700">{resultCount}/{totalCount} Trips</span>
        {activeFilters.map((filter) => (
          <button className="inline-flex items-center gap-2 rounded-full bg-forest-800 px-3 py-1.5 text-xs font-semibold text-white" key={filter} onClick={() => onRemove(filter)}>
            {filter}
            <X size={12} />
          </button>
        ))}
        {activeFilters.length > 0 && (
          <button className="text-sm font-semibold text-forest-700 underline underline-offset-4" onClick={onClear}>
            Réinitialiser
          </button>
        )}
      </div>
    </section>
  );
}

function ResultFilterPanel({
  activeFilters,
  filterAnswers,
  openFilter,
  setFilterAnswers,
  onToggle
}: {
  activeFilters: string[];
  filterAnswers: Record<string, string | string[]>;
  openFilter: ResultFilterKey;
  setFilterAnswers: Dispatch<SetStateAction<Record<string, string | string[]>>>;
  onToggle: (filter: string) => void;
}) {
  if (openFilter === "dates") {
    return (
      <div className="mt-4 border-t border-forest-100 pt-4">
        <AvailabilityPicker answers={filterAnswers} setAnswers={setFilterAnswers} />
      </div>
    );
  }

  if (openFilter === "destination") {
    const selectedZones = Array.isArray(filterAnswers.destinationZones) ? filterAnswers.destinationZones : [];
    const toggleZone = (value: string) => {
      setFilterAnswers((prev) => {
        const list = Array.isArray(prev.destinationZones) ? prev.destinationZones : [];
        if (value === "Peu m'importe") return { ...prev, destinationZones: [] };
        const next = list.includes(value) ? list.filter((item) => item !== value) : [...list.filter((item) => item !== "Peu m'importe"), value];
        return { ...prev, destinationZones: next };
      });
    };
    const removeZone = (value: string) => {
      setFilterAnswers((prev) => {
        const list = Array.isArray(prev.destinationZones) ? prev.destinationZones : [];
        return { ...prev, destinationZones: list.filter((item) => item !== value) };
      });
    };

    return (
      <div className="mt-4 border-t border-forest-100 pt-4">
        <DestinationMapPicker selectedZones={selectedZones} onToggleZone={toggleZone} onRemoveZone={removeZone} />
      </div>
    );
  }

  if (openFilter === "plus") {
    return (
      <div className="mt-4 grid gap-4 border-t border-forest-100 pt-4">
        {moreFilterGroups.map((group) => (
          <section className="rounded-[1rem] bg-forest-50 p-3" key={group.title}>
            <h3 className="text-sm font-bold text-forest-800">{group.title}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {group.options.map((option) => {
                const active = activeFilters.includes(option);
                return (
                  <button
                    className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${active ? "bg-forest-800 text-white" : "bg-white text-forest-800 hover:bg-forest-100"}`}
                    key={option}
                    onClick={() => onToggle(option)}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    );
  }

  const options = resultFilterOptions[openFilter];
  return (
    <div className="mt-4 border-t border-forest-100 pt-4">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = activeFilters.includes(option);
          return (
            <button
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${active ? "bg-forest-800 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"}`}
              key={option}
              onClick={() => onToggle(option)}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function buildActiveResultFilterTags(filters: string[], answers: Record<string, string | string[]>) {
  const availability = Array.isArray(answers.availability) ? answers.availability : [];
  const destinationZones = Array.isArray(answers.destinationZones) ? answers.destinationZones : [];
  const tags = [
    ...filters,
    ...availability.filter((item) => item !== "Peu m'importe"),
    ...destinationZones.filter((item) => item !== "Peu m'importe")
  ];
  return Array.from(new Set(tags));
}

function filterTripsByResultFilters(tripsToFilter: Trip[], filters: string[]) {
  if (filters.length === 0) return tripsToFilter;
  return tripsToFilter.filter((trip) => filters.every((filter) => tripMatchesResultFilter(trip, filter)));
}

function tripMatchesResultFilter(trip: Trip, filter: string) {
  const normalizedFilter = normalizeUiText(filter);
  const searchable = normalizeUiText([
    trip.title,
    trip.destination,
    trip.dates,
    trip.duration,
    trip.physical_level,
    trip.description,
    trip.brief ?? "",
    trip.created_by ?? "",
    trip.status,
    ...trip.ambience_tags,
    ...trip.activities
  ].join(" "));
  const declarativeFilters = moreFilterGroups.flatMap((group) => group.options).map(normalizeUiText);

  if (declarativeFilters.includes(normalizedFilter)) return true;

  if (isIsoDate(filter)) return true;
  if (["30 km max", "100 km max", "300 km max", "depart bordeaux", "depart paris", "depart lyon", "depart toulouse"].includes(normalizedFilter)) {
    return true;
  }
  if (normalizedFilter === "tous") return true;
  if (normalizedFilter === "idees de voyage") return getTripCardType(trip) === "catalog";
  if (normalizedFilter === "projets utilisateurs") return getTripCardType(trip) === "user_project";
  if (normalizedFilter === "moins de 100 €") return trip.budget_max <= 100;
  if (normalizedFilter === "100 a 200 €") return trip.budget_max <= 200;
  if (normalizedFilter === "200 a 350 €") return trip.budget_max <= 350;
  if (normalizedFilter === "350 a 500 €") return trip.budget_max <= 500;
  if (normalizedFilter === "500 € et plus") return trip.budget_max >= 500;
  if (normalizedFilter.startsWith("budget max")) {
    const match = normalizedFilter.match(/(\d+)/);
    return match ? trip.budget_max <= Number(match[1]) : true;
  }
  if (normalizedFilter === "journee") return searchable.includes("journee") || searchable.includes("samedi");
  if (normalizedFilter === "week-end") return searchable.includes("week-end") || searchable.includes("weekend") || searchable.includes("vendredi");
  if (normalizedFilter === "2-3 jours") return searchable.includes("2 jours") || searchable.includes("3 jours") || searchable.includes("2-3 jours");
  if (normalizedFilter === "semaine") return searchable.includes("semaine");
  if (normalizedFilter === "petit groupe : 3 a 5 personnes") return trip.interested_count <= 8;
  if (normalizedFilter === "groupe moyen : 6 a 8 personnes") return trip.interested_count >= 6 && trip.interested_count <= 10;
  if (normalizedFilter === "grand groupe : 9 personnes et plus") return trip.interested_count >= 9;
  if (normalizedFilter === "ambiance calme") return searchable.includes("calme") || searchable.includes("deconnexion");
  if (normalizedFilter === "calme & deconnexion") return searchable.includes("calme") || searchable.includes("deconnexion");
  if (normalizedFilter === "ambiance sportive") return searchable.includes("sport") || searchable.includes("depassement");
  if (normalizedFilter === "sport & depassement") return searchable.includes("sport") || searchable.includes("depassement");
  if (normalizedFilter === "fun & aventure douce") return searchable.includes("fun") || searchable.includes("aventure douce");
  if (normalizedFilter === "premium/confort") return searchable.includes("premium") || searchable.includes("confort");
  if (normalizedFilter === "premium & confort") return searchable.includes("premium") || searchable.includes("confort");
  if (normalizedFilter === "spirituel / introspectif") return true;
  if (normalizedFilter === "debutant") return searchable.includes("facile") || searchable.includes("debutant") || searchable.includes("tres facile");
  if (normalizedFilter === "activites a faible risque") return true;
  if (normalizedFilter === "activites encadrees par un professionnel") return searchable.includes("encadre") || trip.compatibility_score >= 80;
  if (normalizedFilter === "parc naturel") return searchable.includes("parc") || searchable.includes("vercors");
  if (normalizedFilter === "village / patrimoine local") return searchable.includes("village") || searchable.includes("patrimoine") || searchable.includes("local");
  if (normalizedFilter === "destination depaysante") return trip.compatibility_score >= 85;
  if (["repas halal souhaite", "repas vegetarien souhaite", "pas d'alcool dans le groupe", "pauses personnelles respectees", "valeurs similaires", "groupe calme et respectueux", "hebergement simple", "gite / refuge", "hotel confortable", "tente / bivouac", "securite renforcee", "profils verifies uniquement"].includes(normalizedFilter)) {
    return true;
  }

  const zoneAliases: Record<string, string[]> = {
    "nouvelle-aquitaine": ["pyrenees", "aspe", "basque", "dordogne", "gironde", "arcachon", "nouvelle-aquitaine"],
    occitanie: ["pyrenees", "occitanie"],
    "auvergne-rhone-alpes": ["vercors", "alpes", "auvergne-rhone-alpes"],
    bretagne: ["bretagne"],
    normandie: ["normandie"],
    "provence-alpes-cote d'azur": ["provence", "azur", "alpes"],
    "ile-de-france": ["fontainebleau", "ile-de-france"],
    "espagne du nord": ["basque", "pyrenees", "montagne"],
    catalogne: ["pyrenees", "mer", "montagne"],
    baviere: ["alpes", "montagne", "lac"],
    "suisse romande": ["alpes", "montagne", "lac"]
  };
  if (zoneAliases[normalizedFilter]) return zoneAliases[normalizedFilter].some((alias) => searchable.includes(alias));

  return searchable.includes(normalizedFilter);
}

function normalizeUiText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function TripGrid({
  trips: tripList,
  openTrip,
  onTripAction,
  userTripActions,
  favoriteTripIds,
  onToggleFavorite
}: {
  trips: Trip[];
  openTrip: (id: string) => void;
  onTripAction: (trip: Trip) => void | Promise<void>;
  userTripActions: UserTripActions | null;
  favoriteTripIds: string[];
  onToggleFavorite: (trip: Trip) => void | Promise<void>;
}) {
  if (tripList.length === 0) {
    return (
      <div className="mt-8 rounded-[1.5rem] bg-white p-8 text-center shadow-soft">
        <h2 className="text-2xl font-semibold">Aucun Trip ne correspond exactement à ces filtres.</h2>
        <p className="mx-auto mt-3 max-w-xl text-forest-700">Élargis une préférence et on te proposera plus d'options.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {tripList.map((trip) => {
        const actionState = getTripActionState(trip, userTripActions);
        const isFavorite = favoriteTripIds.includes(trip.id);
        return (
        <article className="group relative overflow-hidden rounded-[1.5rem] bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-xl" key={trip.id}>
          <button
            className={`absolute right-4 top-[4.25rem] z-10 grid h-11 w-11 place-items-center rounded-full shadow-sm backdrop-blur transition ${isFavorite ? "bg-sun text-white" : "bg-white/90 text-forest-800 hover:bg-white"}`}
            onClick={() => onToggleFavorite(trip)}
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <Heart size={19} fill={isFavorite ? "currentColor" : "none"} />
          </button>
          <button className="relative block h-80 w-full overflow-hidden text-left" onClick={() => openTrip(trip.id)} aria-label={`Voir le détail de ${trip.title}`}>
            <img className="h-full w-full object-cover transition duration-700 group-hover:scale-105" src={trip.image_url} alt={trip.destination} />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-900/90 via-forest-900/25 to-transparent" />
            <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-2 text-xs font-bold text-forest-900 backdrop-blur">{trip.compatibility_score}% match</span>
            <span className={`absolute right-4 top-4 rounded-full px-3 py-2 text-xs font-bold shadow-sm ${getTripCardType(trip) === "user_project" ? "bg-sun text-white" : "bg-white/90 text-forest-900 backdrop-blur"}`}>
              {getTripTypeLabel(trip)}
            </span>
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <p className="text-sm font-semibold text-white/85">{trip.destination}</p>
              <h3 className="mt-1 text-2xl font-semibold leading-tight">{trip.title}</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/18 px-3 py-1.5 text-xs font-semibold backdrop-blur">{getTripDateLabel(trip)}</span>
                <span className="rounded-full bg-white/18 px-3 py-1.5 text-xs font-semibold backdrop-blur">{trip.budget_min}-{trip.budget_max} €</span>
                <span className="rounded-full bg-white/18 px-3 py-1.5 text-xs font-semibold backdrop-blur">{trip.physical_level}</span>
              </div>
            </div>
          </button>
          <div className="p-5">
            <p className="mb-3 text-sm font-semibold text-forest-700">{getTripContextText(trip)}</p>
            <div className="flex items-center justify-between gap-3">
              <div className="flex -space-x-3">
                {getTripMembers(trip).slice(0, 3).map((member) => (
                  <img className="h-9 w-9 rounded-full border-2 border-white object-cover" src={member.photo_url} alt={member.name} key={member.id} />
                ))}
              </div>
              <span className="text-sm font-semibold text-forest-700">{trip.interested_count} membres compatibles</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold text-forest-700">
              <span>{getTripDurationLabel(trip)}</span>
              <span className="text-forest-300">•</span>
              <span>Profils vérifiés</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {trip.ambience_tags.slice(0, 2).map((tag) => <span className="pill text-xs" key={tag}>{tag}</span>)}
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
              <button className="btn-primary w-full" onClick={() => onTripAction(trip)}>{getTripActionLabel(trip, actionState)}</button>
              <button className="btn-secondary w-full py-3 sm:w-auto" onClick={() => openTrip(trip.id)}>Détails</button>
            </div>
          </div>
        </article>
        );
      })}
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-forest-50 p-3">
      <p className="text-xs font-semibold text-forest-600">{label}</p>
      <p className="mt-1 font-semibold text-forest-900">{value}</p>
    </div>
  );
}

function TripDetail({
  trip,
  catalogActivities,
  validatedMembers,
  joinTrip,
  userTripActions,
  isFavorite,
  onToggleFavorite,
  onShareTrip,
  creatorProfile,
  onViewProfile
}: {
  trip: Trip;
  catalogActivities: MockLocalActivity[];
  validatedMembers: UserProfile[];
  joinTrip: (trip: Trip) => void | Promise<void>;
  userTripActions: UserTripActions | null;
  isFavorite: boolean;
  onToggleFavorite: (trip: Trip) => void | Promise<void>;
  onShareTrip: (trip: Trip) => void;
  creatorProfile: UserProfileRecord | null;
  onViewProfile: (profileId: string) => void;
}) {
  const tripActivities = getTripActivities(trip, catalogActivities);
  const actionState = getTripActionState(trip, userTripActions);

  return (
    <>
      <section className="relative min-h-[560px] overflow-hidden">
        <img className="absolute inset-0 h-full w-full object-cover" src={trip.image_url} alt={trip.destination} />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-900 via-forest-900/45 to-forest-900/5" />
        <div className="container-page relative flex min-h-[560px] items-end py-10 text-white">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-full bg-white/18 px-4 py-2 text-sm font-semibold backdrop-blur">{trip.status}</p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-6xl">{trip.title}</h1>
            <p className="mt-3 text-lg font-medium text-white/85">{trip.destination}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button className="btn-primary bg-white text-forest-900 hover:bg-forest-50" onClick={() => joinTrip(trip)}>
                {getTripActionLabel(trip, actionState)}
              </button>
              <button className="rounded-full bg-white/18 px-5 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/25" onClick={() => onToggleFavorite(trip)}>
                {isFavorite ? "Sauvegardée" : "Sauvegarder"}
              </button>
              <button className="inline-flex items-center gap-2 rounded-full bg-white/18 px-5 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/25" onClick={() => onShareTrip(trip)}>
                <Share2 size={18} />
                Partager
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page space-y-10 py-10">
        <TripTypeSection trip={trip} creatorProfile={creatorProfile} onViewProfile={onViewProfile} />
        {trip.community && (
          <section className="rounded-[1.5rem] bg-white p-5 shadow-soft sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="pill">Proposée par {trip.created_by ?? "un membre"}</p>
                <h2 className="mt-3 text-3xl font-semibold">L'esprit du Trip</h2>
                <p className="mt-3 max-w-3xl leading-7 text-forest-700">{trip.brief ?? trip.description}</p>
              </div>
              <div className="grid gap-2 text-sm font-semibold text-forest-700 sm:text-right">
                <span>{trip.physical_level}</span>
                <span>{trip.budget_min} à {trip.budget_max} €</span>
                <span>{getTripDateLabel(trip)}</span>
              </div>
            </div>
          </section>
        )}
        <ActivitiesSection activities={tripActivities} />
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <TripMembersSection members={validatedMembers} />
          <BudgetSection trip={trip} />
        </div>
      </section>
    </>
  );
}

function TripTypeSection({
  trip,
  creatorProfile,
  onViewProfile
}: {
  trip: Trip;
  creatorProfile: UserProfileRecord | null;
  onViewProfile: (profileId: string) => void;
}) {
  const isUserProject = getTripCardType(trip) === "user_project";
  const creatorUser = creatorProfile ? profileRecordToUserProfile(creatorProfile) : null;
  return (
    <section className="rounded-[1.5rem] bg-white p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="pill">{getTripTypeLabel(trip)}</p>
          <h2 className="mt-3 text-3xl font-semibold">{isUserProject ? "Départ en préparation" : "À co-construire"}</h2>
          <p className="mt-3 max-w-3xl leading-7 text-forest-700">
            {isUserProject
              ? "Ce Trip a été proposé par un membre qui a déjà une idée précise du voyage et cherche des personnes pour l'accompagner."
              : "Cette proposition sert de point de départ. Rejoins les personnes intéressées pour organiser les dates, le transport, l'hébergement et les activités ensemble."}
          </p>
        </div>
        <div className="grid gap-2 text-sm font-semibold text-forest-700 lg:min-w-64">
          {isUserProject && (
            creatorUser ? (
              <button
                className="mb-2 flex items-center gap-3 rounded-[1rem] bg-forest-50 p-3 text-left transition hover:bg-forest-100"
                onClick={() => onViewProfile(creatorUser.id)}
              >
                <img className="h-12 w-12 rounded-full object-cover" src={creatorUser.photo_url} alt={creatorUser.name} />
                <span>
                  <span className="block text-xs text-forest-500">Créé par</span>
                  <span className="block text-base text-forest-900">{creatorUser.name}</span>
                  <span className="block text-xs text-forest-600">{creatorUser.city}</span>
                </span>
              </button>
            ) : (
              <span>Créé par : {trip.creator_name ?? trip.created_by ?? "un membre"}</span>
            )
          )}
          {trip.departure_city && <span>Départ : {trip.departure_city}</span>}
          <span>Statut : {getPlanningStatusLabel(trip.planning_status ?? (isUserProject ? "planned" : "idea"))}</span>
          <span>{getTripDateLabel(trip)}</span>
          {trip.max_participants && (
            <span>
              Participants : {trip.current_participants ?? 0}/{trip.max_participants}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function ActivitiesSection({ activities: tripActivities }: { activities: Array<Activity | MockLocalActivity> }) {
  return (
    <section>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="pill">Expériences</p>
          <h2 className="mt-3 text-3xl font-semibold">Activités proposées pour ce Trip</h2>
        </div>
        <span className="text-sm font-semibold text-forest-700">{tripActivities.length} idées sur place</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tripActivities.map((activity) => <ActivityCard activity={activity} key={activity.id} />)}
      </div>
    </section>
  );
}

function TripMembersSection({ members: tripMembers }: { members: UserProfile[] }) {
  return (
    <section>
      <div className="mb-5">
        <p className="pill">La tribu</p>
        <h2 className="mt-3 text-3xl font-semibold">Membres qui ont validé le Trip</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {tripMembers.map((member) => (
          <div className="flex items-center gap-4 rounded-[1.25rem] bg-white p-4 shadow-soft" key={member.id}>
            <img className="h-16 w-16 rounded-2xl object-cover" src={member.photo_url} alt={member.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-semibold">{member.name}, {member.age_range}</h3>
                {member.verified && <BadgeCheck className="shrink-0 text-forest-700" size={17} />}
              </div>
              <p className="mt-1 text-sm text-forest-700">{member.city} · {member.adventure_style}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {member.badges.slice(0, 2).map((badge) => <span className="pill text-xs" key={badge}>{badge}</span>)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BudgetSection({ trip }: { trip: Trip }) {
  return (
    <section className="rounded-[1.5rem] bg-white p-5 shadow-soft sm:p-6">
      <p className="pill">Budget</p>
      <h2 className="mt-3 text-3xl font-semibold">Budget estimé</h2>
      <div className="mt-5 rounded-[1.25rem] bg-forest-900 p-5 text-white">
        <p className="text-sm font-semibold text-white/75">Total par personne</p>
        <p className="mt-2 text-4xl font-semibold">{trip.budget_min} à {trip.budget_max} €</p>
      </div>
      <BudgetRows rows={[["Transport", "50 à 90 €"], ["Hébergement", "60 à 120 €"], ["Activités", "40 à 120 €"], ["Repas", "50 à 80 €"]]} />
    </section>
  );
}

function getTripActivities(trip: Trip, catalogActivities: MockLocalActivity[]): Array<Activity | MockLocalActivity> {
  if (trip.community) {
    return trip.activities.map((activity, index) => ({
      id: `${trip.id}-activity-${index}`,
      destinationId: trip.id,
      name: activity,
      category: "Activité proposée",
      duration: "À définir",
      estimated_price: 0,
      physical_level: trip.physical_level,
      ambience: trip.ambience_tags,
      weather_compatible: ["soleil", "nuageux", "pluie"],
      risk: "faible",
      booking_required: false,
      group_friendly: true,
      description: "Activité proposée par le membre. L'app pourra l'enrichir via le Local Activity Graph.",
      image: trip.image_url,
      source: "mock"
    }));
  }

  if (trip.generated_activity_ids?.length) {
    return catalogActivities.filter((activity) => trip.generated_activity_ids?.includes(activity.id));
  }

  return activities;
}

function ConversationPage({
  conversation,
  go,
  currentUser,
  accessToken,
  isAuthenticated,
  onRequireAuth,
  onFormalizeTrip
}: {
  conversation: Conversation | null;
  go: (page: Page) => void;
  currentUser: UserProfile;
  accessToken?: string;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
  onFormalizeTrip: (trip: Trip) => void;
}) {
  const [draft, setDraft] = useState("");
  const [participants, setParticipants] = useState<UserProfile[]>(conversation?.participants ?? []);
  const [remoteMessages, setRemoteMessages] = useState<Conversation["messages"]>([]);
  const [chatNotice, setChatNotice] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setParticipants(conversation?.participants ?? []);
    setRemoteMessages([]);
    setChatNotice("");

    if (!conversation || !accessToken) return;

    let mounted = true;

    const loadConversationData = async () => {
      try {
        const [memberRows, messageRows] = await Promise.all([
          getConversationMembers(conversation.id, accessToken),
          getConversationMessages(conversation.id, accessToken)
        ]);
        const profileIds = [
          ...memberRows.map((member) => member.user_id),
          ...messageRows.map((message) => message.user_id)
        ];
        const profiles = await getProfilesByIds([...new Set(profileIds)], accessToken);
        const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

        const nextParticipants = memberRows.map((member) => (
          profileRecordToUserProfile(profileById.get(member.user_id) ?? fallbackProfileRecord(member.user_id))
        ));

        const nextMessages = messageRows.map((message) => {
          const profile = profileById.get(message.user_id);
          return {
            id: message.id,
            authorId: message.user_id,
            author: profile?.display_name ?? (message.user_id === currentUser.id ? currentUser.name : "Membre Tribu"),
            content: message.body,
            time: formatConversationTime(message.created_at)
          };
        });

        if (!mounted) return;
        if (nextParticipants.length > 0) setParticipants(nextParticipants);
        setRemoteMessages(nextMessages);
      } catch (error) {
        console.warn("Conversation indisponible.", error);
        if (mounted) setChatNotice("Impossible de synchroniser la conversation pour le moment.");
      }
    };

    loadConversationData();
    const interval = window.setInterval(loadConversationData, 4_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [accessToken, conversation, currentUser.id, currentUser.name]);

  if (!conversation) {
    return (
      <section className="container-page py-10">
        <div className="card mx-auto max-w-2xl p-6 text-center">
          <MessageCircle className="mx-auto text-forest-700" size={42} />
          <h1 className="mt-4 text-3xl font-semibold">Aucune conversation active</h1>
          <p className="mt-3 text-forest-700">Rejoins un Trip pour créer automatiquement une conversation avec les membres qui l'ont validée.</p>
          <button className="btn-primary mt-6" onClick={() => go("dashboard")}>Voir les Trips</button>
        </div>
      </section>
    );
  }

  const displayMessages = [...(conversation.messages ?? []), ...remoteMessages];

  const sendMessage = async () => {
    if (!draft.trim()) return;
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    if (!accessToken) {
      setChatNotice("Connexion Supabase indisponible. Reconnecte-toi pour envoyer un message.");
      return;
    }

    const body = draft.trim();
    setDraft("");
    setIsSending(true);
    setChatNotice("");

    try {
      const message = await sendConversationMessage(conversation.id, currentUser.id, body, accessToken);
      setRemoteMessages((prev) => [
        ...prev.filter((item) => item.id !== message.id),
        {
          id: message.id,
          authorId: message.user_id,
          author: currentUser.name,
          content: message.body,
          time: formatConversationTime(message.created_at)
        }
      ]);
    } catch (error) {
      console.error("Message non envoyé.", error);
      setDraft(body);
      setChatNotice(error instanceof Error ? error.message : "Impossible d'envoyer le message.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="container-page py-10">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="space-y-6">
          <div className="card overflow-hidden">
            <img className="h-48 w-full object-cover" src={conversation.trip.image_url} alt={conversation.trip.destination} />
            <div className="p-5">
              <p className="pill">Conversation créée</p>
              <h1 className="mt-4 text-3xl font-semibold">{conversation.trip.title}</h1>
              <p className="mt-2 text-forest-700">{conversation.trip.destination}</p>
              <p className="mt-4 text-sm text-forest-700">
                Créée {conversation.createdAt.toLowerCase()} avec {participants.length} membre{participants.length > 1 ? "s" : ""} ayant validé le Trip.
              </p>
              {getTripCardType(conversation.trip) === "catalog" && (
                <button className="btn-primary mt-5 w-full" onClick={() => onFormalizeTrip(conversation.trip)}>
                  Créer un Trip à partir de cette idée
                </button>
              )}
              <button className="btn-secondary mt-5 w-full" onClick={() => go("trip")}>Retour au Trip</button>
            </div>
          </div>
          <Panel title="Participants">
            <div className="grid gap-3">
              {participants.map((member) => (
                <div className="flex items-center justify-between rounded-lg bg-forest-50 p-3" key={member.id}>
                  <div className="flex items-center gap-3">
                    <img className="h-10 w-10 rounded-full object-cover" src={member.photo_url} alt={member.name} />
                    <div>
                      <p className="font-semibold">{member.name}</p>
                      <p className="text-sm text-forest-700">{member.adventure_style}</p>
                    </div>
                  </div>
                  {member.verified && <BadgeCheck className="text-forest-700" size={18} />}
                </div>
              ))}
            </div>
          </Panel>
        </aside>

        <div className="card flex min-h-[680px] flex-col overflow-hidden">
          <div className="border-b border-forest-100 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-forest-700">Chat de groupe modéré</p>
                <h2 className="text-2xl font-semibold">Préparer l'aventure ensemble</h2>
              </div>
              <span className="pill">{participants.length} membre{participants.length > 1 ? "s" : ""}</span>
            </div>
            {chatNotice && <p className="mt-3 rounded-lg bg-sun/15 px-3 py-2 text-sm font-semibold text-forest-800">{chatNotice}</p>}
          </div>
          <div className="flex-1 space-y-4 bg-forest-50 p-4 sm:p-6">
            {displayMessages.map((message) => (
              <div
                className={`rounded-lg p-4 ${message.system ? "bg-skysoft text-forest-900" : message.authorId === currentUser.id ? "ml-auto max-w-[88%] bg-forest-800 text-white" : "max-w-[88%] bg-white"}`}
                key={message.id}
              >
                <div className="mb-1 flex items-center justify-between gap-4 text-xs font-semibold opacity-80">
                  <span>{message.author}</span>
                  <span>{message.time}</span>
                </div>
                <p>{message.content}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-forest-100 bg-white p-4">
            <div className="flex gap-3">
              <input
                className="min-w-0 flex-1 rounded-lg border border-forest-100 bg-forest-50 px-4 py-3 outline-none focus:ring-2 focus:ring-forest-600"
                placeholder="Écrire au groupe..."
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
              if (event.key === "Enter") sendMessage();
                }}
                disabled={isSending}
              />
              <button className="btn-primary px-4 disabled:cursor-wait disabled:opacity-60" disabled={isSending} onClick={sendMessage} aria-label="Envoyer le message">
                <Send size={18} />
              </button>
            </div>
            <p className="mt-3 text-xs text-forest-700">Tu peux confirmer le transport, poser une question sécurité ou proposer une autre activité avant de réserver quoi que ce soit.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

type CompatibleTribeProfile = UserProfile & {
  compatibilityScore: number;
  compatibilityTags: string[];
  publicTrips: Trip[];
};

function Community({
  currentUser,
  trips: availableTrips,
  favoriteTrips,
  profiles,
  tribeRequests,
  tripInvitations,
  joinRequests,
  accessToken,
  isAuthenticated,
  initialTab,
  onRequireAuth,
  onTribeOpened,
  onSendTribeRequest,
  onUpdateTribeConnection,
  onAcceptJoinRequest,
  onRejectJoinRequest,
  onUpdateTripInvitation,
  onViewProfile,
  onInviteToTrip
}: {
  currentUser: UserProfile;
  trips: Trip[];
  favoriteTrips: Trip[];
  profiles: UserProfileRecord[];
  tribeRequests: TribeRequestBundle;
  tripInvitations: TripInvitation[];
  joinRequests: UserTripActions["joinRequests"];
  accessToken?: string;
  isAuthenticated: boolean;
  initialTab: CommunityTab;
  onRequireAuth: () => void;
  onTribeOpened: () => void;
  onSendTribeRequest: (member: UserProfile) => void | Promise<void>;
  onUpdateTribeConnection: (connectionId: string, action: "accept" | "reject" | "cancel") => void | Promise<void>;
  onAcceptJoinRequest: (requestId: string) => void | Promise<void>;
  onRejectJoinRequest: (requestId: string) => void | Promise<void>;
  onUpdateTripInvitation: (invitationId: string, action: "accept" | "reject") => void | Promise<void>;
  onViewProfile: (profileId: string) => void;
  onInviteToTrip: (trip: Trip, member: UserProfile) => void | Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<CommunityTab>(initialTab);
  const [activeTribeMemberId, setActiveTribeMemberId] = useState<string | null>(null);
  const [inviteTarget, setInviteTarget] = useState<CompatibleTribeProfile | null>(null);
  const profileUsers = useMemo(() => {
    const remoteProfiles = profiles.map(profileRecordToUserProfile);
    return remoteProfiles.length ? remoteProfiles : [...members, ...tribeExtraMembers];
  }, [profiles]);
  const relationIds = useMemo(() => new Set([
    ...tribeRequests.accepted.map((request) => request.requester_id === currentUser.id ? request.receiver_id : request.requester_id),
    ...tribeRequests.sent.map((request) => request.receiver_id),
    ...tribeRequests.received.map((request) => request.requester_id)
  ]), [currentUser.id, tribeRequests]);
  const tribeMemberIds = useMemo(() => new Set(
    tribeRequests.accepted.map((request) => request.requester_id === currentUser.id ? request.receiver_id : request.requester_id)
  ), [currentUser.id, tribeRequests.accepted]);
  const compatiblePeople = useMemo(
    () => getCompatiblePeople(currentUser, profileUsers, availableTrips).filter((member) => !relationIds.has(member.id)),
    [availableTrips, currentUser, profileUsers, relationIds]
  );
  const filteredPeople = compatiblePeople;
  const myTribePeople = useMemo(
    () => getCompatiblePeople(currentUser, profileUsers.filter((profile) => tribeMemberIds.has(profile.id)), availableTrips),
    [availableTrips, currentUser, profileUsers, tribeMemberIds]
  );
  const receivedTripInvitations = useMemo(
    () => tripInvitations.filter((invitation) => invitation.invited_user_id === currentUser.id),
    [currentUser.id, tripInvitations]
  );
  const sentTripInvitations = useMemo(
    () => tripInvitations.filter((invitation) => invitation.inviter_id === currentUser.id),
    [currentUser.id, tripInvitations]
  );
  const receivedJoinRequests = useMemo(
    () => joinRequests.filter((request) => request.creator_id === currentUser.id),
    [currentUser.id, joinRequests]
  );
  const sentJoinRequests = useMemo(
    () => joinRequests.filter((request) => request.requester_id === currentUser.id),
    [currentUser.id, joinRequests]
  );
  const findProfile = (id: string) => profileUsers.find((profile) => profile.id === id) ?? profileRecordToUserProfile({
    id,
    email: null,
    display_name: "Profil",
    avatar_url: null,
    city: null,
    bio: null
  });
  const findTrip = (id: string) => availableTrips.find((trip) => trip.id === id);
  const findAcceptedConnection = (memberId: string) => tribeRequests.accepted.find((request) =>
    (request.requester_id === currentUser.id && request.receiver_id === memberId) ||
    (request.receiver_id === currentUser.id && request.requester_id === memberId)
  );
  const selectedTribeMember = myTribePeople.find((member) => member.id === activeTribeMemberId) ?? myTribePeople[0] ?? null;
  const selectedTribeConnection = selectedTribeMember ? findAcceptedConnection(selectedTribeMember.id) : undefined;
  const guardSocialAction = (action: () => void) => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    action();
  };

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (activeTab !== "tribe") return;
    onTribeOpened();
    if (myTribePeople.length === 0) {
      setActiveTribeMemberId(null);
      return;
    }
    if (!activeTribeMemberId || !myTribePeople.some((member) => member.id === activeTribeMemberId)) {
      setActiveTribeMemberId(myTribePeople[0].id);
    }
  }, [activeTab, activeTribeMemberId, myTribePeople]);

  if (!isAuthenticated) {
    return (
      <section className="container-page py-10">
        <div className="card mx-auto max-w-2xl p-8 text-center">
          <Users className="mx-auto text-forest-700" size={42} />
          <h1 className="mt-4 text-3xl font-semibold">Connecte-toi pour accéder à ta Tribu.</h1>
          <p className="mt-3 text-forest-700">Les profils compatibles, invitations et demandes de tribu sont liés à ton compte.</p>
          <button className="btn-primary mt-6" onClick={onRequireAuth}>Connexion / inscription</button>
        </div>
      </section>
    );
  }

  return (
    <section className="container-page py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="pill">Tribu</p>
          <h1 className="mt-4 text-4xl font-semibold">Ta communauté d'aventure.</h1>
          <p className="mt-3 max-w-2xl text-forest-700">
            {activeTab === "compatibles" && "Découvre des profils compatibles, discute avec eux, puis invite-les à rejoindre un Trip favori."}
            {activeTab === "tribe" && "Retrouve ici les personnes qui ont accepté de faire partie de ta tribu."}
            {activeTab === "requests" && "Gère tes demandes reçues et envoyées."}
          </p>
        </div>
        <div className="rounded-[1.25rem] bg-white px-4 py-3 text-sm font-semibold text-forest-700 shadow-sm">
          {activeTab === "compatibles" && `${filteredPeople.length} profils compatibles`}
          {activeTab === "tribe" && `${myTribePeople.length} membres`}
          {activeTab === "requests" && `${tribeRequests.received.length + tribeRequests.sent.length + receivedTripInvitations.length + sentTripInvitations.length + receivedJoinRequests.length + sentJoinRequests.length} demandes`}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 rounded-[1.25rem] bg-white p-2 shadow-sm">
        {[
          ["compatibles", "Profils compatibles"],
          ["tribe", "Ma tribu"],
          ["requests", "Demandes"]
        ].map(([key, label]) => (
          <button
            className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${activeTab === key ? "bg-forest-800 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"}`}
            key={key}
            onClick={() => {
              const nextTab = key as CommunityTab;
              setActiveTab(nextTab);
              if (nextTab === "tribe") onTribeOpened();
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "compatibles" && (
        <TribeProfileGrid
          people={filteredPeople}
          onViewProfile={onViewProfile}
          onMessage={(member) => guardSocialAction(() => onSendTribeRequest(member))}
          onInvite={(member) => guardSocialAction(() => setInviteTarget(member))}
          onAdd={(member) => guardSocialAction(() => onSendTribeRequest(member))}
          addLabel="Ajouter à ma tribu"
          messageLabel="Ajouter"
        />
      )}

      {activeTab === "tribe" && (
        myTribePeople.length > 0
          ? (
            <TribeInbox
              people={myTribePeople}
              selectedMember={selectedTribeMember}
              selectedConnection={selectedTribeConnection}
              currentUser={currentUser}
              accessToken={accessToken}
              onSelectMember={(member) => setActiveTribeMemberId(member.id)}
              onViewProfile={onViewProfile}
              onInvite={(member) => guardSocialAction(() => setInviteTarget(member))}
              onRequireAuth={onRequireAuth}
            />
          )
          : <EmptyState title="Ta tribu est encore vide" text="Les personnes apparaîtront ici après acceptation d'une demande." />
      )}

      {activeTab === "requests" && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Panel title="Demandes reçues">
            <div className="grid gap-3">
              {tribeRequests.received.length === 0 && receivedTripInvitations.length === 0 && receivedJoinRequests.length === 0 && <p className="text-sm text-forest-700">Aucune demande reçue.</p>}
              {receivedJoinRequests.map((request) => (
                <TripJoinRequestRow
                  key={request.id}
                  title="Demande pour rejoindre ton voyage"
                  trip={findTrip(request.trip_id)}
                  profile={findProfile(request.requester_id)}
                  status={request.status}
                  primaryLabel={request.status === "pending" ? "Accepter" : undefined}
                  secondaryLabel={request.status === "pending" ? "Refuser" : undefined}
                  onViewProfile={() => onViewProfile(request.requester_id)}
                  onPrimary={() => onAcceptJoinRequest(request.id)}
                  onSecondary={() => onRejectJoinRequest(request.id)}
                />
              ))}
              {tribeRequests.received.map((request) => {
                const profile = findProfile(request.requester_id);
                return (
                  <RequestRow key={request.id} profile={profile} status={request.status} primaryLabel="Accepter" secondaryLabel="Refuser" onViewProfile={() => onViewProfile(request.requester_id)} onPrimary={() => onUpdateTribeConnection(request.id, "accept")} onSecondary={() => onUpdateTribeConnection(request.id, "reject")} />
                );
              })}
              {receivedTripInvitations.map((invitation) => (
                <InvitationRow
                  key={invitation.id}
                  title="Invitation à un Trip"
                  trip={findTrip(invitation.trip_id)}
                  profile={findProfile(invitation.inviter_id)}
                  status={invitation.status}
                  primaryLabel={invitation.status === "pending" ? "Accepter" : undefined}
                  secondaryLabel={invitation.status === "pending" ? "Refuser" : undefined}
                  onViewProfile={() => onViewProfile(invitation.inviter_id)}
                  onPrimary={() => onUpdateTripInvitation(invitation.id, "accept")}
                  onSecondary={() => onUpdateTripInvitation(invitation.id, "reject")}
                />
              ))}
            </div>
          </Panel>
          <Panel title="Demandes envoyées">
            <div className="grid gap-3">
              {tribeRequests.sent.length === 0 && sentTripInvitations.length === 0 && sentJoinRequests.length === 0 && <p className="text-sm text-forest-700">Aucune demande envoyée.</p>}
              {sentJoinRequests.map((request) => (
                <TripJoinRequestRow
                  key={request.id}
                  title="Demande envoyée pour rejoindre"
                  trip={findTrip(request.trip_id)}
                  profile={findProfile(request.creator_id)}
                  status={request.status}
                  onViewProfile={() => onViewProfile(request.creator_id)}
                />
              ))}
              {tribeRequests.sent.map((request) => {
                const profile = findProfile(request.receiver_id);
                return (
                  <RequestRow key={request.id} profile={profile} status={request.status} primaryLabel="Annuler" onViewProfile={() => onViewProfile(request.receiver_id)} onPrimary={() => onUpdateTribeConnection(request.id, "cancel")} />
                );
              })}
              {sentTripInvitations.map((invitation) => (
                <InvitationRow
                  key={invitation.id}
                  title="Invitation envoyée"
                  trip={findTrip(invitation.trip_id)}
                  profile={findProfile(invitation.invited_user_id)}
                  status={invitation.status}
                  onViewProfile={() => onViewProfile(invitation.invited_user_id)}
                />
              ))}
            </div>
          </Panel>
        </div>
      )}

      {inviteTarget && (
        <TribeInviteModal
          member={inviteTarget}
          trips={favoriteTrips}
          onClose={() => setInviteTarget(null)}
          onInvite={(trip) => {
            onInviteToTrip(trip, inviteTarget);
            setInviteTarget(null);
          }}
        />
      )}
    </section>
  );
}

function TribeProfileGrid({
  people,
  onViewProfile,
  onMessage,
  onInvite,
  onAdd,
  addLabel,
  messageLabel = "Message"
}: {
  people: CompatibleTribeProfile[];
  onViewProfile: (profileId: string) => void;
  onMessage: (member: CompatibleTribeProfile) => void;
  onInvite: (member: CompatibleTribeProfile) => void;
  onAdd?: (member: CompatibleTribeProfile) => void;
  addLabel: string;
  messageLabel?: string;
}) {
  if (people.length === 0) {
    return <EmptyState title="Aucun profil pour le moment" text="Les profils recommandés apparaîtront ici au fil des inscriptions." />;
  }

  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {people.map((member) => (
        <article className="group overflow-hidden rounded-[1.75rem] bg-white shadow-soft transition hover:-translate-y-1" key={member.id}>
          <div className="relative h-72 overflow-hidden">
            <img className="h-full w-full object-cover transition duration-700 group-hover:scale-105" src={member.photo_url} alt={member.name} />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-900/90 via-forest-900/20 to-transparent" />
            <span className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-2 text-xs font-bold text-forest-900 backdrop-blur">{member.compatibilityScore}% compatible</span>
            {member.verified && <span className="absolute right-4 top-4 rounded-full bg-sun px-3 py-2 text-xs font-bold text-white">Profil vérifié</span>}
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <h2 className="text-2xl font-semibold">{member.name}, {member.age_range}</h2>
              <p className="mt-1 text-sm font-semibold text-white/85">{member.city}</p>
              <p className="mt-3 text-sm text-white/90">{member.adventure_style} · {member.physical_level}</p>
            </div>
          </div>
          <div className="p-5">
            <p className="text-sm leading-6 text-forest-700">“{member.bio}”</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {member.compatibilityTags.map((tag) => <span className="pill text-xs" key={tag}>{tag}</span>)}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {member.badges.slice(0, 3).map((badge) => <span className="rounded-full bg-forest-50 px-3 py-1.5 text-xs font-semibold text-forest-700" key={badge}>{badge}</span>)}
            </div>
            {member.publicTrips.length > 0 && (
              <p className="mt-4 text-sm font-semibold text-forest-700">Trip public : {member.publicTrips[0].title}</p>
            )}
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <button className="btn-secondary py-2" onClick={() => onViewProfile(member.id)}>Profil</button>
              <button className="btn-primary py-2" onClick={() => onMessage(member)}>{messageLabel}</button>
              <button className="btn-secondary py-2" onClick={() => onInvite(member)}>Inviter à un Trip</button>
            </div>
            <button className="mt-2 w-full rounded-full bg-forest-50 px-4 py-2 text-sm font-semibold text-forest-800 transition hover:bg-forest-100 disabled:opacity-60" disabled={!onAdd} onClick={() => onAdd?.(member)}>
              {addLabel}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function TribeInbox({
  people,
  selectedMember,
  selectedConnection,
  currentUser,
  accessToken,
  onSelectMember,
  onViewProfile,
  onInvite,
  onRequireAuth
}: {
  people: CompatibleTribeProfile[];
  selectedMember: CompatibleTribeProfile | null;
  selectedConnection?: TribeConnection;
  currentUser: UserProfile;
  accessToken?: string;
  onSelectMember: (member: CompatibleTribeProfile) => void;
  onViewProfile: (profileId: string) => void;
  onInvite: (member: CompatibleTribeProfile) => void;
  onRequireAuth: () => void;
}) {
  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-[0.86fr_1.14fr]">
      <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-soft">
        <div className="border-b border-forest-100 p-4">
          <p className="text-sm font-semibold text-forest-700">Ma tribu</p>
          <h2 className="text-2xl font-semibold">Tes amis</h2>
        </div>
        <div className="max-h-[680px] overflow-y-auto">
          {people.map((member) => {
            const active = selectedMember?.id === member.id;
            return (
              <article
                className={`flex cursor-pointer items-center gap-3 border-b border-forest-50 p-4 transition hover:bg-forest-50 ${active ? "bg-forest-50" : "bg-white"}`}
                key={member.id}
                onClick={() => onSelectMember(member)}
              >
                <img className="h-14 w-14 rounded-full object-cover" src={member.photo_url} alt={member.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{member.name}</p>
                    {member.verified && <BadgeCheck className="shrink-0 text-forest-700" size={16} />}
                  </div>
                  <p className="truncate text-sm text-forest-700">{member.city} · {member.adventure_style}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-forest-500">{member.compatibilityTags.slice(0, 2).join(" · ")}</p>
                </div>
                <button
                  className="rounded-full bg-forest-900 px-4 py-2 text-sm font-semibold text-white"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectMember(member);
                  }}
                >
                  Message
                </button>
              </article>
            );
          })}
        </div>
      </div>

      <TribeDirectConversation
        member={selectedMember}
        connection={selectedConnection}
        currentUser={currentUser}
        accessToken={accessToken}
        onViewProfile={onViewProfile}
        onInvite={onInvite}
        onRequireAuth={onRequireAuth}
      />
    </section>
  );
}

function TribeDirectConversation({
  member,
  connection,
  currentUser,
  accessToken,
  onViewProfile,
  onInvite,
  onRequireAuth
}: {
  member: CompatibleTribeProfile | null;
  connection?: TribeConnection;
  currentUser: UserProfile;
  accessToken?: string;
  onViewProfile: (profileId: string) => void;
  onInvite: (member: CompatibleTribeProfile) => void;
  onRequireAuth: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<TribeMessage[]>([]);
  const [notice, setNotice] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setDraft("");
    setMessages([]);
    setNotice("");

    if (!member || !connection || !accessToken) return;

    let mounted = true;

    const loadMessages = async () => {
      try {
        const rows = await getTribeMessages(connection.id, accessToken);
        if (mounted) setMessages(rows);
      } catch (error) {
        console.warn("Messages Tribu indisponibles.", error);
        if (mounted) setNotice("Impossible de synchroniser cette conversation pour le moment.");
      }
    };

    loadMessages();
    const interval = window.setInterval(loadMessages, 4_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [accessToken, connection, member]);

  if (!member) {
    return (
      <div className="grid min-h-[520px] place-items-center rounded-[1.5rem] bg-white p-8 text-center shadow-soft">
        <div>
          <MessageCircle className="mx-auto text-forest-700" size={40} />
          <h2 className="mt-4 text-2xl font-semibold">Choisis une personne</h2>
          <p className="mt-2 text-forest-700">Sélectionne un membre de ta tribu pour ouvrir la conversation.</p>
        </div>
      </div>
    );
  }

  const send = async () => {
    if (!draft.trim()) return;
    if (!accessToken) {
      onRequireAuth();
      return;
    }
    if (!connection) {
      setNotice("La conversation privée sera disponible dès que cette personne fera partie de ta tribu.");
      return;
    }

    const body = draft.trim();
    setDraft("");
    setIsSending(true);
    setNotice("");

    try {
      const nextMessage = await sendTribeMessage(connection.id, currentUser.id, body, accessToken);
      setMessages((prev) => [...prev.filter((message) => message.id !== nextMessage.id), nextMessage]);
    } catch (error) {
      console.error("Message Tribu non envoyé.", error);
      setDraft(body);
      setNotice(error instanceof Error ? error.message : "Impossible d'envoyer le message.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex min-h-[680px] flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-soft">
      <div className="border-b border-forest-100 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img className="h-14 w-14 rounded-full object-cover" src={member.photo_url} alt={member.name} />
            <div>
              <p className="text-lg font-semibold">{member.name}</p>
              <p className="text-sm text-forest-700">{member.city} · {member.compatibilityScore}% compatible</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary py-2 text-sm" onClick={() => onViewProfile(member.id)}>Profil</button>
            <button className="btn-secondary py-2 text-sm" onClick={() => onInvite(member)}>Inviter</button>
          </div>
        </div>
        {notice && <p className="mt-3 rounded-lg bg-sun/15 px-3 py-2 text-sm font-semibold text-forest-800">{notice}</p>}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-forest-50 p-4">
        {messages.length === 0 && (
          <div className="grid h-full min-h-72 place-items-center text-center">
            <div>
              <MessageCircle className="mx-auto text-forest-700" size={34} />
              <h3 className="mt-3 text-xl font-semibold">Aucun message pour le moment</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-forest-700">Écris à {member.name} pour organiser un Trip, proposer une idée ou garder le contact.</p>
            </div>
          </div>
        )}
        {messages.map((message) => {
          const mine = message.sender_id === currentUser.id;
          return (
            <div className={`max-w-[86%] rounded-2xl p-3 ${mine ? "ml-auto bg-forest-800 text-white" : "bg-white"}`} key={message.id}>
              <div className="mb-1 flex justify-between gap-3 text-xs font-semibold opacity-75">
                <span>{mine ? "Toi" : member.name}</span>
                <span>{formatConversationTime(message.created_at)}</span>
              </div>
              <p>{message.body}</p>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 border-t border-forest-100 p-4">
        <input
          className="min-w-0 flex-1 rounded-lg border border-forest-100 bg-forest-50 px-4 py-3 outline-none focus:ring-2 focus:ring-forest-600"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") send();
          }}
          disabled={isSending}
          placeholder={`Message à ${member.name}...`}
        />
        <button className="btn-primary px-4 disabled:cursor-wait disabled:opacity-60" disabled={isSending} onClick={send} aria-label="Envoyer">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-8 rounded-[1.5rem] bg-white p-8 text-center shadow-soft">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-forest-700">{text}</p>
    </div>
  );
}

function RequestRow({
  profile,
  status,
  primaryLabel,
  secondaryLabel,
  onViewProfile,
  onPrimary,
  onSecondary
}: {
  profile: UserProfile;
  status: string;
  primaryLabel: string;
  secondaryLabel?: string;
  onViewProfile?: () => void;
  onPrimary: () => void;
  onSecondary?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[1rem] bg-forest-50 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <img className="h-12 w-12 rounded-2xl object-cover" src={profile.photo_url} alt={profile.name} />
        <div>
          <p className="font-semibold">{profile.name}</p>
          <p className="text-sm text-forest-700">{profile.city} · {status}</p>
        </div>
      </div>
      <div className="flex gap-2">
        {onViewProfile && <button className="btn-secondary py-2 text-sm" onClick={onViewProfile}>Voir profil</button>}
        <button className="btn-primary py-2 text-sm" onClick={onPrimary}>{primaryLabel}</button>
        {secondaryLabel && <button className="btn-secondary py-2 text-sm" onClick={onSecondary}>{secondaryLabel}</button>}
      </div>
    </div>
  );
}

function InvitationRow({
  title,
  trip,
  profile,
  status,
  primaryLabel,
  secondaryLabel,
  onViewProfile,
  onPrimary,
  onSecondary
}: {
  title: string;
  trip?: Trip;
  profile: UserProfile;
  status: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onViewProfile?: () => void;
  onPrimary?: () => void;
  onSecondary?: () => void;
}) {
  return (
    <div className="rounded-[1rem] bg-forest-50 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <img className="h-12 w-12 rounded-2xl object-cover" src={profile.photo_url} alt={profile.name} />
          <div className="min-w-0">
            <p className="font-semibold">{title}</p>
            <p className="truncate text-sm text-forest-700">{profile.name} · {status}</p>
          </div>
        </div>
        {(onViewProfile || primaryLabel || secondaryLabel) && (
          <div className="flex shrink-0 gap-2">
            {onViewProfile && <button className="btn-secondary py-2 text-sm" onClick={onViewProfile}>Voir profil</button>}
            {primaryLabel && <button className="btn-primary py-2 text-sm" onClick={onPrimary}>{primaryLabel}</button>}
            {secondaryLabel && <button className="btn-secondary py-2 text-sm" onClick={onSecondary}>{secondaryLabel}</button>}
          </div>
        )}
      </div>
      {trip && (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-white p-3">
          <img className="h-14 w-14 rounded-xl object-cover" src={trip.image_url} alt={trip.title} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{trip.title}</p>
            <p className="truncate text-sm text-forest-700">{trip.destination}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function TripJoinRequestRow({
  title,
  trip,
  profile,
  status,
  primaryLabel,
  secondaryLabel,
  onViewProfile,
  onPrimary,
  onSecondary
}: {
  title: string;
  trip?: Trip;
  profile: UserProfile;
  status: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onViewProfile?: () => void;
  onPrimary?: () => void;
  onSecondary?: () => void;
}) {
  return (
    <div className="rounded-[1rem] bg-forest-50 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <img className="h-12 w-12 rounded-2xl object-cover" src={profile.photo_url} alt={profile.name} />
          <div className="min-w-0">
            <p className="font-semibold">{title}</p>
            <p className="truncate text-sm text-forest-700">{profile.name} · {status}</p>
          </div>
        </div>
        {(onViewProfile || primaryLabel || secondaryLabel) && (
          <div className="flex shrink-0 gap-2">
            {onViewProfile && <button className="btn-secondary py-2 text-sm" onClick={onViewProfile}>Voir profil</button>}
            {primaryLabel && <button className="btn-primary py-2 text-sm" onClick={onPrimary}>{primaryLabel}</button>}
            {secondaryLabel && <button className="btn-secondary py-2 text-sm" onClick={onSecondary}>{secondaryLabel}</button>}
          </div>
        )}
      </div>
      {trip && (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-white p-3">
          <img className="h-14 w-14 rounded-xl object-cover" src={trip.image_url} alt={trip.title} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{trip.title}</p>
            <p className="truncate text-sm text-forest-700">{trip.destination}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function TribeInviteModal({
  member,
  trips: availableTrips,
  onClose,
  onInvite
}: {
  member: CompatibleTribeProfile;
  trips: Trip[];
  onClose: () => void;
  onInvite: (trip: Trip) => void;
}) {
  const inviteTrips = availableTrips.slice(0, 6);
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-forest-900/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[1.5rem] bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="pill">Inviter à un Trip</p>
            <h2 className="mt-3 text-2xl font-semibold">Choisis un Trip pour {member.name}</h2>
          </div>
          <button className="rounded-full bg-forest-50 p-2" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 grid gap-3">
          {inviteTrips.length === 0 && (
            <div className="rounded-[1rem] bg-forest-50 p-4 text-sm leading-6 text-forest-700">
              Ajoute d'abord un Trip en favori avec le petit cœur sur les cards. Tu pourras ensuite inviter {member.name} à un de ces Trips.
            </div>
          )}
          {inviteTrips.map((trip) => (
            <button className="flex items-center gap-4 rounded-[1rem] bg-forest-50 p-3 text-left transition hover:bg-forest-100" key={trip.id} onClick={() => onInvite(trip)}>
              <img className="h-16 w-16 rounded-xl object-cover" src={trip.image_url} alt={trip.title} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{trip.title}</p>
                <p className="truncate text-sm text-forest-700">{trip.destination} · {getTripDateLabel(trip)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${getTripCardType(trip) === "user_project" ? "bg-sun text-white" : "bg-white text-forest-800"}`}>
                {getTripTypeLabel(trip)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShareTripModal({
  trip,
  tribeMembers,
  onClose,
  onShareWithTribeMember
}: {
  trip: Trip;
  tribeMembers: UserProfile[];
  onClose: () => void;
  onShareWithTribeMember: (member: UserProfile) => void | Promise<void>;
}) {
  const [feedback, setFeedback] = useState("");
  const shareUrl = getTripShareUrl(trip);
  const shareText = buildTripShareMessage(trip);

  const copyLink = async () => {
    await copyTextToClipboard(shareUrl);
    setFeedback("Lien copié. Tu peux le coller dans Instagram, WhatsApp, Facebook ou ailleurs.");
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      await copyLink();
      return;
    }

    try {
      await navigator.share({
        title: trip.title,
        text: shareText,
        url: shareUrl
      });
      setFeedback("Partage ouvert.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-forest-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[1.5rem] bg-white shadow-soft">
        <div className="flex items-start justify-between gap-4 border-b border-forest-100 p-5">
          <div>
            <p className="pill">Partager le Trip</p>
            <h2 className="mt-3 text-2xl font-semibold">{trip.title}</h2>
            <p className="mt-2 text-sm leading-6 text-forest-700">Envoie-le à ta tribu ou copie le lien pour le partager sur une autre app.</p>
          </div>
          <button className="rounded-full bg-forest-50 p-2 transition hover:bg-forest-100" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[1.25rem] bg-forest-50 p-4">
            <img className="h-44 w-full rounded-[1rem] object-cover" src={trip.image_url} alt={trip.title} />
            <h3 className="mt-4 text-xl font-semibold">{trip.title}</h3>
            <p className="mt-1 text-sm font-semibold text-forest-700">{trip.destination} · {getTripDateLabel(trip)}</p>
            <div className="mt-4 grid gap-2">
              <button className="btn-primary justify-center" onClick={nativeShare}>
                <Share2 size={18} />
                Partager via mon téléphone
              </button>
              <button className="btn-secondary justify-center" onClick={copyLink}>
                <Copy size={18} />
                Copier le lien
              </button>
              <a
                className="btn-secondary justify-center"
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={18} />
                Partager sur Facebook
              </a>
            </div>
            {feedback && <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-forest-800">{feedback}</p>}
          </section>

          <section>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-forest-700">Ma tribu</p>
                <h3 className="text-2xl font-semibold">Envoyer en message privé</h3>
              </div>
              <span className="rounded-full bg-forest-50 px-3 py-1 text-xs font-bold text-forest-700">{tribeMembers.length}</span>
            </div>
            <div className="mt-4 grid max-h-[430px] gap-3 overflow-y-auto pr-1">
              {tribeMembers.length === 0 && (
                <div className="rounded-[1rem] bg-forest-50 p-4 text-sm leading-6 text-forest-700">
                  Ajoute d'abord des personnes à ta tribu pour pouvoir leur partager un Trip directement en message privé.
                </div>
              )}
              {tribeMembers.map((member) => (
                <button
                  className="flex items-center gap-3 rounded-[1rem] bg-forest-50 p-3 text-left transition hover:bg-forest-100"
                  key={member.id}
                  onClick={() => onShareWithTribeMember(member)}
                >
                  <img className="h-12 w-12 rounded-full object-cover" src={member.photo_url} alt={member.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{member.name}</span>
                    <span className="block truncate text-sm text-forest-700">{member.city} · {member.adventure_style}</span>
                  </span>
                  <Send className="text-forest-700" size={18} />
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function getTripShareUrl(trip: Trip) {
  if (typeof window === "undefined") return `?trip=${encodeURIComponent(trip.id)}`;

  const url = new URL(window.location.href);
  url.searchParams.set("trip", trip.id);
  url.hash = "";
  return url.toString();
}

function buildTripShareMessage(trip: Trip) {
  return [
    `Regarde ce Trip : ${trip.title}`,
    `${trip.destination} · ${getTripDateLabel(trip)} · ${trip.budget_min}-${trip.budget_max} €`,
    getTripShareUrl(trip)
  ].join("\n");
}

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

async function getUnreadTribeMessageCount(userId: string, connections: TribeConnection[], accessToken: string) {
  const seenAt = getTribeMessagesSeenAt(userId);
  const messages = await Promise.all(
    connections.map((connection) => getTribeMessages(connection.id, accessToken).catch(() => [] as TribeMessage[]))
  );

  return messages.flat().filter((message) => {
    if (message.sender_id === userId || !message.created_at) return false;
    return new Date(message.created_at).getTime() > seenAt;
  }).length;
}

function getTribeMessagesSeenAt(userId: string) {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(getTribeMessagesSeenStorageKey(userId));
  return raw ? new Date(raw).getTime() || 0 : 0;
}

function markTribeMessagesSeen(userId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getTribeMessagesSeenStorageKey(userId), new Date().toISOString());
}

function getTribeMessagesSeenStorageKey(userId: string) {
  return `tribu_nature_tribe_messages_seen_at_${userId}`;
}

function getCompatiblePeople(userProfile: UserProfile, candidates: UserProfile[], availableTrips: Trip[]): CompatibleTribeProfile[] {
  return candidates
    .filter((candidate) => candidate.id !== userProfile.id)
    .map((candidate) => {
      const compatibilityTags = getCompatibilityTags(userProfile, candidate);
      const score = Math.min(98, 62 + compatibilityTags.length * 7 + (candidate.verified ? 8 : 0));
      const publicTrips = availableTrips.filter((trip) => {
        const searchable = normalizeUiText(`${trip.title} ${trip.destination} ${trip.description} ${trip.activities.join(" ")} ${trip.ambience_tags.join(" ")}`);
        return candidate.preferred_ambiences.some((ambience) => searchable.includes(normalizeUiText(ambience))) || searchable.includes(normalizeUiText(candidate.adventure_style));
      }).slice(0, 2);
      return { ...candidate, compatibilityScore: score, compatibilityTags: compatibilityTags.slice(0, 4), publicTrips };
    })
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}

function getCompatibilityTags(userProfile: UserProfile, candidate: UserProfile) {
  const tags: string[] = [];
  const sharedAmbiences = candidate.preferred_ambiences.filter((ambience) =>
    userProfile.preferred_ambiences.some((item) => normalizeUiText(item) === normalizeUiText(ambience))
  );
  if (candidate.city === userProfile.city) tags.push(`Départ ${candidate.city}`);
  if (sharedAmbiences[0]) tags.push(sharedAmbiences[0]);
  if (normalizeUiText(candidate.physical_level).includes(normalizeUiText(userProfile.physical_level)) || normalizeUiText(userProfile.physical_level).includes(normalizeUiText(candidate.physical_level))) {
    tags.push("Niveau compatible");
  }
  if (candidate.budget_range === userProfile.budget_range) tags.push("Budget compatible");
  if (candidate.safety_preferences.some((preference) => userProfile.safety_preferences.map(normalizeUiText).includes(normalizeUiText(preference)))) {
    tags.push("Préférences communes");
  }
  if (candidate.verified) tags.push("Profil vérifié");
  return tags.length ? tags : [candidate.adventure_style, candidate.physical_level];
}

function filterCompatiblePeople(people: CompatibleTribeProfile[], filters: string[]) {
  if (filters.length === 0) return people;
  return people.filter((member) => filters.every((filter) => tribeMemberMatchesFilter(member, filter)));
}

function tribeMemberMatchesFilter(member: CompatibleTribeProfile, filter: string) {
  const normalizedFilter = normalizeUiText(filter);
  const searchable = normalizeUiText([
    member.name,
    member.age_range,
    member.city,
    member.bio,
    member.physical_level,
    member.budget_range,
    member.adventure_style,
    ...member.preferred_ambiences,
    ...member.safety_preferences,
    ...member.badges,
    ...member.compatibilityTags
  ].join(" "));

  if (normalizedFilter === "profils verifies") return member.verified;
  if (normalizedFilter === "women-only possible") return searchable.includes("women") || searchable.includes("groupe") || member.verified;
  if (normalizedFilter === "budget 200 a 350 €") return normalizeUiText(member.budget_range).includes("200 a 350");
  if (normalizedFilter === "25-35") {
    const age = Number(member.age_range.match(/\d+/)?.[0] ?? 0);
    return age >= 25 && age <= 35;
  }
  if (normalizedFilter === "petit groupe") return searchable.includes("petit groupe") || searchable.includes("rythme doux");
  if (normalizedFilter === "week-end") return searchable.includes("week-end") || searchable.includes("weekend") || searchable.includes("week");
  return searchable.includes(normalizedFilter);
}

function Profile({
  profileRecord,
  profileUser,
  currentProfile,
  isOwnProfile,
  isAuthenticated,
  onAuthClick,
  onShowOwnProfile,
  onUpdateProfile,
  onUploadAvatar,
  onOpenTrip,
  trips: availableTrips,
  userTripActions
}: {
  profileRecord: UserProfileRecord | null;
  profileUser: UserProfile;
  currentProfile: UserProfileRecord | null;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
  onAuthClick: () => void;
  onShowOwnProfile: () => void;
  onUpdateProfile: (updates: UserProfileUpdate) => Promise<UserProfileRecord>;
  onUploadAvatar: (file: File) => Promise<UserProfileRecord>;
  onOpenTrip: (trip: Trip, shouldOpenConversation: boolean) => void | Promise<void>;
  trips: Trip[];
  userTripActions: UserTripActions | null;
}) {
  if (!isAuthenticated || !currentProfile) {
    return (
      <section className="container-page py-10">
        <div className="card mx-auto max-w-2xl p-8 text-center">
          <Users className="mx-auto text-forest-700" size={42} />
          <h1 className="mt-4 text-3xl font-semibold">Connecte-toi pour voir ton profil.</h1>
          <p className="mt-3 text-forest-700">Ton profil sert à publier des Trips, rejoindre les intéressés et envoyer des demandes de participation.</p>
          <button className="btn-primary mt-6" onClick={onAuthClick}>Connexion / inscription</button>
        </div>
      </section>
    );
  }

  const profile = profileRecord ?? fallbackProfileRecord(profileUser.id);
  const createdTrips = availableTrips.filter((trip) => trip.creator_id === profile.id);
  const activeTripIds = new Set(userTripActions?.participants.filter((participant) => participant.status === "active").map((participant) => participant.trip_id) ?? []);
  const interestedTripIds = new Set(userTripActions?.interests.map((interest) => interest.trip_id) ?? []);
  const requestedTripIds = new Set(userTripActions?.joinRequests.filter((request) => request.requester_id === profile.id).map((request) => request.trip_id) ?? []);
  const profileTripIds = new Set([
    ...createdTrips.map((trip) => trip.id),
    ...(isOwnProfile ? [...activeTripIds, ...interestedTripIds, ...requestedTripIds] : [])
  ]);
  const profileTrips = availableTrips.filter((trip) => profileTripIds.has(trip.id));
  const tripStatusLabel = (trip: Trip) => {
    if (trip.creator_id === profile.id) return "Créé";
    if (activeTripIds.has(trip.id)) return "Participant";
    if (interestedTripIds.has(trip.id)) return "Intéressé";
    if (requestedTripIds.has(trip.id)) return "Demande envoyée";
    return getTripTypeLabel(trip);
  };

  return (
    <section className="container-page py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="pill">Profil</p>
          <h1 className="mt-4 text-4xl font-semibold">{isOwnProfile ? "Ton profil" : `Profil de ${profileUser.name}`}</h1>
          <p className="mt-3 max-w-2xl text-forest-700">
            {isOwnProfile
              ? "Cette partie haute est ton profil public : les membres peuvent le consulter depuis les notifications, les demandes et la Tribu."
              : "Consulte son profil avant de répondre à une invitation ou une demande de participation."}
          </p>
        </div>
        {!isOwnProfile && (
          <button className="btn-secondary" onClick={onShowOwnProfile}>Revenir à mon profil</button>
        )}
      </div>

      <ProfilePublicCard
        profileRecord={profile}
        profileUser={profileUser}
        isOwnProfile={isOwnProfile}
        createdTripsCount={createdTrips.length}
        onUpdateProfile={onUpdateProfile}
        onUploadAvatar={onUploadAvatar}
      />

      <section className="mt-8 rounded-[2rem] bg-white p-5 shadow-soft sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="pill">{isOwnProfile ? "Mes Trips" : "Trips publics"}</p>
            <h2 className="mt-3 text-3xl font-semibold">{isOwnProfile ? "Tes Trips" : `Trips de ${profileUser.name}`}</h2>
            <p className="mt-2 text-forest-700">
              {isOwnProfile
                ? "Retrouve ici tes Trips créés, rejoints, intéressés ou demandés."
                : "Les Trips visibles publiés par ce membre apparaissent ici."}
            </p>
          </div>
          <span className="rounded-full bg-forest-50 px-4 py-2 text-sm font-bold text-forest-800">{profileTrips.length} Trip{profileTrips.length > 1 ? "s" : ""}</span>
        </div>

        {profileTrips.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {profileTrips.map((trip) => (
              <ProfileTripCard
                key={trip.id}
                trip={trip}
                statusLabel={tripStatusLabel(trip)}
                opensConversation={isOwnProfile && getTripCardType(trip) === "catalog" && (interestedTripIds.has(trip.id) || activeTripIds.has(trip.id))}
                onOpenTrip={onOpenTrip}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[1.5rem] bg-forest-50 p-6 text-center">
            <h3 className="text-xl font-semibold">{isOwnProfile ? "Aucun Trip lié à ton profil pour le moment." : "Aucun Trip public pour le moment."}</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-forest-700">
              {isOwnProfile
                ? "Crée un Trip, rejoins une idée de voyage ou envoie une demande pour la voir apparaître ici."
                : "Ce membre n'a pas encore publié de Trip visible."}
            </p>
          </div>
        )}
      </section>
    </section>
  );
}

type ProfileFormState = {
  display_name: string;
  avatar_url: string;
  city: string;
  bio: string;
  age_range: string;
  physical_level: string;
  budget_range: string;
  adventure_style: string;
  preferred_ambiences: string;
  safety_preferences: string;
  badges: string;
  past_trips: string;
};

function profileRecordToForm(profile: UserProfileRecord): ProfileFormState {
  return {
    display_name: profile.display_name ?? "",
    avatar_url: profile.avatar_url ?? "",
    city: profile.city ?? "",
    bio: profile.bio ?? "",
    age_range: profile.age_range ?? "",
    physical_level: profile.physical_level ?? "",
    budget_range: profile.budget_range ?? "",
    adventure_style: profile.adventure_style ?? "",
    preferred_ambiences: (profile.preferred_ambiences ?? []).join(", "),
    safety_preferences: (profile.safety_preferences ?? []).join(", "),
    badges: (profile.badges ?? []).join(", "),
    past_trips: String(profile.past_trips ?? 0)
  };
}

function csvToList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function emptyToNull(value: string) {
  const next = value.trim();
  return next.length ? next : null;
}

function profileFormToUpdate(form: ProfileFormState): UserProfileUpdate {
  const pastTrips = Number(form.past_trips);

  return {
    display_name: form.display_name.trim() || "Membre Tribu Nature",
    avatar_url: emptyToNull(form.avatar_url),
    city: emptyToNull(form.city),
    bio: emptyToNull(form.bio),
    age_range: emptyToNull(form.age_range),
    physical_level: emptyToNull(form.physical_level),
    budget_range: emptyToNull(form.budget_range),
    adventure_style: emptyToNull(form.adventure_style),
    preferred_ambiences: csvToList(form.preferred_ambiences),
    safety_preferences: csvToList(form.safety_preferences),
    badges: csvToList(form.badges),
    past_trips: Number.isFinite(pastTrips) ? Math.max(0, Math.floor(pastTrips)) : 0
  };
}

function ProfilePublicCard({
  profileRecord,
  profileUser,
  isOwnProfile,
  createdTripsCount,
  onUpdateProfile,
  onUploadAvatar
}: {
  profileRecord: UserProfileRecord;
  profileUser: UserProfile;
  isOwnProfile: boolean;
  createdTripsCount: number;
  onUpdateProfile: (updates: UserProfileUpdate) => Promise<UserProfileRecord>;
  onUploadAvatar: (file: File) => Promise<UserProfileRecord>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<ProfileFormState>(() => profileRecordToForm(profileRecord));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) setForm(profileRecordToForm(profileRecord));
  }, [isEditing, profileRecord.id, profileRecord.updated_at]);

  useEffect(() => {
    setAvatarFile(null);
    setAvatarPreview("");
  }, [profileRecord.id]);

  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const updateField = (field: keyof ProfileFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateProfileAvatarFile(file);
    if (validationError) {
      setFeedback(validationError);
      return;
    }

    if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setFeedback("Prévisualisation prête. Enregistre la photo pour la publier.");
  };

  const cancelAvatarSelection = () => {
    if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview("");
    setFeedback("");
  };

  const saveAvatar = async () => {
    if (!avatarFile) {
      setFeedback("Choisis d'abord une photo.");
      return;
    }

    setAvatarSaving(true);
    setFeedback("");

    try {
      const nextProfile = await onUploadAvatar(avatarFile);
      setForm(profileRecordToForm(nextProfile));
      setAvatarFile(null);
      setAvatarPreview("");
      setFeedback("Photo enregistrée.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Impossible d'envoyer la photo.");
    } finally {
      setAvatarSaving(false);
    }
  };

  const saveProfile = async () => {
    if (!form.display_name.trim()) {
      setFeedback("Le nom affiché est obligatoire.");
      return;
    }

    setSaving(true);
    setFeedback("");

    try {
      const nextProfile = await onUpdateProfile(profileFormToUpdate(form));
      setForm(profileRecordToForm(nextProfile));
      setIsEditing(false);
      setFeedback("Profil enregistré.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Impossible de modifier le profil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-8 overflow-hidden rounded-[2rem] bg-white shadow-soft">
      <div className="h-44 bg-[url('https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center sm:h-56" />
      <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <img className="-mt-20 h-28 w-28 rounded-[1.5rem] border-4 border-white object-cover shadow-soft sm:h-32 sm:w-32" src={(isOwnProfile && avatarPreview) || profileUser.photo_url} alt={profileUser.name} />
          {isOwnProfile && (
            <div className="mt-4 rounded-[1.25rem] bg-forest-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-forest-800 shadow-sm transition hover:bg-forest-100">
                  <Camera size={16} />
                  {profileRecord.avatar_url ? "Modifier ma photo" : "Ajouter une photo"}
                  <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectAvatar} />
                </label>
                {avatarFile && (
                  <>
                    <button className="btn-primary py-2 text-sm disabled:cursor-wait disabled:opacity-60" disabled={avatarSaving} onClick={saveAvatar}>
                      {avatarSaving ? "Envoi..." : "Enregistrer la photo"}
                    </button>
                    <button className="btn-secondary py-2 text-sm" disabled={avatarSaving} onClick={cancelAvatarSelection}>
                      Annuler
                    </button>
                  </>
                )}
              </div>
              <p className="mt-2 text-xs font-semibold text-forest-600">JPG, PNG ou WebP. Maximum 5 Mo.</p>
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <h2 className="text-3xl font-semibold sm:text-4xl">{profileUser.name}</h2>
            {profileUser.verified && <BadgeCheck className="text-forest-700" size={24} />}
          </div>
          <p className="mt-2 text-sm font-semibold text-forest-700">{profileUser.age_range} · {profileUser.city}</p>
          <p className="mt-4 leading-7 text-forest-700">{profileUser.bio}</p>
          <TagList tags={[profileUser.verified ? "profil vérifié" : "profil à vérifier", profileUser.physical_level, profileUser.budget_range]} />
          {isOwnProfile && (
            <button className="btn-primary mt-5" onClick={() => setIsEditing((value) => !value)}>
              {isEditing ? "Fermer l'édition" : "Modifier mon profil"}
            </button>
          )}
          {feedback && <p className="mt-3 rounded-lg bg-forest-50 px-3 py-2 text-sm font-semibold text-forest-800">{feedback}</p>}
        </div>

        {isEditing && isOwnProfile ? (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileInput label="Nom affiché" value={form.display_name} onChange={(value) => updateField("display_name", value)} />
              <ProfileInput label="Ville" value={form.city} onChange={(value) => updateField("city", value)} />
              <ProfileInput label="Tranche d'âge" value={form.age_range} onChange={(value) => updateField("age_range", value)} placeholder="Ex : 28 ans, 25-35" />
              <ProfileInput label="Niveau physique" value={form.physical_level} onChange={(value) => updateField("physical_level", value)} />
              <ProfileInput label="Budget" value={form.budget_range} onChange={(value) => updateField("budget_range", value)} />
              <ProfileInput label="Style d'aventure" value={form.adventure_style} onChange={(value) => updateField("adventure_style", value)} />
              <ProfileInput label="Trips passées" value={form.past_trips} type="number" onChange={(value) => updateField("past_trips", value)} />
            </div>
            <ProfileTextarea label="Bio" value={form.bio} onChange={(value) => updateField("bio", value)} />
            <ProfileTextarea label="Ambiances préférées" hint="Sépare les valeurs par des virgules." value={form.preferred_ambiences} onChange={(value) => updateField("preferred_ambiences", value)} />
            <ProfileTextarea label="Confiance & confort" hint="Sépare les valeurs par des virgules." value={form.safety_preferences} onChange={(value) => updateField("safety_preferences", value)} />
            <ProfileTextarea label="Badges" hint="Sépare les valeurs par des virgules." value={form.badges} onChange={(value) => updateField("badges", value)} />
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary disabled:cursor-wait disabled:opacity-60" disabled={saving} onClick={saveProfile}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button className="btn-secondary" onClick={() => {
                setForm(profileRecordToForm(profileRecord));
                setIsEditing(false);
                setFeedback("");
              }}>
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniFact label="Style" value={profileUser.adventure_style} />
              <MiniFact label="Niveau" value={profileUser.physical_level} />
              <MiniFact label="Budget" value={profileUser.budget_range} />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <section className="rounded-[1.25rem] bg-forest-50 p-5">
                <h3 className="font-semibold">Ambiances préférées</h3>
                <TagList tags={profileUser.preferred_ambiences} />
              </section>
              <section className="rounded-[1.25rem] bg-forest-50 p-5">
                <h3 className="font-semibold">Confiance & confort</h3>
                <TagList tags={profileUser.safety_preferences} />
              </section>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Trips passées" value={`${profileUser.past_trips}`} />
              <Metric label="Trips publiés" value={`${createdTripsCount}`} />
              <Metric label="Badges" value={`${profileUser.badges.length}`} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ProfileInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-forest-700">{label}</span>
      <input
        className="mt-2 w-full rounded-xl border border-forest-100 bg-forest-50 px-4 py-3 outline-none focus:ring-2 focus:ring-forest-600"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ProfileTextarea({
  label,
  hint,
  value,
  onChange
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-forest-700">{label}</span>
      {hint && <span className="ml-2 text-xs font-semibold text-forest-500">{hint}</span>}
      <textarea
        className="mt-2 min-h-24 w-full rounded-xl border border-forest-100 bg-forest-50 px-4 py-3 outline-none focus:ring-2 focus:ring-forest-600"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ProfileTripCard({
  trip,
  statusLabel,
  opensConversation,
  onOpenTrip
}: {
  trip: Trip;
  statusLabel: string;
  opensConversation: boolean;
  onOpenTrip: (trip: Trip, shouldOpenConversation: boolean) => void | Promise<void>;
}) {
  return (
    <article className="overflow-hidden rounded-[1.25rem] bg-forest-50">
      <button className="block w-full text-left" onClick={() => onOpenTrip(trip, opensConversation)}>
        <div className="relative h-44 overflow-hidden">
          <img className="h-full w-full object-cover transition duration-500 hover:scale-105" src={trip.image_url} alt={trip.destination} />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-900/80 to-transparent" />
          <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-forest-900">{statusLabel}</span>
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <p className="text-sm font-semibold text-white/85">{trip.destination}</p>
            <h3 className="mt-1 text-xl font-semibold leading-tight">{trip.title}</h3>
          </div>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-forest-700">
            <span className="rounded-full bg-white px-3 py-1.5">{getTripDateLabel(trip)}</span>
            <span className="rounded-full bg-white px-3 py-1.5">{trip.budget_min}-{trip.budget_max} €</span>
            <span className="rounded-full bg-white px-3 py-1.5">{trip.physical_level}</span>
          </div>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-forest-700">{trip.brief ?? trip.description}</p>
          {opensConversation && <p className="mt-3 text-sm font-bold text-forest-800">Ouvre directement la conversation</p>}
        </div>
      </button>
    </article>
  );
}

function Providers() {
  return (
    <section className="container-page py-10">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="pill">Marketplace locale</p>
          <h1 className="mt-4 text-4xl font-semibold">Rejoindre la marketplace locale</h1>
          <p className="mt-4 leading-8 text-forest-700">Guides, fermes, restaurants, gîtes, centres équestres, rafting, poterie et artisans peuvent être recommandés dans des Trips adaptées.</p>
          <div className="mt-6 grid gap-3">
            {["Recevez des groupes déjà formés", "Ajoutez vos activités, disponibilités, prix et conditions", "Soyez recommandé dans des Trips adaptées"].map((item) => (
              <div className="flex items-center gap-3 rounded-lg bg-white p-4" key={item}><BadgeCheck className="text-forest-700" />{item}</div>
            ))}
          </div>
          <div className="mt-6 grid gap-3">
            {providers.map((provider) => (
              <div className="card p-4" key={provider.id}>
                <h3 className="font-semibold">{provider.name}</h3>
                <p className="text-sm text-forest-700">{provider.category} · {provider.location}</p>
              </div>
            ))}
          </div>
        </div>
        <form className="card grid gap-4 p-6">
          <h2 className="text-2xl font-semibold">Formulaire prestataire</h2>
          {["Nom", "Catégorie", "Localisation", "Capacité groupe", "Prix", "Saison", "Site web", "Contact"].map((field) => (
            <label className="grid gap-2 text-sm font-semibold" key={field}>
              {field}
              <input className="rounded-lg border border-forest-100 bg-forest-50 p-3 font-normal outline-none" placeholder={field} />
            </label>
          ))}
          <label className="flex items-center gap-3 rounded-lg bg-forest-50 p-4 font-medium">
            <input type="checkbox" /> Besoin de réservation
          </label>
          <label className="flex items-center gap-3 rounded-lg bg-forest-50 p-4 font-medium">
            <input type="checkbox" /> Encadrement professionnel
          </label>
          <button className="btn-primary" type="button">Demander le référencement</button>
        </form>
      </div>
    </section>
  );
}

function Safety() {
  return (
    <section className="container-page py-10">
      <div className="mx-auto max-w-4xl text-center">
        <p className="pill">Sécurité</p>
        <h1 className="mt-4 text-4xl font-semibold">Une aventure collective, pas une app de dating.</h1>
        <p className="mt-4 leading-8 text-forest-700">Tribu Nature aide à composer une aventure et à connecter des personnes, destinations et prestataires. L'app ne vend pas de package fermé et ne remplace pas les professionnels quand une activité l'exige.</p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {[
          "Les profils peuvent être vérifiés",
          "Les groupes sont limités",
          "Les activités à risque doivent être encadrées",
          "Les utilisateurs peuvent signaler un comportement",
          "Chaque Trip peut avoir un référent",
          "Le niveau physique est indiqué clairement",
          "Des groupes plus rassurants peuvent être choisis",
          "Des groupes femmes-only peuvent exister",
          "Chat de groupe modéré et charte comportementale"
        ].map((item) => (
          <div className="card p-5" key={item}>
            <ShieldCheck className="mb-4 text-forest-700" />
            <p className="font-semibold">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function InfoBlock({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="card p-6 sm:p-8">
      <p className="pill">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-semibold">{title}</h2>
      <p className="mt-4 leading-8 text-forest-700">{text}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-4 text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function ActivityCard({ activity }: { activity: Activity | MockLocalActivity }) {
  const display = "duration" in activity
    ? {
        name: activity.name,
        category: activity.category,
        duration: activity.duration,
        price: activity.estimated_price === 0 ? "gratuit" : `${activity.estimated_price} €`,
        score: activity.group_friendly ? "Adapté au groupe" : "À vérifier",
        physicalLevel: activity.physical_level,
        risk: activity.risk,
        weather: activity.weather_compatible.includes("pluie") ? "oui" : "selon météo",
        group: activity.group_friendly ? "oui" : "non",
        booking: activity.booking_required ? "oui" : "non",
        supervision: activity.risk === "moyen" ? "recommandé" : "non requis",
        tags: activity.ambience,
        description: activity.description,
        mapUrl: activity.lat && activity.lng ? `https://www.google.com/maps/search/?api=1&query=${activity.lat},${activity.lng}` : "",
        referenceUrl: activity.external_url ?? "",
        referenceLabel: activity.external_url ? referenceLabel(activity.source) : ""
      }
    : {
        name: activity.name,
        category: activity.category,
        duration: activity.duration_estimate,
        price: activity.price_min === 0 ? "gratuit" : `${activity.price_min} à ${activity.price_max} €`,
        score: `${activity.confidence_score}% adapté au groupe`,
        physicalLevel: activity.physical_level,
        risk: activity.risk_level,
        weather: activity.weather_dependency ? "oui" : "non",
        group: `${activity.group_size_min}-${activity.group_size_max} personnes`,
        booking: activity.booking_required ? "oui" : "non",
        supervision: activity.professional_supervision_required ? "obligatoire" : "non requis",
        tags: activity.ambience_tags,
        description: "",
        mapUrl: `https://www.google.com/maps/search/?api=1&query=${activity.lat},${activity.lng}`,
        referenceUrl: "",
        referenceLabel: ""
      };

  return (
    <div className="group rounded-[1.25rem] bg-white p-4 shadow-soft transition hover:-translate-y-1">
      <div className="flex items-start justify-between gap-3">
        <p className="rounded-full bg-forest-50 px-3 py-1.5 text-xs font-semibold text-forest-700">{display.category}</p>
        <span className="text-xs font-bold text-forest-700">{display.score}</span>
      </div>
      <h3 className="mt-4 text-xl font-semibold leading-tight">{display.name}</h3>
      <p className="mt-2 text-sm font-semibold text-forest-700">{display.duration} · {display.price}</p>
      {display.description && <p className="mt-3 text-sm leading-6 text-forest-700">{display.description}</p>}
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-forest-700">
        <span className="rounded-full bg-forest-50 px-3 py-1.5">{display.physicalLevel}</span>
        <span className="rounded-full bg-forest-50 px-3 py-1.5">Risque {display.risk}</span>
        <span className="rounded-full bg-forest-50 px-3 py-1.5">{display.booking === "oui" ? "Réservation" : "Sans réservation"}</span>
      </div>
      <TagList tags={display.tags.slice(0, 2)} />
      <div className="mt-4 flex flex-wrap gap-2">
        {display.mapUrl && (
          <a className="btn-secondary py-2 text-sm" href={display.mapUrl} target="_blank" rel="noreferrer">
            Voir sur la carte
          </a>
        )}
        {display.referenceUrl && (
          <a className="btn-secondary py-2 text-sm" href={display.referenceUrl} target="_blank" rel="noreferrer">
            {display.referenceLabel}
          </a>
        )}
      </div>
    </div>
  );
}

function referenceLabel(source?: MockLocalActivity["source"]) {
  if (source === "openstreetmap") return "Voir la fiche OpenStreetMap";
  if (source === "google_places") return "Voir le site";
  if (source === "datatourisme") return "Voir la fiche tourisme";
  return "Voir une référence";
}

function MemberCard({ member }: { member: UserProfile }) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] bg-white">
      <div className="relative">
        <img className="h-52 w-full object-cover" src={member.photo_url} alt={member.name} />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest-900/80 to-transparent p-4 text-white">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold">{member.name}, {member.age_range}</h3>
            {member.verified && <BadgeCheck size={18} />}
          </div>
          <p className="text-sm text-white/85">{member.city}</p>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm leading-6 text-forest-700">“{member.bio}”</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <MiniFact label="Ambiance" value={member.adventure_style} />
          <MiniFact label="Niveau" value={member.physical_level} />
        </div>
        <TagList tags={member.badges} />
      </div>
    </div>
  );
}

function TagList({ tags }: { tags: string[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {tags.map((tag) => <span className="pill text-xs" key={tag}>{tag}</span>)}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-forest-50 p-4">
      <p className="text-sm text-forest-700">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function BudgetRows({ rows }: { rows: [string, string][] }) {
  return (
    <div className="mt-5 grid gap-2">
      {rows.map(([label, value]) => (
        <div className="flex justify-between rounded-xl bg-forest-50 px-4 py-3 text-sm" key={label}>
          <span className="text-forest-700">{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function Footer({ go }: { go: (page: Page) => void }) {
  return (
    <footer className="border-t border-forest-100 bg-white">
      <div className="container-page grid gap-6 py-8 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="font-semibold">Tribu Nature</p>
          <p className="mt-1 text-sm text-forest-700">Une plateforme sociale intelligente qui transforme une envie individuelle de nature en aventure collective organisée.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["Trips", "dashboard", Compass],
            ["Profil", "profil", Users],
            ["Sécurité", "securite", HeartHandshake]
          ].map(([label, target, Icon]) => {
            const IconComponent = Icon as typeof Home;
            return (
              <button className="btn-secondary py-2 text-sm" key={label as string} onClick={() => go(target as Page)}>
                <IconComponent size={16} />
                <span className="ml-2">{label as string}</span>
              </button>
            );
          })}
        </div>
      </div>
    </footer>
  );
}

export default App;
