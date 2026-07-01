import { type ChangeEvent, type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CloudSun,
  Compass,
  Copy,
  CheckCircle2,
  Euro,
  ExternalLink,
  FileText,
  Flag,
  Heart,
  HeartHandshake,
  Home,
  MapPin,
  ImagePlus,
  Info,
  Languages,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Mountain,
  Plus,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserX,
  UserRound,
  Users,
  X
} from "lucide-react";
import { activities, destination, providers, trips as localTrips, mockLocalActivities as localActivities } from "./data";
import {
  getCurrentProfile,
  getPasswordRecoverySessionFromUrl,
  getProfileById,
  getProfilesByIds,
  getStoredSession,
  hasSupabaseAuthConfig,
  signOut,
  signInWithEmail,
  signUpWithEmail,
  requestPasswordReset,
  touchPresence,
  updatePassword,
  updateProfile,
  deactivateMyAccount,
  exportMyData,
  type AuthSession,
  type UserProfileUpdate,
  type UserProfileRecord
} from "./services/authService";
import { createTrip, deleteTrip, hasSupabaseCatalogConfig, loadTripCatalog, type TripCatalog } from "./services/tripCatalogService";
import {
  deleteNotification,
  getMyNotifications,
  markNotificationAsRead,
  type NotificationRecord
} from "./services/notificationService";
import {
  blockUser,
  createUserReport,
  getMyBlocks,
  unblockUser,
  type ReportReason,
  type ReportTarget,
  type UserBlock
} from "./services/trustSafetyService";
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
  cancelJoinRequest,
  confirmTrip,
  deleteConversationMessage,
  expressInterestInCatalogTrip,
  ensureTripConversation,
  getConversationMembers,
  getConversationMessages,
  getMyTripConversationSummaries,
  getTripConfirmations,
  getTripParticipants,
  getUserTripActions,
  leaveTrip,
  markTripConversationAsRead,
  requestToJoinTrip,
  rejectJoinRequest,
  sendConversationMessage,
  updateConversationMessage,
  withdrawTripConfirmation,
  type TripConfirmation,
  type TripConversationSummary,
  type UserTripActions
} from "./services/tripSocialService";
import {
  acceptTribeRequest,
  cancelTribeRequest,
  getCompatibleProfiles,
  getMyTribeRequests,
  getTribeMessages,
  getUnreadTribeMessageCounts,
  markTribeConversationAsRead,
  rejectTribeRequest,
  sendTribeMessage,
  deleteTribeMessage,
  updateTribeMessage,
  sendTribeRequest,
  type TribeConnection,
  type TribeMessage,
  type TribeRequestBundle
} from "./services/tribeService";
import { resolveProfileAvatarUrl, uploadProfileAvatar, validateProfileAvatarFile } from "./services/profileService";
import { searchLocationSuggestions, type LocationSuggestion } from "./services/locationService";
import {
  createConversationMediaUrls,
  deleteConversationImages,
  deleteTripImages,
  uploadConversationImages,
  uploadTripImages,
  validateImageFiles
} from "./services/mediaService";
import { sendContactMessage } from "./services/contactService";
import { calculateTripMatch, type TripMatchResult } from "./services/matchService";
import { searchPexelsActivityPhotos, type PexelsActivityPhoto } from "./services/pexelsService";
import { getActivityImageRotation } from "./services/tripActivityMediaService";
import {
  getTravelPreferences,
  upsertTravelPreferences,
  type TravelPreferencesUpdate
} from "./services/travelPreferenceService";
import type { Activity, MockLocalActivity, OnboardingProfile, TravelPreferences, Trip, UserProfile } from "./types";

type Page = "landing" | "dashboard" | "my-trips" | "create-trip" | "trip" | "conversation" | "messages" | "notifications" | "communaute" | "profil" | "prestataires" | "securite" | "settings" | "cgu" | "privacy" | "about" | "contact";
type CommunityTab = "compatibles" | "tribe";

type NavigationSnapshot = {
  page: Page;
  selectedTripId: string;
  selectedProfileId: string | null;
  communityInitialTab: CommunityTab;
};

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
    createdAt?: string;
    updatedAt?: string | null;
    imagePaths?: string[];
    imageUrls?: string[];
    system?: boolean;
  }[];
};

const navItems: { page: Page; label: string }[] = [
  { page: "dashboard", label: "Destination" },
  { page: "my-trips", label: "Mes Trips" },
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

const anonymousUser: UserProfile = {
  id: "anonymous",
  name: "Voyageur",
  age_range: "À préciser",
  city: "À préciser",
  photo_url: getFallbackAvatar("Voyageur"),
  bio: "Connecte-toi pour compléter ton profil.",
  verified: false,
  physical_level: "À préciser",
  budget_range: "À préciser",
  adventure_style: "Nature",
  preferred_ambiences: [],
  safety_preferences: [],
  past_trips: 0,
  badges: []
};

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
    options: ["Sécurité renforcée", "Profils avec identité claire", "Groupe avec organisateur identifié", "Expérience encadrée par professionnel", "Niveau physique cohérent", "Plan B météo prévu"]
  },
  {
    title: "Organisation",
    options: ["Dates flexibles", "Budget flexible", "Transport partagé", "Départ depuis ma ville", "Organisation collective", "Trip déjà planifié"]
  }
];

const resultFilterOptions: Record<Exclude<ResultFilterKey, "dates" | "destination">, string[]> = {
  localisation: ["Départ Bordeaux", "Départ Paris", "Départ Lyon", "Départ Toulouse"],
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

function getTripMembers(_trip?: Trip): UserProfile[] {
  return [];
}

function getFallbackAvatar(name: string) {
  const initials = (name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "TN").replace(/[^A-Z0-9À-ÖØ-Þ]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" rx="48" fill="#dfece3"/><text x="128" y="144" text-anchor="middle" font-family="Arial,sans-serif" font-size="78" font-weight="700" fill="#174a3a">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function profileRecordToUserProfile(profile: UserProfileRecord, travelPreferences?: TravelPreferences | null): UserProfile {
  const avatarUrl = resolveProfileAvatarUrl(profile.avatar_url, profile.avatar_path);
  return {
    id: profile.id,
    name: profile.display_name,
    age_range: profile.age_range ?? "Membre",
    city: profile.city ?? "Ville à préciser",
    photo_url: avatarUrl ?? getFallbackAvatar(profile.display_name),
    bio: profile.bio ?? "Profil Tribu Nature en construction.",
    verified: Boolean(profile.verified ?? true),
    physical_level: profile.physical_level ?? "À préciser",
    budget_range: profile.budget_range ?? "À préciser",
    adventure_style: profile.adventure_style ?? "Nature",
    preferred_ambiences: profile.preferred_ambiences?.length ? profile.preferred_ambiences : ["Nature", "Découverte locale"],
    safety_preferences: profile.safety_preferences?.length ? profile.safety_preferences : ["Profil connecté"],
    past_trips: profile.past_trips ?? 0,
    badges: profile.badges?.length ? profile.badges : ["profil connecté"],
    last_seen_at: profile.last_seen_at ?? null,
    travel_preferences: travelPreferences ?? null
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
    verified: false,
    physical_level: "À préciser",
    budget_range: "À préciser",
    adventure_style: "Nature",
    preferred_ambiences: ["Nature", "Découverte locale"],
    safety_preferences: ["Profil connecté"],
    past_trips: 0,
    badges: ["profil connecté"]
  };
}

function getProfileHandle(profile: UserProfileRecord) {
  const source = profile.display_name || "membre";
  const normalized = normalizeUiText(source).replace(/[^a-z0-9._]+/g, ".").replace(/^\.+|\.+$/g, "");
  return `@${normalized || "membre"}.${profile.id.slice(0, 5)}`;
}

function isProfileOnline(lastSeenAt?: string | null) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 2 * 60_000;
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
  if (actionState === "interested") return "Ouvrir la discussion";
  if (actionState === "pending") return "Demande en attente";
  if (actionState === "accepted" || actionState === "participant") return "Ouvrir la discussion";
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

type MyTripStatus = {
  key: "created" | "joined" | "interested" | "requested" | "rejected" | "cancelled";
  label: string;
  tone: string;
};

function getMyTripStatuses(trip: Trip, userId: string, userTripActions: UserTripActions | null, isFavorite = false): MyTripStatus[] {
  if (trip.creator_id === userId) {
    return [{ key: "created", label: "Trip créé par toi", tone: "bg-forest-900 text-white" }];
  }

  const statuses: MyTripStatus[] = [];
  const activeParticipant = userTripActions?.participants.some((participant) => participant.trip_id === trip.id && participant.status === "active");
  const activeInterest = userTripActions?.interests.some((interest) => interest.trip_id === trip.id && interest.status === "interested");
  const joinRequest = userTripActions?.joinRequests.find((request) => request.trip_id === trip.id && request.requester_id === userId);

  if (activeParticipant || joinRequest?.status === "accepted") {
    statuses.push({ key: "joined", label: "Trip rejoint", tone: "bg-emerald-100 text-emerald-900" });
  } else if (joinRequest?.status === "pending") {
    statuses.push({ key: "requested", label: "Demande envoyée", tone: "bg-sun/20 text-forest-900" });
  } else if (joinRequest?.status === "rejected") {
    statuses.push({ key: "rejected", label: "Demande refusée", tone: "bg-rose-100 text-rose-900" });
  } else if (joinRequest?.status === "cancelled") {
    statuses.push({ key: "cancelled", label: "Demande annulée", tone: "bg-forest-100 text-forest-700" });
  }

  if ((activeInterest || isFavorite) && !statuses.some((status) => status.key === "joined")) {
    statuses.push({ key: "interested", label: "Tu es intéressé", tone: "bg-skysoft text-forest-900" });
  }

  return statuses;
}

function canOpenTripConversation(trip: Trip, userId: string, userTripActions: UserTripActions | null) {
  return getMyTripStatuses(trip, userId, userTripActions).some((status) => (
    status.key === "created" || status.key === "joined" || status.key === "interested"
  ));
}

function keepPreviousIfEqual<T>(previous: T, next: T): T {
  return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
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
  const [tribeProfiles, setTribeProfiles] = useState<UserProfileRecord[]>([]);
  const [tribeRequests, setTribeRequests] = useState<TribeRequestBundle>({ received: [], sent: [], accepted: [] });
  const [currentTravelPreferences, setCurrentTravelPreferences] = useState<TravelPreferences | null>(null);
  const [tripInvitations, setTripInvitations] = useState<TripInvitation[]>([]);
  const [createTripSeed, setCreateTripSeed] = useState<Trip | null>(null);
  const [shareTrip, setShareTrip] = useState<Trip | null>(null);
  const [joinRequestConfirmationTrip, setJoinRequestConfirmationTrip] = useState<Trip | null>(null);
  const [communityInitialTab, setCommunityInitialTab] = useState<CommunityTab>("compatibles");
  const [selectedTribeMessageMemberId, setSelectedTribeMessageMemberId] = useState<string | null>(null);
  const [tribeUnreadMessageCounts, setTribeUnreadMessageCounts] = useState<Record<string, number>>({});
  const [tripConversationSummaries, setTripConversationSummaries] = useState<TripConversationSummary[]>([]);
  const [userBlocks, setUserBlocks] = useState<UserBlock[]>([]);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [blockTarget, setBlockTarget] = useState<{ id: string; name: string } | null>(null);
  const [passwordRecoveryOpen, setPasswordRecoveryOpen] = useState(false);
  const [initialTripLinkHandled, setInitialTripLinkHandled] = useState(false);
  const [socialNotice, setSocialNotice] = useState("");
  const [catalogLoaded, setCatalogLoaded] = useState(!hasSupabaseCatalogConfig());
  const [catalog, setCatalog] = useState<TripCatalog>(() => ({
    trips: localTrips,
    activities: localActivities,
    source: "local"
  }));
  const navigationStack = useRef<NavigationSnapshot[]>([]);

  useEffect(() => {
    if (!socialNotice) return;
    const timeout = window.setTimeout(() => setSocialNotice(""), 4_000);
    return () => window.clearTimeout(timeout);
  }, [socialNotice]);

  useEffect(() => {
    let mounted = true;

    const loadAuth = async () => {
      if (!hasSupabaseAuthConfig()) {
        setAuthLoading(false);
        return;
      }

      try {
        const recoverySession = await getPasswordRecoverySessionFromUrl();
        const session = recoverySession ?? await getStoredSession();
        if (!mounted) return;
        setAuthSession(session);
        setPasswordRecoveryOpen(Boolean(recoverySession));

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

  const refreshCatalog = useCallback(async () => {
    if (!hasSupabaseCatalogConfig()) {
      setCatalogLoaded(true);
      return;
    }

    const nextCatalog = await loadTripCatalog(authSession?.access_token);
    setCatalog((previous) => (
      previous.source === "supabase" && nextCatalog.source === "local"
        ? previous
        : keepPreviousIfEqual(previous, nextCatalog)
    ));
    setCatalogLoaded(true);
  }, [authSession?.access_token]);

  useEffect(() => {
    let mounted = true;

    refreshCatalog().catch((error) => {
      if (mounted) console.warn("Catalogue distant indisponible.", error);
    });

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshCatalog();
    };
    const interval = window.setInterval(() => void refreshCatalog(), 30_000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshCatalog]);

  const refreshSocialData = async (session: AuthSession) => {
    try {
      const [actions, favorites, nextNotifications, profiles, requests, invitations, tripConversations, blocks] = await Promise.all([
        getUserTripActions(session.user.id, session.access_token),
        getMyFavoriteTrips(session.user.id, session.access_token),
        getMyNotifications(session.user.id, session.access_token),
        getCompatibleProfiles(session.user.id, session.access_token),
        getMyTribeRequests(session.user.id, session.access_token),
        getMyTripInvitations(session.user.id, session.access_token),
        getMyTripConversationSummaries(session.user.id, session.access_token),
        getMyBlocks(session.user.id, session.access_token)
      ]);

      setUserTripActions((previous) => keepPreviousIfEqual(previous, actions));
      setFavoriteTripIds((previous) => keepPreviousIfEqual(previous, favorites.map((favorite) => favorite.trip_id)));
      setNotifications((previous) => keepPreviousIfEqual(previous, nextNotifications));
      setTribeProfiles((previous) => keepPreviousIfEqual(previous, profiles));
      setTribeRequests((previous) => keepPreviousIfEqual(previous, requests));
      setTripInvitations((previous) => keepPreviousIfEqual(previous, invitations));
      setTripConversationSummaries((previous) => keepPreviousIfEqual(previous, tripConversations));
      setUserBlocks((previous) => keepPreviousIfEqual(previous, blocks));

      try {
        const unreadTribeMessages = await getUnreadTribeMessageCounts(session.user.id, requests.accepted, session.access_token);
        setTribeUnreadMessageCounts((previous) => keepPreviousIfEqual(previous, unreadTribeMessages));
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
      setCurrentTravelPreferences(null);
      setTribeUnreadMessageCounts({});
      setTripConversationSummaries([]);
      setUserBlocks([]);
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
    const touch = () => void touchPresence(authSession.access_token)
      .then((lastSeenAt) => setCurrentProfile((profile) => profile ? { ...profile, last_seen_at: lastSeenAt } : profile))
      .catch((error) => console.warn("Présence indisponible.", error));
    touch();
    const interval = window.setInterval(touch, 60_000);
    return () => window.clearInterval(interval);
  }, [authSession]);

  useEffect(() => {
    if (!authSession) {
      setCurrentTravelPreferences(null);
      return;
    }

    let mounted = true;
    getTravelPreferences(authSession.user.id, authSession.access_token)
      .then((preferences) => {
        if (mounted) setCurrentTravelPreferences(preferences);
      })
      .catch((error) => console.warn("Préférences de matching indisponibles.", error));

    return () => {
      mounted = false;
    };
  }, [authSession]);

  useEffect(() => {
    if (!authSession) return;

    let refreshing = false;
    const refresh = async () => {
      if (refreshing || document.visibilityState !== "visible") return;
      refreshing = true;
      try {
        await refreshSocialData(authSession);
      } finally {
        refreshing = false;
      }
    };
    const interval = window.setInterval(() => void refresh(), 5_000);
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

  const relatedTripIds = new Set([
    ...(userTripActions?.participants.map((item) => item.trip_id) ?? []),
    ...(userTripActions?.interests.map((item) => item.trip_id) ?? []),
    ...(userTripActions?.joinRequests.map((item) => item.trip_id) ?? []),
    ...favoriteTripIds
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const visibleCatalogTrips = catalog.trips.filter((trip) => (
    (!trip.end_date || trip.end_date >= today)
    && (isTripPubliclyVisible(trip) || trip.creator_id === currentProfile?.id || relatedTripIds.has(trip.id))
  ));
  const availableTrips = [...new Map(
    [...visibleCatalogTrips, ...communityTrips].map((trip) => [trip.id, trip])
  ).values()];
  const favoriteTrips = availableTrips.filter((trip) => favoriteTripIds.includes(trip.id));
  const selectedTrip = availableTrips.find((trip) => trip.id === selectedTripId) ?? availableTrips[0] ?? catalog.trips[0];
  const currentUser = currentProfile ? profileRecordToUserProfile(currentProfile, currentTravelPreferences) : anonymousUser;
  const isAuthenticated = Boolean(authSession && currentProfile);
  const pendingReceivedJoinRequests = userTripActions?.joinRequests.filter((request) => request.creator_id === currentProfile?.id && request.status === "pending") ?? [];
  const notifiedJoinRequestIds = new Set(
    notifications
      .filter((notification) => notification.type === "join_request_received" && notification.related_request_id)
      .map((notification) => notification.related_request_id)
  );
  const pendingReceivedJoinRequestsWithoutNotification = pendingReceivedJoinRequests.filter((request) => !notifiedJoinRequestIds.has(request.id));
  const unreadNotificationCount = notifications.filter((notification) => !notification.read_at).length + pendingReceivedJoinRequestsWithoutNotification.length;
  const tribeUnreadMessageCount = Object.values(tribeUnreadMessageCounts).reduce((total, count) => total + count, 0);
  const tripUnreadMessageCount = tripConversationSummaries.reduce((total, summary) => total + summary.unreadCount, 0);
  const selectedTripMatch = calculateTripMatch(isAuthenticated ? currentUser : null, selectedTrip);
  const profilePageRecord = selectedProfileId ? viewedProfile ?? fallbackProfileRecord(selectedProfileId) : currentProfile;
  const profilePageUser = profilePageRecord ? profileRecordToUserProfile(profilePageRecord) : currentUser;
  const isOwnProfilePage = !selectedProfileId || selectedProfileId === currentProfile?.id;
  const validatedMembers = tripMemberProfiles[selectedTrip.id] ?? getTripMembers(selectedTrip);
  const acceptedTribeMemberIds = useMemo(() => new Set(
    tribeRequests.accepted.map((request) => request.requester_id === currentUser.id ? request.receiver_id : request.requester_id)
  ), [currentUser.id, tribeRequests.accepted]);
  const blockedUserIds = useMemo(() => new Set(userBlocks.map((block) => block.blocked_id)), [userBlocks]);
  const visibleTribeProfiles = useMemo(() => tribeProfiles.filter((profile) => !blockedUserIds.has(profile.id)), [blockedUserIds, tribeProfiles]);
  const tribeShareMembers = useMemo(
    () => visibleTribeProfiles
      .filter((profile) => acceptedTribeMemberIds.has(profile.id))
      .map((profile) => profileRecordToUserProfile(profile)),
    [acceptedTribeMemberIds, visibleTribeProfiles]
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
  const go = (next: Page, options?: { keepSelectedProfile?: boolean; replace?: boolean }) => {
    if (next !== page && !options?.replace) {
      navigationStack.current.push({
        page,
        selectedTripId,
        selectedProfileId,
        communityInitialTab
      });
    }
    if (next !== "profil" || !options?.keepSelectedProfile) {
      setSelectedProfileId(null);
    }
    setPage(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goBack = () => {
    const previous = navigationStack.current.pop();
    if (!previous) {
      go("dashboard", { replace: true });
      return;
    }

    setSelectedTripId(previous.selectedTripId);
    setSelectedProfileId(previous.selectedProfileId);
    setCommunityInitialTab(previous.communityInitialTab);
    setPage(previous.page);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  useEffect(() => {
    if (page === "dashboard" || authModalOpen || shareTrip || joinRequestConfirmationTrip) return;
    let startX = 0;
    let startY = 0;
    let startedAt = 0;
    let tracking = false;
    const edgeSize = 32;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      const startsAtLeftEdge = touch.clientX <= edgeSize;
      const startsAtRightEdge = touch.clientX >= window.innerWidth - edgeSize;
      if (!startsAtLeftEdge && !startsAtRightEdge) return;
      startX = touch.clientX;
      startY = touch.clientY;
      startedAt = Date.now();
      tracking = true;
    };
    const handleTouchMove = (event: TouchEvent) => {
      if (!tracking || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const horizontalDistance = Math.abs(touch.clientX - startX);
      const verticalDistance = Math.abs(touch.clientY - startY);
      if (horizontalDistance > 12 && horizontalDistance > verticalDistance * 1.2) event.preventDefault();
    };
    const handleTouchEnd = (event: TouchEvent) => {
      if (!tracking || event.changedTouches.length !== 1) return;
      tracking = false;
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const fromLeftEdge = startX <= edgeSize && deltaX >= 72;
      const fromRightEdge = startX >= window.innerWidth - edgeSize && deltaX <= -72;
      if ((fromLeftEdge || fromRightEdge) && Math.abs(deltaY) < 60 && Date.now() - startedAt < 900) goBack();
    };
    const cancelTouch = () => { tracking = false; };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", cancelTouch, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", cancelTouch);
    };
  }, [authModalOpen, joinRequestConfirmationTrip, page, shareTrip]);
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
    go("profil", { keepSelectedProfile: true });
  };
  const openTribeInbox = (memberId?: string) => {
    setSelectedTribeMessageMemberId(memberId ?? null);
    go("messages");
  };
  const markTribeConversationRead = useCallback(async (connectionId: string) => {
    if (!authSession || !currentProfile) return;

    try {
      await markTribeConversationAsRead(connectionId, currentProfile.id, authSession.access_token);
      setTribeUnreadMessageCounts((current) => {
        if (!current[connectionId]) return current;
        const next = { ...current };
        delete next[connectionId];
        return next;
      });
    } catch (error) {
      console.warn("Lecture de la conversation non enregistrée.", error);
    }
  }, [authSession, currentProfile]);
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
    setTribeProfiles([]);
    setTribeRequests({ received: [], sent: [], accepted: [] });
    setTripInvitations([]);
    setCurrentTravelPreferences(null);
    setTribeUnreadMessageCounts({});
    setTripConversationSummaries([]);
    setUserBlocks([]);
    setSocialNotice("");
  };

  const openReportDialog = (target: ReportTarget) => {
    const session = requireAuth("Connecte-toi pour envoyer un signalement.");
    if (!session) return;
    setReportTarget(target);
  };
  const submitReport = async (reason: ReportReason, details: string) => {
    const session = requireAuth("Connecte-toi pour envoyer un signalement.");
    if (!session || !reportTarget) return;
    await createUserReport(session.user.id, reportTarget, reason, details, session.access_token);
    setReportTarget(null);
    setSocialNotice("Signalement envoyé. Notre équipe pourra l'examiner.");
  };
  const requestUserBlock = (userId: string, name: string) => {
    const session = requireAuth("Connecte-toi pour bloquer cette personne.");
    if (!session || userId === session.user.id) return;
    setBlockTarget({ id: userId, name });
  };
  const confirmUserBlock = async () => {
    const session = requireAuth("Connecte-toi pour bloquer cette personne.");
    if (!session || !blockTarget) return;
    const block = await blockUser(session.user.id, blockTarget.id, session.access_token);
    setUserBlocks((current) => [...current.filter((item) => item.blocked_id !== block.blocked_id), block]);
    setTribeProfiles((current) => current.filter((profile) => profile.id !== block.blocked_id));
    setBlockTarget(null);
    setSocialNotice("Utilisateur bloqué. Il ne peut plus t'envoyer de message privé.");
    await refreshSocialData(session);
  };
  const unblockUserFlow = async (blockedId: string) => {
    const session = requireAuth("Connecte-toi pour gérer tes blocages.");
    if (!session) return;
    await unblockUser(session.user.id, blockedId, session.access_token);
    setUserBlocks((current) => current.filter((item) => item.blocked_id !== blockedId));
    setSocialNotice("Utilisateur débloqué.");
    await refreshSocialData(session);
  };
  const deactivateAccountFlow = async () => {
    if (!authSession) return;
    await deactivateMyAccount(authSession.access_token);
    await handleSignOut();
    go("dashboard", { replace: true });
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
  const updateTravelPreferencesFlow = async (updates: TravelPreferencesUpdate) => {
    const session = requireAuth("Connecte-toi pour modifier tes préférences de voyage.");
    if (!session || !currentProfile) throw new Error("Connexion nécessaire pour modifier les préférences.");
    const nextPreferences = await upsertTravelPreferences(currentProfile.id, updates, session.access_token);
    setCurrentTravelPreferences(nextPreferences);
    setSocialNotice("Préférences de matching mises à jour.");
    return nextPreferences;
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
      if (action === "accept") await acceptTripInvitation(invitationId, session.access_token);
      else await rejectTripInvitation(invitationId, session.access_token);

      if (action === "accept") {
        if (getTripCardType(trip) === "catalog") {
          await expressInterestInCatalogTrip(trip.id, session.user.id, session.access_token);
        }
      }

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
      if (action === "accept") await acceptTribeRequest(connectionId, session.access_token);
      else if (action === "reject") await rejectTribeRequest(connectionId, session.access_token);
      else await cancelTribeRequest(connectionId, session.access_token);

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
      setSocialNotice("Demande refusée.");
      await refreshSocialData(session);
    } catch (error) {
      console.error("Refus impossible.", error);
      setSocialNotice(error instanceof Error ? error.message : "Impossible de refuser cette demande.");
    }
  };
  const cancelJoinRequestFlow = async (requestId: string) => {
    const session = requireAuth("Connecte-toi pour annuler cette demande.");
    if (!session) return;

    try {
      await cancelJoinRequest(requestId, session.access_token);
      setSocialNotice("Ta demande a été annulée.");
      await refreshSocialData(session);
    } catch (error) {
      console.error("Annulation de la demande impossible.", error);
      setSocialNotice(error instanceof Error ? error.message : "Impossible d'annuler cette demande.");
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
  const publishCommunityTrip = async (trip: Trip, imageFiles: File[] = []) => {
    const session = requireAuth("Connecte-toi pour publier un Trip avec ton vrai profil.");
    if (!session || !currentProfile) {
      throw new Error("Connecte-toi pour publier un Trip.");
    }

    let authenticatedTrip: Trip = {
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
    let uploadedImageUrls: string[] = [];

    try {
      if (imageFiles.length > 0) {
        const uploadedImages = await uploadTripImages(session.user.id, authenticatedTrip.id, imageFiles, session.access_token);
        uploadedImageUrls = uploadedImages.map((image) => image.url);
        authenticatedTrip = {
          ...authenticatedTrip,
          image_url: uploadedImageUrls[0],
          image_urls: uploadedImageUrls
        };
      }
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
      await refreshCatalog();
    } catch (error) {
      console.error("Impossible de publier le Trip.", error);
      if (uploadedImageUrls.length > 0) {
        await deleteTripImages(uploadedImageUrls, session.access_token).catch(() => undefined);
      }
      throw error;
    }
    go("dashboard");
  };
  const leaveTripFlow = async (trip: Trip) => {
    const session = requireAuth("Connecte-toi pour quitter ce Trip.");
    if (!session) return;
    await leaveTrip(trip.id, session.access_token);
    if (favoriteTripIds.includes(trip.id)) {
      await removeTripFromFavorites(trip.id, session.user.id, session.access_token);
      setFavoriteTripIds((previous) => previous.filter((id) => id !== trip.id));
    }
    setConversation(null);
    setSocialNotice(`Tu as quitté « ${trip.title} » et sa conversation.`);
    await Promise.all([refreshSocialData(session), refreshCatalog()]);
    go("my-trips");
  };
  const deleteTripFlow = async (trip: Trip) => {
    const session = requireAuth("Connecte-toi pour supprimer ce Trip.");
    if (!session || trip.creator_id !== session.user.id) throw new Error("Seul le créateur peut supprimer ce Trip.");
    await deleteTripImages(trip.image_urls ?? [trip.image_url], session.access_token).catch((error) => {
      console.warn("Photos du Trip non supprimées.", error);
    });
    await deleteTrip(trip.id, session.access_token);
    setCommunityTrips((previous) => previous.filter((item) => item.id !== trip.id));
    setConversation(null);
    setSocialNotice(`« ${trip.title} » a été supprimé.`);
    await Promise.all([refreshSocialData(session), refreshCatalog()]);
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
  const joinTrip = async (trip: Trip, confirmed = false) => {
    const session = requireAuth(
      getTripCardType(trip) === "user_project"
        ? "Connecte-toi pour demander à rejoindre ce projet."
        : "Connecte-toi pour rejoindre les personnes intéressées par cette idée de voyage."
    );
    if (!session || !currentProfile) return;

    try {
      const actionState = getTripActionState(trip, userTripActions);

      if (
        getTripCardType(trip) === "user_project"
        && trip.creator_id
        && trip.creator_id !== session.user.id
        && !actionState
        && !confirmed
      ) {
        setJoinRequestConfirmationTrip(trip);
        return;
      }

      if (getTripCardType(trip) === "user_project" && actionState === "pending") {
        setSocialNotice("Ta demande est en attente de validation par le créateur.");
        return;
      }

      if (
        trip.creator_id === session.user.id
        || actionState === "participant"
        || actionState === "accepted"
        || (getTripCardType(trip) === "catalog" && actionState === "interested")
      ) {
        const conversation = await ensureTripConversation(trip.id, getTripConversationType(trip), session.access_token);
        await addTripParticipant(
          trip.id,
          session.user.id,
          session.access_token,
          trip.creator_id === session.user.id ? "creator" : "participant"
        );
        await addConversationMember(conversation.id, session.user.id, session.access_token);
        await refreshUserTripActions(session);
        await loadTripMembers(trip, session);
        await openTripConversation(trip, conversation.id);
        return;
      }

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
      } else if (trip.creator_id) {
        await requestToJoinTrip(trip.id, session.user.id, trip.creator_id, session.access_token);
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
        unreadMessageCount={tribeUnreadMessageCount + tripUnreadMessageCount}
        onAuthClick={() => openAuthModal("Connecte-toi pour accéder à ton profil et aux Trips.")}
        onNotificationsClick={() => go("notifications")}
        onMessagesClick={() => openTribeInbox()}
        onSignOut={handleSignOut}
      />
      {page !== "dashboard" && (
        <div className="border-b border-forest-100 bg-white/70 backdrop-blur">
          <div className="container-page py-2">
            <button className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-forest-800 transition hover:bg-white" onClick={goBack}>
              <ArrowLeft size={17} />
              Retour
            </button>
          </div>
        </div>
      )}
      <main className="pb-24 lg:pb-0">
        {page === "notifications" && (
          <NotificationsPage
            notifications={notifications}
            trips={availableTrips}
            profiles={[...(currentProfile ? [currentProfile] : []), ...tribeProfiles]}
            currentUserId={currentProfile?.id}
            joinRequests={userTripActions?.joinRequests ?? []}
            tripInvitations={tripInvitations}
            tribeRequests={tribeRequests}
            onAcceptJoinRequest={acceptJoinRequestFlow}
            onRejectJoinRequest={rejectJoinRequestFlow}
            onUpdateTripInvitation={updateTripInvitation}
            onUpdateTribeConnection={updateTribeConnection}
            onViewProfile={openProfile}
            onOpenTripConversation={(trip) => openTripConversation(trip, getTripConversationId(trip))}
            onMarkRead={markNotificationRead}
            onDeleteNotification={deleteNotificationFlow}
          />
        )}
        {page === "landing" && <Landing trips={availableTrips} catalogActivities={catalog.activities} go={go} openTrip={openTrip} onTripAction={joinTrip} userTripActions={userTripActions} favoriteTripIds={favoriteTripIds} onToggleFavorite={toggleTripFavorite} />}
        {page === "dashboard" && (
          <Dashboard
            trips={availableTrips}
            catalogActivities={catalog.activities}
            isGenerating={false}
            openTrip={openTrip}
            onTripAction={joinTrip}
            onCreateTrip={() => go("create-trip")}
            userTripActions={userTripActions}
            favoriteTripIds={favoriteTripIds}
            onToggleFavorite={toggleTripFavorite}
            getCreatorProfile={getKnownProfileRecord}
            onViewProfile={openProfile}
            matchProfile={isAuthenticated ? currentUser : null}
          />
        )}
        {page === "my-trips" && (
          <MyTripsPage
            trips={availableTrips}
            userId={currentProfile?.id}
            userTripActions={userTripActions}
            isAuthenticated={isAuthenticated}
            onAuthClick={() => openAuthModal("Connecte-toi pour retrouver tous tes Trips.")}
            onOpenTrip={openTripFromProfile}
            onCancelJoinRequest={cancelJoinRequestFlow}
            favoriteTripIds={favoriteTripIds}
            onLeaveTrip={leaveTripFlow}
            onDeleteTrip={deleteTripFlow}
            onCreateTrip={() => go("create-trip")}
          />
        )}
        {page === "create-trip" && <CreateTripPage proposerName={currentUser.name} initialTrip={createTripSeed} onPublish={publishCommunityTrip} />}
        {page === "trip" && <TripDetail trip={selectedTrip} match={selectedTripMatch} catalogActivities={catalog.activities} validatedMembers={validatedMembers} joinTrip={joinTrip} userTripActions={userTripActions} isFavorite={favoriteTripIds.includes(selectedTrip.id)} onToggleFavorite={toggleTripFavorite} onShareTrip={setShareTrip} creatorProfile={getKnownProfileRecord(selectedTrip.creator_id)} onViewProfile={openProfile} currentUserId={currentProfile?.id} acceptedTribeMemberIds={acceptedTribeMemberIds} onAddFriend={sendTribeConnectionRequest} onLeaveTrip={leaveTripFlow} onDeleteTrip={deleteTripFlow} onReportTrip={(trip) => openReportDialog({ type: "trip", label: trip.title, reportedTripId: trip.id, reportedUserId: trip.creator_id })} />}
        {page === "conversation" && <ConversationPage conversation={conversation} go={go} currentUser={currentUser} accessToken={authSession?.access_token} isAuthenticated={isAuthenticated} onRequireAuth={() => openAuthModal("Connecte-toi pour écrire dans la conversation.")} onFormalizeTrip={formalizeCatalogTrip} onViewProfile={openProfile} acceptedTribeMemberIds={acceptedTribeMemberIds} onAddFriend={sendTribeConnectionRequest} onLeaveTrip={leaveTripFlow} onDeleteTrip={deleteTripFlow} blockedUserIds={blockedUserIds} onReport={openReportDialog} onRefresh={async () => { if (authSession) await refreshSocialData(authSession); await refreshCatalog(); }} />}
        {page === "messages" && (
          <MessagesPage
            currentUser={currentUser}
            profiles={visibleTribeProfiles}
            tribeRequests={tribeRequests}
            trips={availableTrips}
            accessToken={authSession?.access_token}
            isAuthenticated={isAuthenticated}
            initialMemberId={selectedTribeMessageMemberId}
            unreadMessageCounts={tribeUnreadMessageCounts}
            tripConversationSummaries={tripConversationSummaries}
            onRequireAuth={() => openAuthModal("Connecte-toi pour accéder à tes messages.")}
            onConversationRead={markTribeConversationRead}
            onOpenTripConversation={(trip, conversationId) => openTripConversation(trip, conversationId)}
            onViewProfile={openProfile}
            onInviteToTrip={sendFavoriteTripInvitation}
            favoriteTrips={favoriteTrips}
            onReport={openReportDialog}
            onBlockUser={requestUserBlock}
          />
        )}
        {page === "communaute" && (
          <Community
            currentUser={currentUser}
            trips={availableTrips}
            favoriteTrips={favoriteTrips}
            profiles={visibleTribeProfiles}
            tribeRequests={tribeRequests}
            isAuthenticated={isAuthenticated}
            initialTab={communityInitialTab}
            onRequireAuth={() => openAuthModal("Connecte-toi pour contacter ou inviter des membres.")}
            onSendTribeRequest={sendTribeConnectionRequest}
            onViewProfile={openProfile}
            onOpenMessages={openTribeInbox}
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
            travelPreferences={currentTravelPreferences}
            onUpdateTravelPreferences={updateTravelPreferencesFlow}
            onUploadAvatar={uploadProfileAvatarFlow}
            onOpenTrip={openTripFromProfile}
            trips={availableTrips}
            userTripActions={userTripActions}
            tribeMemberCount={tribeRequests.accepted.length}
            isBlocked={blockedUserIds.has(profilePageUser.id)}
            onReportUser={(user) => openReportDialog({ type: "user", label: user.name, reportedUserId: user.id })}
            onBlockUser={(user) => requestUserBlock(user.id, user.name)}
            onUnblockUser={(user) => unblockUserFlow(user.id)}
          />
        )}
        {page === "prestataires" && <Providers />}
        {page === "securite" && <Safety />}
        {page === "settings" && <SettingsPage profile={currentProfile} accessToken={authSession?.access_token} blocks={userBlocks} onRequireAuth={() => openAuthModal("Connecte-toi pour gérer ton compte.")} onProfileUpdated={(profile) => setCurrentProfile(profile)} onSignOut={handleSignOut} onUnblock={unblockUserFlow} onDeactivate={deactivateAccountFlow} />}
        {page === "cgu" && <LegalPage kind="cgu" />}
        {page === "privacy" && <LegalPage kind="privacy" />}
        {page === "about" && <AboutPage />}
        {page === "contact" && <ContactPage profile={currentProfile} accessToken={authSession?.access_token} />}
      </main>
      <Footer go={go} />
      <MobileBottomNav page={page} go={go} onCreateTrip={() => go("create-trip")} />
      {socialNotice && (
        <div className="fixed bottom-20 left-1/2 z-[75] flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 items-center gap-3 rounded-[1rem] bg-forest-900 px-4 py-3 text-sm font-semibold text-white shadow-xl lg:bottom-6">
          <span className="min-w-0 flex-1">{socialNotice}</span>
          <button className="rounded-full p-1 text-white/80 transition hover:bg-white/10 hover:text-white" onClick={() => setSocialNotice("")} aria-label="Fermer le message">
            <X size={17} />
          </button>
        </div>
      )}
      {authModalOpen && <AuthModal prompt={authPrompt} onClose={() => setAuthModalOpen(false)} onAuthenticated={handleAuthSuccess} />}
      {passwordRecoveryOpen && authSession && <PasswordRecoveryDialog accessToken={authSession.access_token} onClose={() => setPasswordRecoveryOpen(false)} />}
      {reportTarget && <ReportDialog target={reportTarget} onCancel={() => setReportTarget(null)} onSubmit={submitReport} />}
      {blockTarget && (
        <ConfirmDialog
          title={`Bloquer ${blockTarget.name} ?`}
          description="Cette personne ne pourra plus t'envoyer de message privé et ne sera plus proposée dans ta Tribu. Votre relation actuelle sera retirée."
          confirmLabel="Bloquer"
          danger
          onCancel={() => setBlockTarget(null)}
          onConfirm={confirmUserBlock}
        />
      )}
      {shareTrip && (
        <ShareTripModal
          trip={shareTrip}
          tribeMembers={tribeShareMembers}
          onClose={() => setShareTrip(null)}
          onShareWithTribeMember={(member) => shareTripWithTribeMember(shareTrip, member)}
        />
      )}
      {joinRequestConfirmationTrip && (
        <ConfirmDialog
          title="Envoyer ta demande ?"
          description={`Le créateur de « ${joinRequestConfirmationTrip.title} » recevra ton profil et pourra accepter ou refuser ta demande.`}
          confirmLabel="Envoyer la demande"
          onCancel={() => setJoinRequestConfirmationTrip(null)}
          onConfirm={async () => {
            const trip = joinRequestConfirmationTrip;
            setJoinRequestConfirmationTrip(null);
            await joinTrip(trip, true);
          }}
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
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-sun px-1 text-[10px] font-bold text-white">
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
              <button className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-3 text-left text-sm font-semibold text-forest-800 shadow-sm" onClick={() => go("profil")}>
                <img className="h-8 w-8 rounded-full object-cover" src={resolveProfileAvatarUrl(currentProfile.avatar_url, currentProfile.avatar_path) ?? getFallbackAvatar(currentProfile.display_name)} alt="" />
                <span>
                  <span className="block max-w-28 truncate leading-tight">{currentProfile.display_name}</span>
                  <span className="block max-w-28 truncate text-[10px] font-medium leading-tight text-forest-500">{getProfileHandle(currentProfile)}</span>
                </span>
              </button>
              <button className="rounded-full bg-forest-50 px-4 py-2 text-sm font-semibold text-forest-700 transition hover:bg-forest-100" onClick={onSignOut}>
                Déconnexion
              </button>
            </div>
          ) : (
            <button className="btn-secondary py-2" onClick={onAuthClick}>{authLoading ? "Connexion..." : "Connexion"}</button>
          )}
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          {currentProfile && (
            <>
              <button className="relative rounded-full bg-white p-2 text-forest-800 shadow-sm" onClick={onMessagesClick} aria-label="Messages">
                <MessageCircle size={18} />
                {unreadMessageCount > 0 && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-sun" />}
              </button>
              <button className="relative rounded-full bg-white p-2 text-forest-800 shadow-sm" onClick={onNotificationsClick} aria-label="Notifications">
                <Bell size={18} />
                {unreadNotificationCount > 0 && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-sun" />}
              </button>
            </>
          )}
          <button className="rounded-lg border border-forest-100 bg-white p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="container-page border-t border-forest-100 py-3 lg:hidden">
          <div className="grid gap-2">
            {[...visibleNavItems, { page: "create-trip" as Page, label: "Créer un Trip" }, { page: "about" as Page, label: "À propos" }, { page: "contact" as Page, label: "Nous contacter" }, { page: "cgu" as Page, label: "CGU" }, { page: "privacy" as Page, label: "Confidentialité" }].map((item) => (
              <button key={item.page} className="rounded-lg bg-white px-4 py-3 text-left font-medium" onClick={() => go(item.page)}>
                {item.label}
              </button>
            ))}
            {currentProfile ? (
              <>
                <button className="flex items-center justify-between rounded-lg bg-white px-4 py-3 text-left font-medium" onClick={onMessagesClick}>
                  <span>Messages</span>
                  {unreadMessageCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-sun px-1 text-[10px] font-bold text-white">{unreadMessageCount}</span>}
                </button>
                <button className="rounded-lg bg-white px-4 py-3 text-left font-medium" onClick={onNotificationsClick}>Notifications ({unreadNotificationCount})</button>
                <button className="rounded-lg bg-white px-4 py-3 text-left font-medium" onClick={() => go("profil")}>{currentProfile.display_name} · {getProfileHandle(currentProfile)}</button>
                <button className="rounded-lg bg-white px-4 py-3 text-left font-medium" onClick={() => go("settings")}>Paramètres</button>
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
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [cityText, setCityText] = useState("");
  const [selectedCity, setSelectedCity] = useState<LocationSuggestion | null>(null);
  const [ageRange, setAgeRange] = useState("");
  const [physicalLevel, setPhysicalLevel] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [adventureStyle, setAdventureStyle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendPasswordReset = async () => {
    if (!email.includes("@")) {
      setFeedback("Saisis d'abord l'adresse email de ton compte.");
      return;
    }
    setIsSubmitting(true);
    setFeedback("");
    try {
      await requestPasswordReset(email.trim());
      setFeedback("Email envoyé. Ouvre le lien reçu pour choisir un nouveau mot de passe.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Impossible d'envoyer l'email de récupération.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submit = async () => {
    if (isSubmitting) return;
    setFeedback("");
    if (mode === "signup" && signupStep === 1) {
      if (!displayName.trim() || !email.includes("@") || password.length < 6) {
        setFeedback("Renseigne ton pseudo, un email valide et un mot de passe d'au moins 6 caractères.");
        return;
      }
      setSignupStep(2);
      return;
    }
    if (mode === "signup" && (!selectedCity || !ageRange || !physicalLevel || !budgetRange || !adventureStyle)) {
      setFeedback("Complète ces quelques informations pour personnaliser ton profil.");
      return;
    }
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

      if (mode === "signup") {
        await updateProfile(session.user.id, {
          city: selectedCity?.label ?? null,
          age_range: ageRange,
          physical_level: physicalLevel,
          budget_range: budgetRange,
          adventure_style: adventureStyle,
          preferred_ambiences: adventureStyle ? [adventureStyle] : []
        }, session.access_token);
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
          <button className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "signin" ? "bg-white shadow-sm" : "text-forest-700"}`} onClick={() => { setMode("signin"); setSignupStep(1); }}>
            Se connecter
          </button>
          <button className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "signup" ? "bg-white shadow-sm" : "text-forest-700"}`} onClick={() => { setMode("signup"); setSignupStep(1); }}>
            Créer un compte
          </button>
        </div>

        {mode === "signup" && <div className="mt-5 flex items-center gap-2"><span className={`h-1.5 flex-1 rounded-full ${signupStep >= 1 ? "bg-forest-800" : "bg-forest-100"}`} /><span className={`h-1.5 flex-1 rounded-full ${signupStep === 2 ? "bg-forest-800" : "bg-forest-100"}`} /></div>}
        <div className="mt-5 grid gap-3">
          {mode === "signup" && signupStep === 1 && (
            <label className="grid gap-2 text-sm font-semibold text-forest-700">
              Nom ou pseudo public
              <input className="rounded-lg border border-forest-100 bg-forest-50 px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-forest-600" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Ex : Karim Explorer" />
            </label>
          )}
          {(mode === "signin" || signupStep === 1) && <label className="grid gap-2 text-sm font-semibold text-forest-700">
            Email
            <input className="rounded-lg border border-forest-100 bg-forest-50 px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-forest-600" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="toi@email.com" />
          </label>}
          {(mode === "signin" || signupStep === 1) && <label className="grid gap-2 text-sm font-semibold text-forest-700">
            Mot de passe
            <input className="rounded-lg border border-forest-100 bg-forest-50 px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-forest-600" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 6 caractères" />
          </label>}
          {mode === "signup" && signupStep === 2 && (
            <>
              <label className="grid gap-2 text-sm font-semibold text-forest-700">Ta ville<LocationAutocomplete value={cityText} selectedLocation={selectedCity} onChange={(value) => { setCityText(value); setSelectedCity(null); }} onSelect={(location) => { setCityText(location.label); setSelectedCity(location); }} /></label>
              <ChipSelect label="Ta tranche d'âge" value={ageRange} options={["18-25", "25-35", "35-45", "45+"]} onChange={setAgeRange} />
              <ChipSelect label="Ton niveau" value={physicalLevel} options={["Débutant", "Facile", "Intermédiaire", "Sportif"]} onChange={setPhysicalLevel} />
              <ChipSelect label="Ton budget" value={budgetRange} options={["Moins de 100 €", "100 à 200 €", "200 à 350 €", "350 à 500 €", "Flexible"]} onChange={setBudgetRange} />
              <ChipSelect label="Ton style" value={adventureStyle} options={["Calme & déconnexion", "Sport & dépassement", "Découverte locale", "Fun & aventure douce"]} onChange={setAdventureStyle} />
            </>
          )}
        </div>

        {feedback && <p className="mt-4 rounded-lg bg-skysoft px-4 py-3 text-sm font-semibold text-forest-900">{feedback}</p>}

        <button className="btn-primary mt-5 w-full disabled:cursor-wait disabled:opacity-70" disabled={isSubmitting} onClick={submit}>
          {isSubmitting ? mode === "signup" ? "Création..." : "Connexion..." : mode === "signup" ? signupStep === 1 ? "Continuer" : "Créer mon profil" : "Me connecter"}
        </button>
        {mode === "signin" && <button className="mt-3 w-full text-sm font-bold text-forest-700" disabled={isSubmitting} onClick={sendPasswordReset}>Mot de passe oublié ?</button>}
        {mode === "signup" && signupStep === 2 && <button className="mt-3 w-full text-sm font-bold text-forest-600" onClick={() => setSignupStep(1)}>Retour aux identifiants</button>}
      </div>
    </div>
  );
}

function PasswordRecoveryDialog({ accessToken, onClose }: { accessToken: string; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (password.length < 8 || password !== confirmation) {
      setFeedback("Utilise au moins 8 caractères et saisis deux fois le même mot de passe.");
      return;
    }
    setSaving(true);
    try {
      await updatePassword(password, accessToken);
      setFeedback("Mot de passe modifié. Tu peux continuer dans l'application.");
      window.setTimeout(onClose, 900);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Mot de passe impossible à modifier.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-forest-900/65 p-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="recovery-title">
        <p className="pill">Sécurité du compte</p>
        <h2 className="mt-3 text-2xl font-semibold" id="recovery-title">Choisis un nouveau mot de passe</h2>
        <div className="mt-5 grid gap-3">
          <input className="rounded-lg border border-forest-100 bg-forest-50 p-3" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nouveau mot de passe" autoFocus />
          <input className="rounded-lg border border-forest-100 bg-forest-50 p-3" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Confirmer le mot de passe" />
        </div>
        {feedback && <p className="mt-4 rounded-lg bg-forest-50 p-3 text-sm font-semibold">{feedback}</p>}
        <div className="mt-5 flex gap-3"><button className="btn-secondary flex-1" onClick={onClose}>Plus tard</button><button className="btn-primary flex-1" disabled={saving} onClick={save}>{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
      </section>
    </div>
  );
}

function ReportDialog({ target, onCancel, onSubmit }: { target: ReportTarget; onCancel: () => void; onSubmit: (reason: ReportReason, details: string) => void | Promise<void> }) {
  const [reason, setReason] = useState<ReportReason>("harassment");
  const [details, setDetails] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const reasons: Array<[ReportReason, string]> = [
    ["harassment", "Harcèlement"], ["spam", "Spam"], ["fraud", "Fraude ou faux profil"],
    ["unsafe", "Comportement dangereux"], ["hate", "Haine ou discrimination"],
    ["inappropriate", "Contenu inapproprié"], ["other", "Autre"]
  ];

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-forest-900/65 p-4 backdrop-blur-sm">
      <section className="w-full max-w-lg rounded-[1.5rem] bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <div className="flex items-start justify-between gap-4"><div><p className="pill">Signalement confidentiel</p><h2 className="mt-3 text-2xl font-semibold" id="report-title">Signaler {target.label}</h2></div><button className="rounded-full bg-forest-50 p-2" onClick={onCancel} aria-label="Fermer"><X size={18} /></button></div>
        <label className="mt-5 grid gap-2 text-sm font-bold">Motif<select className="rounded-lg border border-forest-100 bg-forest-50 p-3 font-normal" value={reason} onChange={(event) => setReason(event.target.value as ReportReason)}>{reasons.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label className="mt-4 grid gap-2 text-sm font-bold">Précisions facultatives<textarea className="min-h-28 rounded-lg border border-forest-100 bg-forest-50 p-3 font-normal" maxLength={2000} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Décris les faits sans partager de données sensibles." /></label>
        <p className="mt-3 text-xs leading-5 text-forest-600">Le signalement n'est pas visible par la personne concernée.</p>
        {feedback && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{feedback}</p>}
        <div className="mt-5 flex gap-3"><button className="btn-secondary flex-1" onClick={onCancel}>Annuler</button><button className="btn-primary flex-1" disabled={submitting} onClick={async () => { setSubmitting(true); setFeedback(""); try { await onSubmit(reason, details); } catch (error) { setFeedback(error instanceof Error ? error.message : "Signalement impossible."); setSubmitting(false); } }}>{submitting ? "Envoi..." : "Envoyer"}</button></div>
      </section>
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

function NotificationsPage({
  notifications,
  trips,
  profiles,
  currentUserId,
  joinRequests,
  tripInvitations,
  tribeRequests,
  onAcceptJoinRequest,
  onRejectJoinRequest,
  onUpdateTripInvitation,
  onUpdateTribeConnection,
  onViewProfile,
  onOpenTripConversation,
  onMarkRead,
  onDeleteNotification
}: {
  notifications: NotificationRecord[];
  trips: Trip[];
  profiles: UserProfileRecord[];
  currentUserId?: string;
  joinRequests: UserTripActions["joinRequests"];
  tripInvitations: TripInvitation[];
  tribeRequests: TribeRequestBundle;
  onAcceptJoinRequest: (requestId: string) => void | Promise<void>;
  onRejectJoinRequest: (requestId: string) => void | Promise<void>;
  onUpdateTripInvitation: (invitationId: string, action: "accept" | "reject") => void | Promise<void>;
  onUpdateTribeConnection: (connectionId: string, action: "accept" | "reject" | "cancel") => void | Promise<void>;
  onViewProfile: (profileId: string) => void;
  onOpenTripConversation: (trip: Trip) => void | Promise<void>;
  onMarkRead: (notificationId: string) => void | Promise<void>;
  onDeleteNotification: (notificationId: string) => void | Promise<void>;
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
    <section className="container-page py-8 sm:py-10">
      <div className="mx-auto w-full max-w-3xl rounded-[1.5rem] bg-white p-4 shadow-soft ring-1 ring-forest-100 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="pill">Notifications</p>
            <h2 className="mt-2 text-2xl font-semibold">Ce qui demande ton attention</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-forest-50 px-3 py-1 text-xs font-bold text-forest-700">{notifications.length + pendingJoinRequestsWithoutNotification.length}</span>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
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
            const tribeRequest = notification.type === "friend_request_received"
              ? tribeRequests.received.find((item) => item.requester_id === notification.related_user_id)
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
                {notification.type === "friend_request_received" && tribeRequest && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button className="btn-primary py-2" onClick={() => onUpdateTribeConnection(tribeRequest.id, "accept")}>Accepter</button>
                    <button className="btn-secondary py-2" onClick={() => onUpdateTribeConnection(tribeRequest.id, "reject")}>Refuser</button>
                  </div>
                )}
                {notification.type === "trip_message_received" && trip && (
                  <button className="btn-primary mt-3 w-full py-2" onClick={() => { onMarkRead(notification.id); onOpenTripConversation(trip); }}>Ouvrir la conversation</button>
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
  catalogActivities,
  go,
  openTrip,
  onTripAction,
  userTripActions,
  favoriteTripIds,
  onToggleFavorite
}: {
  trips: Trip[];
  catalogActivities: MockLocalActivity[];
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
        <TripGrid trips={trips.slice(0, 3)} catalogActivities={catalogActivities} openTrip={openTrip} onTripAction={onTripAction} userTripActions={userTripActions} favoriteTripIds={favoriteTripIds} onToggleFavorite={onToggleFavorite} />
      </section>

      <section className="container-page pb-16">
        <div className="card grid gap-8 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-10">
          <div>
            <p className="pill">Confiance</p>
            <h2 className="section-title mt-4">Petit groupe, profils vérifiés, rythme adapté.</h2>
            <p className="mt-4 leading-8 text-forest-700">Tribu Nature n'est pas une app de dating ni une agence qui vend un package fermé. C'est un espace pour composer une aventure avec des personnes compatibles et des prestataires locaux fiables.</p>
          </div>
          <div className="grid gap-3">
            {["Profils publics", "Signalement et blocage", "Groupes limités", "Activités encadrées", "Règles de comportement", "Demandes contrôlées"].map((item) => (
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

function DateRangeCalendar({
  startDate,
  endDate,
  onChange,
  invalid = false
}: {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
  invalid?: boolean;
}) {
  const today = getLocalIsoDate(new Date());
  const initialDate = startDate ? new Date(`${startDate}T12:00:00`) : new Date();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

  useEffect(() => {
    if (!startDate) return;
    const selectedDate = new Date(`${startDate}T12:00:00`);
    setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [startDate]);

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return { day, date, disabled: date < today };
    })
  ];
  const currentMonth = new Date();
  const canGoPrevious = year > currentMonth.getFullYear() || (year === currentMonth.getFullYear() && month > currentMonth.getMonth());
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(visibleMonth);

  const selectDate = (value: string) => {
    if (!startDate || endDate || value < startDate) {
      onChange(value, "");
      return;
    }
    onChange(startDate, value);
  };

  return (
    <div className={`rounded-lg border bg-white p-3 ${invalid ? "border-red-400 ring-2 ring-red-200" : "border-forest-100"}`}>
      <div className="flex items-center justify-between gap-3 px-1 pb-3">
        <button aria-label="Mois précédent" className="grid h-10 w-10 place-items-center rounded-full text-forest-800 transition hover:bg-forest-50 disabled:opacity-25" disabled={!canGoPrevious} onClick={() => setVisibleMonth(new Date(year, month - 1, 1))} type="button">
          <ChevronLeft size={19} />
        </button>
        <strong className="capitalize text-forest-900">{monthLabel}</strong>
        <button aria-label="Mois suivant" className="grid h-10 w-10 place-items-center rounded-full text-forest-800 transition hover:bg-forest-50" onClick={() => setVisibleMonth(new Date(year, month + 1, 1))} type="button">
          <ChevronRight size={19} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-forest-500">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((weekday) => <span className="py-1.5" key={weekday}>{weekday}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          if (!day) return <span className="aspect-square" key={`empty-${index}`} />;
          const selectedStart = day.date === startDate;
          const selectedEnd = day.date === endDate;
          const inRange = Boolean(startDate && endDate && day.date > startDate && day.date < endDate);
          return (
            <button
              className={[
                "aspect-square rounded-lg text-sm font-semibold transition",
                day.disabled ? "cursor-not-allowed text-forest-200" : "hover:bg-forest-100",
                inRange ? "bg-forest-100 text-forest-900" : "",
                selectedStart || selectedEnd ? "bg-forest-800 text-white hover:bg-forest-800" : "",
                !day.disabled && !inRange && !selectedStart && !selectedEnd ? "text-forest-900" : ""
              ].join(" ")}
              disabled={day.disabled}
              key={day.date}
              onClick={() => selectDate(day.date)}
              type="button"
            >
              {day.day}
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-forest-100 pt-3 text-sm">
        <MiniFact label="Départ" value={startDate ? formatFrenchDate(startDate) : "À choisir"} />
        <MiniFact label="Retour" value={endDate ? formatFrenchDate(endDate) : "À choisir"} />
      </div>
    </div>
  );
}

function getLocalIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

  const setDateRange = (nextStartDate: string, nextEndDate: string) => {
    setAnswers((prev) => {
      const list = Array.isArray(prev.availability) ? prev.availability : [];
      const base = list.filter((item) => !isIsoDate(item));
      return { ...prev, availability: [nextStartDate, nextEndDate, ...base].filter(Boolean) };
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
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-forest-700"><CalendarDays size={18} />Sélectionne le départ puis le retour</div>
        <DateRangeCalendar startDate={startDate ?? ""} endDate={endDate ?? ""} onChange={setDateRange} />

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
  return safetyFilters.length ? safetyFilters : ["Profils publics"];
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
  onPublish: (trip: Trip, imageFiles: File[]) => Promise<void> | void;
}) {
  const [title, setTitle] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
  const [departureText, setDepartureText] = useState("");
  const [selectedDeparture, setSelectedDeparture] = useState<LocationSuggestion | null>(null);
  const [duration, setDuration] = useState("Week-end");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("200 à 350 €");
  const [level, setLevel] = useState("Facile");
  const [groupSize, setGroupSize] = useState("Petit groupe : 3 à 5 personnes");
  const [groupType, setGroupType] = useState("Groupe mixte");
  const [brief, setBrief] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [ambiences, setAmbiences] = useState<string[]>([]);
  const [activitiesWanted, setActivitiesWanted] = useState<string[]>([]);
  const [groupPreferences, setGroupPreferences] = useState<string[]>([]);
  const [customActivity, setCustomActivity] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [invalidFields, setInvalidFields] = useState<string[]>([]);

  useEffect(() => {
    if (!initialTrip) return;

    setTitle(initialTrip.title);
    setDestinationText(initialTrip.destination);
    setSelectedLocation({ id: `catalog-${initialTrip.id}`, label: initialTrip.destination, name: initialTrip.destination, country: initialTrip.country ?? "", latitude: 0, longitude: 0, source: "curated" });
    setDepartureText(initialTrip.departure_city ?? "");
    setSelectedDeparture(initialTrip.departure_city ? { id: `departure-${initialTrip.id}`, label: initialTrip.departure_city, name: initialTrip.departure_city, country: "", latitude: initialTrip.departure_lat ?? 0, longitude: initialTrip.departure_lng ?? 0, source: "curated" } : null);
    setDuration(initialTrip.duration || "Week-end");
    setStartDate(initialTrip.start_date ?? "");
    setEndDate(initialTrip.end_date ?? "");
    setBudget(numbersToBudgetRange(initialTrip.budget_min, initialTrip.budget_max));
    setLevel(initialTrip.physical_level);
    setBrief(initialTrip.description || initialTrip.brief || "Je veux transformer cette idée de voyage en vraie Trip avec un groupe motivé.");
    setAmbiences(initialTrip.ambience_tags.length ? initialTrip.ambience_tags.slice(0, 4) : ["Découverte locale"]);
    setActivitiesWanted(initialTrip.activities.length ? initialTrip.activities : ["Activité locale", "Découverte nature"]);
    setShowPreview(true);
  }, [initialTrip, proposerName]);

  useEffect(() => () => imagePreviews.forEach((preview) => URL.revokeObjectURL(preview)), [imagePreviews]);

  const selectedDates = buildTripDates(startDate, endDate);

  const previewTrip = {
    ...buildCommunityTrip({
      proposerName,
      title,
      destinationText,
      duration,
      budget,
      level,
      ambiences,
      activitiesWanted,
      groupPreferences,
      groupSize,
      groupType,
      creatorName: proposerName,
      brief,
      coverUrl: imagePreviews[0] ?? initialTrip?.image_url ?? "",
      dateLabel: selectedDates.label,
      startDate: selectedDates.startDate,
      endDate: selectedDates.endDate,
      datePrecision: "exact",
      departureCity: departureText,
      departureLat: selectedDeparture?.latitude,
      departureLng: selectedDeparture?.longitude
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
  const publishTrip = async () => {
    if (isPublishing) return;
    setPublishError("");
    const missing = [
      ...(!title.trim() ? ["title"] : []),
      ...(!destinationText.trim() || !selectedLocation ? ["destination"] : []),
      ...(!departureText.trim() || !selectedDeparture ? ["departure"] : []),
      ...(!brief.trim() ? ["brief"] : []),
      ...(!selectedDates.startDate || !selectedDates.endDate ? ["dates"] : []),
      ...(endDate && endDate < startDate ? ["dates"] : [])
    ];
    setInvalidFields(missing);
    if (missing.length > 0) {
      setPublishError("Complète les champs obligatoires indiqués en rouge.");
      return;
    }
    setIsPublishing(true);

    try {
      await onPublish(previewTrip, imageFiles);
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
                <RequiredLabel label="Titre du Trip" invalid={invalidFields.includes("title")} />
                <input className={`rounded-lg border bg-forest-50 px-4 py-3 outline-none focus:ring-2 focus:ring-forest-600 ${invalidFields.includes("title") ? "border-red-500" : "border-forest-100"}`} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Donne un nom à ton aventure" />
              </label>
              <label className="grid gap-2">
                <RequiredLabel label="Ville de départ souhaitée" invalid={invalidFields.includes("departure")} />
                <div className={invalidFields.includes("departure") ? "rounded-xl ring-2 ring-red-400" : ""}><LocationAutocomplete
                  value={departureText}
                  selectedLocation={selectedDeparture}
                  onChange={(value) => {
                    setDepartureText(value);
                    setSelectedDeparture(null);
                  }}
                  onSelect={(location) => {
                    setDepartureText(location.label);
                    setSelectedDeparture(location);
                  }}
                /></div>
              </label>
              <label className="grid gap-2">
                <RequiredLabel label="Destination précise" invalid={invalidFields.includes("destination")} />
                <div className={invalidFields.includes("destination") ? "rounded-xl ring-2 ring-red-400" : ""}><LocationAutocomplete
                  value={destinationText}
                  selectedLocation={selectedLocation}
                  onChange={(value) => {
                    setDestinationText(value);
                    setSelectedLocation(null);
                  }}
                  onSelect={(location) => {
                    setDestinationText(location.label);
                    setSelectedLocation(location);
                  }}
                /></div>
              </label>
              <label className="grid gap-2">
                <RequiredLabel label="Décris l'esprit du Trip" invalid={invalidFields.includes("brief")} />
                <textarea className={`min-h-32 rounded-lg border bg-forest-50 px-4 py-3 outline-none focus:ring-2 focus:ring-forest-600 ${invalidFields.includes("brief") ? "border-red-500" : "border-forest-100"}`} value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Décris l'esprit du Trip" />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-forest-700">Photos du Trip</span>
                <label className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-forest-300 bg-forest-50 px-4 py-6 font-bold text-forest-800 transition hover:bg-forest-100">
                  <ImagePlus size={22} /> Importer plusieurs photos
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      event.target.value = "";
                      const error = validateImageFiles(files);
                      if (error) {
                        setPublishError(error);
                        return;
                      }
                      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
                      setImageFiles(files);
                      setImagePreviews(files.map((file) => URL.createObjectURL(file)));
                    }}
                  />
                </label>
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {imagePreviews.map((preview, index) => <img className="aspect-square w-full rounded-lg object-cover" src={preview} alt={`Photo ${index + 1}`} key={preview} />)}
                  </div>
                )}
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
              {["Profils avec identité claire", "Activité encadrée si nécessaire", "Niveau physique clairement indiqué", "Groupe calme et respectueux", "Pas d'alcool si souhaité", "Pauses personnelles respectées", "Repas halal souhaité", "Repas végétarien souhaité"].map((preference) => (
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
              <div className={`rounded-xl p-3 ${invalidFields.includes("dates") ? "bg-red-50 ring-2 ring-red-400" : "bg-forest-50"}`}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className={`text-sm font-semibold ${invalidFields.includes("dates") ? "text-red-700" : "text-forest-700"}`}>Dates du Trip</span>
                  <span className="text-xs font-bold text-red-600">Obligatoire</span>
                </div>
                <DateRangeCalendar
                  startDate={startDate}
                  endDate={endDate}
                  invalid={invalidFields.includes("dates")}
                  onChange={(nextStartDate, nextEndDate) => {
                    setStartDate(nextStartDate);
                    setEndDate(nextEndDate);
                    setInvalidFields((fields) => fields.filter((field) => field !== "dates"));
                  }}
                />
              </div>
              <ChipSelect label="Durée indicative" value={duration} options={["Week-end", "2-3 jours", "Une semaine", "10 jours"]} onChange={setDuration} />
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

function LocationAutocomplete({
  value,
  selectedLocation,
  onChange,
  onSelect
}: {
  value: string;
  selectedLocation: LocationSuggestion | null;
  onChange: (value: string) => void;
  onSelect: (location: LocationSuggestion) => void;
}) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (selectedLocation?.label === value || value.trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const nextSuggestions = await searchLocationSuggestions(value, controller.signal);
        setSuggestions(nextSuggestions);
        setIsOpen(true);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [selectedLocation, value]);

  return (
    <div className="relative">
      <div className={`flex items-center gap-3 rounded-lg border bg-forest-50 px-4 focus-within:ring-2 focus-within:ring-forest-600 ${selectedLocation ? "border-forest-500" : "border-forest-100"}`}>
        <MapPin className={selectedLocation ? "text-forest-800" : "text-forest-500"} size={19} />
        <input
          className="min-w-0 flex-1 bg-transparent py-3 outline-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 150)}
          placeholder="Ex : Toulouse, Interlaken, Bilbao..."
          autoComplete="off"
        />
        {isSearching && <span className="text-xs font-bold text-forest-500">Recherche...</span>}
      </div>
      {selectedLocation && (
        <p className="mt-2 flex items-center gap-2 text-xs font-bold text-forest-700">
          <BadgeCheck size={15} /> Lieu sélectionné : {selectedLocation.label}
        </p>
      )}
      {isOpen && !selectedLocation && value.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-[calc(100%+0.4rem)] z-30 overflow-hidden rounded-[1rem] border border-forest-100 bg-white shadow-xl">
          {suggestions.length > 0 ? suggestions.map((location) => (
            <button
              className="flex w-full items-start gap-3 border-b border-forest-50 px-4 py-3 text-left transition last:border-0 hover:bg-forest-50"
              key={location.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSelect(location);
                setIsOpen(false);
              }}
            >
              <MapPin className="mt-0.5 shrink-0 text-forest-700" size={18} />
              <span>
                <span className="block font-semibold text-forest-900">{location.name}</span>
                <span className="mt-0.5 block text-xs text-forest-600">{location.label}</span>
              </span>
            </button>
          )) : !isSearching ? (
            <p className="px-4 py-3 text-sm text-forest-600">Aucun lieu précis trouvé. Essaie avec le nom d'une ville proche.</p>
          ) : null}
          <p className="border-t border-forest-50 px-4 py-2 text-[10px] font-semibold text-forest-400">Géoplateforme · GeoNames via Open-Meteo</p>
        </div>
      )}
    </div>
  );
}

function RequiredLabel({ label, invalid }: { label: string; invalid: boolean }) {
  return (
    <span className={`text-sm font-semibold ${invalid ? "text-red-700" : "text-forest-700"}`}>
      {label} <span className="text-red-600">· champ obligatoire</span>
    </span>
  );
}

function buildTripDates(startDate: string, endDate: string) {
  if (!startDate || !endDate) return { label: "Dates à préciser", startDate, endDate };
  const format = (date: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00`));
  return { label: `Du ${format(startDate)} au ${format(endDate)}`, startDate, endDate };
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
  coverUrl,
  dateLabel,
  startDate,
  endDate,
  datePrecision,
  departureCity,
  departureLat,
  departureLng
}: {
  proposerName: string;
  title: string;
  destinationText: string;
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
  dateLabel: string;
  startDate: string;
  endDate: string;
  datePrecision: NonNullable<Trip["date_precision"]>;
  departureCity: string;
  departureLat?: number;
  departureLng?: number;
}): Trip {
  const [budgetMin, budgetMax] = budgetRangeToNumbers(budget);
  const destinationLabel = destinationText.trim() || "Destination à préciser";
  const inferredRegion = inferZoneFromDestination(destinationLabel);
  const displayName = creatorName.trim() || proposerName;
  const maxParticipants = maxParticipantsFromGroupSize(groupSize);
  const normalizedGroupPreferences = groupPreferences.map((preference) => normalizeUiText(preference));
  return {
    id: `community-${Date.now()}`,
    title: title.trim() || "Nouveau Trip communautaire",
    destination: destinationLabel,
    image_url: coverUrl.trim() || inferCommunityTripImage(destinationLabel, activitiesWanted, ambiences),
    dates: dateLabel,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    date_precision: datePrecision,
    duration,
    budget_min: budgetMin,
    budget_max: budgetMax,
    physical_level: level,
    ambience_tags: Array.from(new Set([...ambiences, groupType])).slice(0, 4),
    compatibility_score: 91,
    interested_count: 0,
    status: "Projet utilisateur",
    description: brief,
    activities: activitiesWanted.length ? activitiesWanted : ["Activité locale", "Découverte nature"],
    generation_reasons: [`Proposée par ${displayName}`, ...groupPreferences.slice(0, 2)],
    matched_member_ids: [],
    community: true,
    created_by: displayName,
    brief,
    card_type: "user_project",
    created_by_type: "user",
    planning_status: "planned",
    visibility: "public",
    moderation_status: "approved",
    creator_name: displayName,
    departure_city: departureCity,
    departure_lat: departureLat,
    departure_lng: departureLng,
    max_participants: maxParticipants,
    current_participants: 1,
    region: inferredRegion === "Peu m'importe" ? undefined : inferredRegion,
    activity_tags: activitiesWanted,
    group_tags: [groupType, groupSize, ...groupPreferences.filter((_, index) => ["groupe", "calme", "pause"].some((keyword) => normalizedGroupPreferences[index].includes(keyword)))],
    food_tags: groupPreferences.filter((_, index) => ["halal", "vegetarien", "alcool", "repas"].some((keyword) => normalizedGroupPreferences[index].includes(keyword))),
    safety_tags: groupPreferences.filter((_, index) => ["verifie", "encadre", "niveau"].some((keyword) => normalizedGroupPreferences[index].includes(keyword))),
    value_tags: groupPreferences.filter((_, index) => ["respect", "calme", "pause", "alcool"].some((keyword) => normalizedGroupPreferences[index].includes(keyword)))
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
  catalogActivities,
  isGenerating,
  openTrip,
  onTripAction,
  onCreateTrip,
  userTripActions,
  favoriteTripIds,
  onToggleFavorite,
  getCreatorProfile,
  onViewProfile,
  matchProfile
}: {
  trips: Trip[];
  catalogActivities: MockLocalActivity[];
  isGenerating: boolean;
  openTrip: (id: string) => void;
  onTripAction: (trip: Trip) => void | Promise<void>;
  onCreateTrip: () => void;
  userTripActions: UserTripActions | null;
  favoriteTripIds: string[];
  onToggleFavorite: (trip: Trip) => void | Promise<void>;
  getCreatorProfile: (profileId?: string | null) => UserProfileRecord | null;
  onViewProfile: (profileId: string) => void;
  matchProfile: UserProfile | null;
}) {
  const [activeSection, setActiveSection] = useState<"trips" | "explore">("trips");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [openFilter, setOpenFilter] = useState<ResultFilterKey | null>(null);
  const [destinationSearch, setDestinationSearch] = useState("");
  const [filterAnswers, setFilterAnswers] = useState<Record<string, string | string[]>>({
    availability: [],
    destinationZones: []
  });
  const userProjectTrips = useMemo(() => dashboardTrips.filter((trip) => getTripCardType(trip) === "user_project"), [dashboardTrips]);
  const catalogTrips = useMemo(() => dashboardTrips.filter((trip) => getTripCardType(trip) === "catalog"), [dashboardTrips]);
  const sectionTrips = activeSection === "trips" ? userProjectTrips : catalogTrips;
  const activeFilterTags = useMemo(() => buildActiveResultFilterTags(activeFilters, filterAnswers), [activeFilters, filterAnswers]);
  const filteredTrips = useMemo(() => {
    const byFilters = filterTripsByResultFilters(sectionTrips, activeFilterTags);
    const query = normalizeUiText(destinationSearch.trim());
    if (!query) return byFilters;
    return byFilters.filter((trip) => normalizeUiText(`${trip.destination} ${trip.region ?? ""} ${trip.country ?? ""} ${trip.title}`).includes(query));
  }, [activeFilterTags, destinationSearch, sectionTrips]);
  const toggleResultFilter = (filter: string) => {
    setActiveFilters((prev) => (prev.includes(filter) ? prev.filter((item) => item !== filter) : [...prev, filter]));
  };
  const removeResultFilter = (filter: string) => {
    setActiveFilters((prev) => prev.filter((item) => item !== filter));
    setFilterAnswers((prev) => ({
      ...prev,
      availability: Array.isArray(prev.availability) ? prev.availability.filter((item) => item !== filter) : prev.availability,
      destinationZones: Array.isArray(prev.destinationZones) ? prev.destinationZones.filter((item) => item !== filter) : prev.destinationZones,
      departureCity: filter.startsWith("Départ ") ? "" : prev.departureCity
    }));
  };
  const clearResultFilters = () => {
    setActiveFilters([]);
    setFilterAnswers((prev) => ({ ...prev, availability: [], destinationZones: [], departureCity: "" }));
  };
  const switchSection = (section: "trips" | "explore") => {
    setActiveSection(section);
    setOpenFilter(null);
  };

  return (
    <section className="container-page py-6 sm:py-8">
      <div className="grid gap-3 rounded-[1.5rem] bg-white p-3 shadow-sm sm:grid-cols-2">
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
          <span className="text-sm font-bold opacity-80">Section Explorer</span>
          <span className="mt-1 block text-2xl font-semibold">Explorer</span>
          <span className="mt-2 block text-sm leading-6 opacity-80">{catalogTrips.length} idée{catalogTrips.length > 1 ? "s" : ""} de voyage à co-construire</span>
        </button>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-forest-700 shadow-sm">{filteredTrips.length} proposition{filteredTrips.length > 1 ? "s" : ""}</span>
        <button className="btn-primary py-2" onClick={onCreateTrip}>Créer un Trip</button>
      </div>
      <label className="mt-4 flex items-center gap-3 rounded-[1.1rem] bg-white px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-forest-700">
        <Search className="shrink-0 text-forest-600" size={20} />
        <input className="min-w-0 flex-1 bg-transparent outline-none" value={destinationSearch} onChange={(event) => setDestinationSearch(event.target.value)} placeholder="Rechercher une destination, une région ou un Trip" />
        {destinationSearch && <button className="rounded-full p-1 text-forest-500 hover:bg-forest-50" onClick={() => setDestinationSearch("")} aria-label="Effacer la recherche"><X size={17} /></button>}
      </label>
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
            <p className="mx-auto mt-3 max-w-xl text-forest-700">Tu peux créer le premier Trip ou passer dans Explorer pour partir d'une idée de voyage.</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button className="btn-primary" onClick={onCreateTrip}>Créer un Trip</button>
              <button className="btn-secondary" onClick={() => switchSection("explore")}>Voir Explorer</button>
            </div>
          </div>
        ) : (
          <TripGrid trips={filteredTrips} catalogActivities={catalogActivities} openTrip={openTrip} onTripAction={onTripAction} userTripActions={userTripActions} favoriteTripIds={favoriteTripIds} onToggleFavorite={onToggleFavorite} getCreatorProfile={getCreatorProfile} onViewProfile={onViewProfile} matchProfile={matchProfile} />
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
  const departureCity = typeof filterAnswers.departureCity === "string" ? filterAnswers.departureCity : "";
  const [departureText, setDepartureText] = useState(departureCity);
  const [selectedDeparture, setSelectedDeparture] = useState<LocationSuggestion | null>(null);

  useEffect(() => {
    if (!selectedDeparture && departureCity !== departureText) setDepartureText(departureCity);
  }, [departureCity, departureText, selectedDeparture]);

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

  if (openFilter === "localisation") {
    return (
      <div className="mt-4 border-t border-forest-100 pt-4">
        <p className="mb-3 text-sm font-bold text-forest-700">Ville de départ souhaitée</p>
        <LocationAutocomplete
          value={departureText}
          selectedLocation={selectedDeparture}
          onChange={(value) => {
            setDepartureText(value);
            setSelectedDeparture(null);
            setFilterAnswers((previous) => ({ ...previous, departureCity: "" }));
          }}
          onSelect={(location) => {
            setDepartureText(location.label);
            setSelectedDeparture(location);
            setFilterAnswers((previous) => ({
              ...previous,
              departureCity: location.label,
              departureLat: String(location.latitude),
              departureLng: String(location.longitude)
            }));
          }}
        />
        <p className="mt-3 text-xs font-semibold text-forest-500">Les résultats affichent les Trips prévus au départ de cette ville.</p>
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
  const departureCity = typeof answers.departureCity === "string" ? answers.departureCity : "";
  const tags = [
    ...filters,
    ...availability.filter((item) => item !== "Peu m'importe"),
    ...destinationZones.filter((item) => item !== "Peu m'importe"),
    ...(departureCity ? [`Départ ${departureCity}`] : [])
  ];
  return Array.from(new Set(tags));
}

function filterTripsByResultFilters(tripsToFilter: Trip[], filters: string[]) {
  if (filters.length === 0) return tripsToFilter;
  const filtersByGroup = filters.reduce<Record<string, string[]>>((groups, filter) => {
    const group = getResultFilterGroup(filter);
    groups[group] = [...(groups[group] ?? []), filter];
    return groups;
  }, {});

  return tripsToFilter.filter((trip) => (
    Object.values(filtersByGroup).every((groupFilters) => groupFilters.some((filter) => tripMatchesResultFilter(trip, filter)))
  ));
}

function getResultFilterGroup(filter: string) {
  if (isIsoDate(filter) || ["Journée", "Week-end", "2-3 jours", "Semaine"].includes(filter)) return "dates";
  if (normalizeUiText(filter).startsWith("depart ")) return "localisation";

  const destinationOptions = new Set([
    ...Object.values(selectableCountries),
    ...franceRegions.map((region) => region.name),
    ...Object.values(countryRegionCatalog).flatMap((country) => country.regions.map((region) => region.name))
  ]);
  if (destinationOptions.has(filter)) return "destination";
  if (resultFilterOptions.groupe.includes(filter)) {
    if (/^(18-25|25-35|35-45|45\+)$/.test(filter)) return "groupe-age";
    if (filter.includes("personnes")) return "groupe-taille";
    return "groupe-type";
  }

  for (const [key, options] of Object.entries(resultFilterOptions)) {
    if (key !== "plus" && options.includes(filter)) return key;
  }
  for (const group of moreFilterGroups) {
    if (group.options.includes(filter)) return `plus-${group.title}`;
  }
  return `other-${filter}`;
}

function tripMatchesResultFilter(trip: Trip, filter: string) {
  const normalizedFilter = normalizeUiText(filter);
  const searchable = normalizeUiText([
    trip.title,
    trip.destination,
    trip.region ?? "",
    trip.country ?? "",
    trip.departure_city ?? "",
    trip.dates,
    trip.duration,
    trip.physical_level,
    trip.description,
    trip.brief ?? "",
    trip.created_by ?? "",
    trip.status,
    ...trip.ambience_tags,
    ...trip.activities,
    ...(trip.activity_tags ?? []),
    ...(trip.group_tags ?? []),
    ...(trip.accommodation_tags ?? []),
    ...(trip.food_tags ?? []),
    ...(trip.safety_tags ?? []),
    ...(trip.value_tags ?? [])
  ].join(" "));
  if (isIsoDate(filter)) return getTripCardType(trip) === "catalog" || trip.dates.includes(filter);
  if (normalizedFilter.startsWith("depart ")) {
    const departureQuery = normalizedFilter.replace("depart ", "").split(",")[0].trim();
    return normalizeUiText(trip.departure_city ?? "").includes(departureQuery);
  }
  if (normalizedFilter === "tous") return true;
  if (normalizedFilter === "idees de voyage") return getTripCardType(trip) === "catalog";
  if (normalizedFilter === "projets utilisateurs") return getTripCardType(trip) === "user_project";
  if (normalizedFilter === "moins de 100 €") return trip.budget_min < 100;
  if (normalizedFilter === "100 a 200 €") return trip.budget_min <= 200 && trip.budget_max >= 100;
  if (normalizedFilter === "200 a 350 €") return trip.budget_min <= 350 && trip.budget_max >= 200;
  if (normalizedFilter === "350 a 500 €") return trip.budget_min <= 500 && trip.budget_max >= 350;
  if (normalizedFilter === "500 € et plus") return trip.budget_max >= 500;
  if (normalizedFilter.startsWith("budget max")) {
    const match = normalizedFilter.match(/(\d+)/);
    return match ? trip.budget_max <= Number(match[1]) : true;
  }
  if (normalizedFilter === "journee") return searchable.includes("journee") || searchable.includes("samedi");
  if (normalizedFilter === "week-end") return searchable.includes("week-end") || searchable.includes("weekend") || searchable.includes("vendredi");
  if (normalizedFilter === "2-3 jours") return searchable.includes("2 jours") || searchable.includes("3 jours") || searchable.includes("2-3 jours");
  if (normalizedFilter === "semaine") return searchable.includes("semaine");
  if (normalizedFilter === "petit groupe : 3 a 5 personnes") return (trip.max_participants ?? 6) <= 5;
  if (normalizedFilter === "groupe moyen : 6 a 8 personnes") return (trip.max_participants ?? 6) >= 6 && (trip.max_participants ?? 6) <= 8;
  if (normalizedFilter === "grand groupe : 9 personnes et plus") return (trip.max_participants ?? 6) >= 9;
  if (normalizedFilter === "ambiance calme") return searchable.includes("calme") || searchable.includes("deconnexion");
  if (normalizedFilter === "calme & deconnexion") return searchable.includes("calme") || searchable.includes("deconnexion");
  if (normalizedFilter === "ambiance sportive") return searchable.includes("sport") || searchable.includes("depassement");
  if (normalizedFilter === "sport & depassement") return searchable.includes("sport") || searchable.includes("depassement");
  if (normalizedFilter === "fun & aventure douce") return searchable.includes("fun") || searchable.includes("aventure douce");
  if (normalizedFilter === "premium/confort") return searchable.includes("premium") || searchable.includes("confort");
  if (normalizedFilter === "premium & confort") return searchable.includes("premium") || searchable.includes("confort");
  if (normalizedFilter === "spirituel / introspectif") return searchable.includes("spirituel") || searchable.includes("introspectif");
  if (normalizedFilter === "debutant") return searchable.includes("facile") || searchable.includes("debutant") || searchable.includes("tres facile");
  if (normalizedFilter === "tres encadre") return searchable.includes("encadre") || searchable.includes("professionnel");
  if (normalizedFilter === "autonome") return searchable.includes("autonome") || searchable.includes("libre");
  if (normalizedFilter === "parc naturel") return searchable.includes("parc") || searchable.includes("vercors");
  if (normalizedFilter === "village / patrimoine local") return searchable.includes("village") || searchable.includes("patrimoine") || searchable.includes("local");
  if (normalizedFilter === "destination depaysante") return searchable.includes("depays") || searchable.includes("etranger");
  if (normalizedFilter === "dates flexibles") return getTripCardType(trip) === "catalog" || searchable.includes("flexible");
  if (normalizedFilter === "budget flexible") return trip.budget_min === 0 || searchable.includes("budget flexible") || getTripCardType(trip) === "catalog";
  if (normalizedFilter === "depart depuis ma ville") return Boolean(trip.departure_city);
  if (normalizedFilter === "organisation collective") return getTripCardType(trip) === "catalog" || searchable.includes("collective");
  if (normalizedFilter === "groupe mixte accepte") return searchable.includes("groupe mixte");
  if (normalizedFilter === "groupe non mixte souhaite") return searchable.includes("women-only") || searchable.includes("homme uniquement") || searchable.includes("non mixte");
  if (normalizedFilter === "activites a faible risque") return searchable.includes("faible") || searchable.includes("facile");
  if (normalizedFilter === "activites encadrees par un professionnel") return searchable.includes("encadre") || searchable.includes("professionnel");
  if (normalizedFilter === "trip deja planifie") return ["planned", "confirmed"].includes(trip.planning_status ?? "");

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
  catalogActivities,
  openTrip,
  onTripAction,
  userTripActions,
  favoriteTripIds,
  onToggleFavorite,
  getCreatorProfile,
  onViewProfile,
  matchProfile = null
}: {
  trips: Trip[];
  catalogActivities: MockLocalActivity[];
  openTrip: (id: string) => void;
  onTripAction: (trip: Trip) => void | Promise<void>;
  userTripActions: UserTripActions | null;
  favoriteTripIds: string[];
  onToggleFavorite: (trip: Trip) => void | Promise<void>;
  getCreatorProfile?: (profileId?: string | null) => UserProfileRecord | null;
  onViewProfile?: (profileId: string) => void;
  matchProfile?: UserProfile | null;
}) {
  const matchByTripId = useMemo(
    () => new Map(tripList.map((trip) => [trip.id, calculateTripMatch(matchProfile, trip)])),
    [matchProfile, tripList]
  );
  const rankedTrips = useMemo(
    () => matchProfile
      ? [...tripList].sort((left, right) => (matchByTripId.get(right.id)?.score ?? 0) - (matchByTripId.get(left.id)?.score ?? 0))
      : tripList,
    [matchByTripId, matchProfile, tripList]
  );

  if (rankedTrips.length === 0) {
    return (
      <div className="mt-8 rounded-[1.5rem] bg-white p-8 text-center shadow-soft">
        <h2 className="text-2xl font-semibold">Aucun Trip ne correspond exactement à ces filtres.</h2>
        <p className="mx-auto mt-3 max-w-xl text-forest-700">Élargis une préférence et on te proposera plus d'options.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {rankedTrips.map((trip) => {
        const actionState = getTripActionState(trip, userTripActions);
        const isFavorite = favoriteTripIds.includes(trip.id);
        const match = matchByTripId.get(trip.id) ?? calculateTripMatch(matchProfile, trip);
        const isUserProject = getTripCardType(trip) === "user_project";
        const coverActivity = isUserProject ? null : getRepresentativeTripActivity(trip, catalogActivities);
        const creatorProfile = isUserProject ? getCreatorProfile?.(trip.creator_id) : null;
        const creatorUser = isUserProject
          ? profileRecordToUserProfile(creatorProfile ?? {
              ...fallbackProfileRecord(trip.creator_id ?? `creator-${trip.id}`),
              display_name: trip.creator_name ?? trip.created_by ?? "Membre Tribu"
            })
          : null;
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
            <TripCardCover trip={trip} activity={coverActivity} />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-900/90 via-forest-900/25 to-transparent" />
            <span
              className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-2 text-xs font-bold text-forest-900 backdrop-blur"
              title={match.reasons.join(" · ")}
            >
              {matchProfile
                ? match.confidence === "élevée" ? `${match.score}% match avec toi` : `Match estimé : ${match.score}%`
                : `Score estimé : ${match.score}%`}
            </span>
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
            {creatorUser ? (
              <button
                className="mb-4 flex w-full items-center gap-3 rounded-xl bg-forest-50 p-3 text-left transition hover:bg-forest-100 disabled:cursor-default"
                disabled={!trip.creator_id || !onViewProfile}
                onClick={() => trip.creator_id && onViewProfile?.(trip.creator_id)}
                aria-label={`Voir le profil de ${creatorUser.name}`}
              >
                <img className="h-11 w-11 shrink-0 rounded-full object-cover" src={creatorUser.photo_url} alt={creatorUser.name} />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-forest-600">Proposé par</span>
                  <span className="block truncate font-bold text-forest-900">{creatorUser.name}</span>
                </span>
                {trip.creator_id && onViewProfile && <span className="text-xs font-bold text-forest-700">Voir le profil</span>}
              </button>
            ) : (
              <p className="mb-3 text-sm font-semibold text-forest-700">{getTripContextText(trip)}</p>
            )}
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-forest-700">
                {trip.current_participants ?? 0} participant{(trip.current_participants ?? 0) > 1 ? "s" : ""} réel{(trip.current_participants ?? 0) > 1 ? "s" : ""}
              </span>
              <span className="rounded-full bg-forest-50 px-3 py-1.5 text-xs font-bold text-forest-700">{getPlanningStatusLabel(trip.planning_status ?? (isUserProject ? "planned" : "idea"))}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold text-forest-700">
              <span>{getTripDurationLabel(trip)}</span>
              <span className="text-forest-300">•</span>
              <span>{creatorUser?.verified ? "Créateur vérifié" : "Profil public"}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {trip.ambience_tags.slice(0, 2).map((tag) => <span className="pill text-xs" key={tag}>{tag}</span>)}
            </div>
            {matchProfile && match.confidence !== "élevée" && match.missingCriteria.length > 0 && (
              <p className="mt-3 text-xs font-semibold text-forest-600">Complète ton profil pour affiner ce match.</p>
            )}
            <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
              <button className="btn-primary w-full disabled:cursor-default disabled:bg-forest-200 disabled:text-forest-700" disabled={actionState === "pending"} onClick={() => onTripAction(trip)}>{getTripActionLabel(trip, actionState)}</button>
              <button className="btn-secondary w-full py-3 sm:w-auto" onClick={() => openTrip(trip.id)}>Détails</button>
            </div>
          </div>
        </article>
        );
      })}
    </div>
  );
}

type TripCoverActivity = Pick<MockLocalActivity, "name" | "category">;

function TripCardCover({ trip, activity }: { trip: Trip; activity: TripCoverActivity | null }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [photo, setPhoto] = useState<PexelsActivityPhoto | null>(null);

  useEffect(() => {
    if (!activity || getTripCardType(trip) !== "catalog") return;
    const imageElement = imageRef.current;
    if (!imageElement) return;
    const controller = new AbortController();
    const loadCover = () => {
      void searchPexelsActivityPhotos(buildPexelsActivityQuery(activity, trip.destination), controller.signal, 1)
        .then(([result]) => {
          if (!controller.signal.aborted && result) setPhoto(result);
        })
        .catch(() => {
          // La photo catalogue d'origine reste disponible si Pexels ne répond pas.
        });
    };
    if (!("IntersectionObserver" in window)) {
      loadCover();
      return () => controller.abort();
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        loadCover();
      }
    }, { rootMargin: "320px 0px" });
    observer.observe(imageElement);
    return () => {
      observer.disconnect();
      controller.abort();
    };
  }, [activity?.category, activity?.name, trip.destination, trip.id]);

  return (
    <>
      <img
        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        src={photo?.src ?? trip.image_url}
        alt={photo?.alt || `${activity?.name ?? trip.title} à ${trip.destination}`}
        ref={imageRef}
      />
      {photo && (
        <span className="absolute left-4 top-[4.25rem] z-10 max-w-[58%] truncate rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur" title={`Photo de ${photo.photographer} sur Pexels`}>
          Pexels · {photo.photographer}
        </span>
      )}
    </>
  );
}

function getRepresentativeTripActivity(trip: Trip, catalogActivities: MockLocalActivity[]): TripCoverActivity | null {
  const generatedActivities = (trip.generated_activity_ids ?? [])
    .map((activityId) => catalogActivities.find((activity) => activity.id === activityId))
    .filter((activity): activity is MockLocalActivity => Boolean(activity));
  const candidates: TripCoverActivity[] = generatedActivities.length > 0
    ? generatedActivities
    : trip.activities.map((name) => ({ name, category: "Expérience" }));
  if (!candidates.length) return null;
  return [...candidates].sort((left, right) => getActivityVisualScore(right) - getActivityVisualScore(left))[0];
}

function getActivityVisualScore(activity: TripCoverActivity) {
  const searchable = normalizeUiText(`${activity.name} ${activity.category}`);
  if (/parapente|montgolfiere|panorama|belvedere|point de vue/.test(searchable)) return 100;
  if (/hospice de france|rando|marche|sentier|trek|refuge|lac|cascade/.test(searchable)) return 95;
  if (/rafting|canoe|kayak|riviere|eau vive|paddle|surf/.test(searchable)) return 90;
  if (/therm|spa|bien-etre|balneo|bains chaud/.test(searchable)) return 85;
  if (/cheval|equestre|ferme|producteur/.test(searchable)) return 75;
  if (/village|culture|patrimoine/.test(searchable)) return 70;
  return 60;
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
  match,
  catalogActivities,
  validatedMembers,
  joinTrip,
  userTripActions,
  isFavorite,
  onToggleFavorite,
  onShareTrip,
  creatorProfile,
  onViewProfile,
  currentUserId,
  acceptedTribeMemberIds,
  onAddFriend,
  onLeaveTrip,
  onDeleteTrip,
  onReportTrip
}: {
  trip: Trip;
  match: TripMatchResult;
  catalogActivities: MockLocalActivity[];
  validatedMembers: UserProfile[];
  joinTrip: (trip: Trip) => void | Promise<void>;
  userTripActions: UserTripActions | null;
  isFavorite: boolean;
  onToggleFavorite: (trip: Trip) => void | Promise<void>;
  onShareTrip: (trip: Trip) => void;
  creatorProfile: UserProfileRecord | null;
  onViewProfile: (profileId: string) => void;
  currentUserId?: string;
  acceptedTribeMemberIds: Set<string>;
  onAddFriend: (member: UserProfile) => void | Promise<void>;
  onLeaveTrip: (trip: Trip) => void | Promise<void>;
  onDeleteTrip: (trip: Trip) => void | Promise<void>;
  onReportTrip: (trip: Trip) => void;
}) {
  const tripActivities = getTripActivities(trip, catalogActivities);
  const actionState = getTripActionState(trip, userTripActions);
  const [destructiveAction, setDestructiveAction] = useState<"leave" | "delete" | null>(null);
  const canManageMembership = actionState === "participant" || actionState === "accepted" || actionState === "interested";
  const isCreator = Boolean(currentUserId && trip.creator_id === currentUserId);

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
              <button className="btn-primary bg-white text-forest-900 hover:bg-forest-50 disabled:cursor-default disabled:bg-white/75 disabled:text-forest-500" disabled={actionState === "pending"} onClick={() => joinTrip(trip)}>
                {getTripActionLabel(trip, actionState)}
              </button>
              <button className="rounded-full bg-white/18 px-5 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/25" onClick={() => onToggleFavorite(trip)}>
                {isFavorite ? "Sauvegardée" : "Sauvegarder"}
              </button>
              <button className="inline-flex items-center gap-2 rounded-full bg-white/18 px-5 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/25" onClick={() => onShareTrip(trip)}>
                <Share2 size={18} />
                Partager
              </button>
              <button className="inline-flex items-center gap-2 rounded-full bg-white/18 px-5 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/25" onClick={() => onReportTrip(trip)}>
                <Flag size={17} />
                Signaler
              </button>
            </div>
          </div>
        </div>
      </section>

      {(trip.image_urls?.length ?? 0) > 1 && (
        <section className="container-page grid grid-cols-2 gap-3 pt-8 sm:grid-cols-4">
          {trip.image_urls?.slice(1, 5).map((image, index) => <img className="aspect-[4/3] w-full rounded-xl object-cover" src={image} alt={`${trip.title}, photo ${index + 2}`} key={image} />)}
        </section>
      )}

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
        <ActivitiesSection activities={tripActivities} destination={trip.destination} usePexels={getTripCardType(trip) === "catalog"} />
        <TripMatchSection match={match} />
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <TripMembersSection members={validatedMembers} currentUserId={currentUserId} acceptedTribeMemberIds={acceptedTribeMemberIds} onViewProfile={onViewProfile} onAddFriend={onAddFriend} />
          <BudgetSection trip={trip} />
        </div>
        {(isCreator || canManageMembership) && (
          <section className="rounded-[1.25rem] border border-forest-100 bg-white p-5">
            <h2 className="text-xl font-semibold">Gérer ce Trip</h2>
            <p className="mt-2 text-sm text-forest-600">{isCreator ? "La suppression retire définitivement le Trip et sa conversation." : "Quitter te retire des participants et de la conversation."}</p>
            <button className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50" onClick={() => setDestructiveAction(isCreator ? "delete" : "leave")}>
              {isCreator ? <Trash2 size={17} /> : <LogOut size={17} />}
              {isCreator ? "Supprimer le Trip" : "Quitter le Trip"}
            </button>
          </section>
        )}
      </section>
      {destructiveAction && (
        <ConfirmDialog
          title={destructiveAction === "delete" ? "Supprimer définitivement ce Trip ?" : "Quitter ce Trip ?"}
          description={destructiveAction === "delete" ? "Le Trip, les demandes et la conversation seront supprimés. Cette action est irréversible." : "Tu ne feras plus partie des participants et tu perdras l'accès à la conversation."}
          confirmLabel={destructiveAction === "delete" ? "Supprimer" : "Quitter"}
          danger
          onCancel={() => setDestructiveAction(null)}
          onConfirm={async () => {
            if (destructiveAction === "delete") await onDeleteTrip(trip);
            else await onLeaveTrip(trip);
            setDestructiveAction(null);
          }}
        />
      )}
    </>
  );
}

function TripMatchSection({ match }: { match: TripMatchResult }) {
  const requiresConnection = match.missingCriteria.includes("Connexion au profil");
  const confidenceLabel = match.confidence === "élevée" ? "Précision élevée" : match.confidence === "moyenne" ? "Précision moyenne" : "Match estimé";

  return (
    <section className="rounded-[1.5rem] bg-white p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="pill">Match personnalisé</p>
          <h2 className="mt-3 text-3xl font-semibold">
            {requiresConnection
              ? `${match.score}% score catalogue`
              : match.confidence === "élevée" ? `${match.score}% match avec toi` : `Match estimé : ${match.score}%`}
          </h2>
          <p className="mt-2 text-sm font-semibold text-forest-600">{confidenceLabel}</p>
        </div>
        <div className="rounded-[1.25rem] bg-forest-900 px-6 py-4 text-center text-white">
          <span className="text-4xl font-semibold">{match.score}%</span>
          <span className="mt-1 block text-xs font-semibold text-white/70">compatibilité</span>
        </div>
      </div>

      {requiresConnection ? (
        <p className="mt-5 rounded-xl bg-skysoft p-4 font-semibold text-forest-800">Connecte-toi et complète ton profil pour voir ton match personnalisé.</p>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="font-semibold">Pourquoi ce Trip te correspond ?</h3>
            <div className="mt-3 grid gap-2">
              {match.reasons.slice(0, 4).map((reason) => (
                <div className="flex items-start gap-2 rounded-xl bg-forest-50 px-3 py-2 text-sm font-semibold text-forest-800" key={reason}>
                  <BadgeCheck className="mt-0.5 shrink-0 text-forest-700" size={16} />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold">Pour améliorer la précision</h3>
            {match.missingCriteria.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {match.missingCriteria.slice(0, 5).map((criterion) => <span className="pill text-xs" key={criterion}>{criterion}</span>)}
              </div>
            ) : (
              <p className="mt-3 text-sm text-forest-700">Ton profil contient assez d'informations pour un match précis.</p>
            )}
          </div>
        </div>
      )}
    </section>
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
  if (!isUserProject) {
    return (
      <section className="flex flex-col gap-3 rounded-lg border border-forest-100 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="pill text-xs">{getTripTypeLabel(trip)}</p>
          <h2 className="text-lg font-semibold">À co-construire</h2>
          <p className="text-sm text-forest-600">Le groupe choisit les dates et l'organisation.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 text-xs font-bold text-forest-700">
          <span className="rounded-full bg-forest-50 px-3 py-1.5">{getTripDateLabel(trip)}</span>
          {trip.max_participants && <span className="rounded-full bg-forest-50 px-3 py-1.5">Jusqu'à {trip.max_participants} personnes</span>}
        </div>
      </section>
    );
  }
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

function ActivitiesSection({ activities: tripActivities, destination, usePexels }: { activities: Array<Activity | MockLocalActivity>; destination: string; usePexels: boolean }) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pexelsPhotos, setPexelsPhotos] = useState<Record<string, PexelsActivityPhoto[]>>({});
  const activitySearchKey = tripActivities.map((activity) => `${activity.id}:${activity.name}`).join("|");

  useEffect(() => {
    const controller = new AbortController();
    setPexelsPhotos({});
    if (!usePexels) return () => controller.abort();
    tripActivities.slice(0, 8).forEach((activity) => {
      const query = buildPexelsActivityQuery(activity, destination);
      void searchPexelsActivityPhotos(query, controller.signal)
        .then((photos) => {
          if (!controller.signal.aborted && photos.length) {
            setPexelsPhotos((current) => ({ ...current, [activity.id]: photos }));
          }
        })
        .catch(() => {
          // Les images locales restent affichées si Pexels ou le réseau est indisponible.
        });
    });
    return () => controller.abort();
  }, [activitySearchKey, destination, usePexels]);

  const scrollToActivity = (index: number) => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const cards = Array.from(carousel.children) as HTMLElement[];
    const nextIndex = Math.max(0, Math.min(index, cards.length - 1));
    const target = cards[nextIndex];
    if (!target) return;
    carousel.scrollTo({ left: target.offsetLeft - carousel.offsetLeft, behavior: "smooth" });
    setActiveIndex(nextIndex);
  };

  const updateActiveActivity = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const cards = Array.from(carousel.children) as HTMLElement[];
    if (!cards.length) return;
    const closestIndex = cards.reduce((closest, card, index) => {
      const currentDistance = Math.abs(card.offsetLeft - carousel.offsetLeft - carousel.scrollLeft);
      const closestDistance = Math.abs(cards[closest].offsetLeft - carousel.offsetLeft - carousel.scrollLeft);
      return currentDistance < closestDistance ? index : closest;
    }, 0);
    setActiveIndex(closestIndex);
  };

  return (
    <section className="overflow-hidden">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="pill">Expériences</p>
          <h2 className="mt-3 text-3xl font-semibold">Activités proposées pour ce Trip</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-forest-600">Des moments à vivre ensemble, sélectionnés pour cette destination.</p>
        </div>
        {tripActivities.length > 1 && (
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <button
              aria-label="Voir l'activité précédente"
              className="grid h-11 w-11 place-items-center rounded-full border border-forest-200 bg-white text-forest-900 transition hover:bg-forest-50 disabled:cursor-default disabled:opacity-35"
              disabled={activeIndex === 0}
              onClick={() => scrollToActivity(activeIndex - 1)}
              type="button"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              aria-label="Voir l'activité suivante"
              className="grid h-11 w-11 place-items-center rounded-full bg-forest-900 text-white transition hover:bg-forest-800 disabled:cursor-default disabled:opacity-35"
              disabled={activeIndex === tripActivities.length - 1}
              onClick={() => scrollToActivity(activeIndex + 1)}
              type="button"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
      <div
        aria-label="Carousel des activités proposées"
        className="activity-carousel -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-5 sm:mx-0 sm:px-0"
        onScroll={updateActiveActivity}
        ref={carouselRef}
        role="region"
      >
        {tripActivities.map((activity) => <ActivityCard activity={activity} pexelsPhotos={pexelsPhotos[activity.id] ?? []} key={activity.id} />)}
      </div>
      {tripActivities.length > 1 && (
        <div className="mt-1 flex items-center justify-between sm:justify-end">
          <span className="text-xs font-bold text-forest-600 sm:hidden">{activeIndex + 1} / {tripActivities.length}</span>
          <div className="flex gap-1.5" aria-hidden="true">
            {tripActivities.map((activity, index) => (
              <span className={`h-1.5 rounded-full transition-all ${index === activeIndex ? "w-7 bg-forest-800" : "w-1.5 bg-forest-200"}`} key={activity.id} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function TripMembersSection({ members: tripMembers, currentUserId, acceptedTribeMemberIds, onViewProfile, onAddFriend }: { members: UserProfile[]; currentUserId?: string; acceptedTribeMemberIds: Set<string>; onViewProfile: (profileId: string) => void; onAddFriend: (member: UserProfile) => void | Promise<void> }) {
  return (
    <section>
      <div className="mb-5">
        <p className="pill">La tribu</p>
        <h2 className="mt-3 text-3xl font-semibold">Membres qui ont validé le Trip</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {tripMembers.map((member) => (
          <article className="flex items-center gap-3 rounded-[1.25rem] bg-white p-4 shadow-soft" key={member.id}>
            <button className="flex min-w-0 flex-1 items-center gap-4 text-left" onClick={() => onViewProfile(member.id)}>
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
            </button>
            {member.id !== currentUserId && (
              acceptedTribeMemberIds.has(member.id)
                ? <span className="shrink-0 rounded-full bg-forest-50 px-3 py-2 text-xs font-bold text-forest-700">Dans ta tribu</span>
                : <button className="shrink-0 rounded-full bg-forest-900 px-3 py-2 text-xs font-bold text-white" onClick={() => onAddFriend(member)}>Ajouter</button>
            )}
          </article>
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
    return trip.activities.map((activity, index) => {
      const assignedImages = getActivityImageRotation(trip.image_urls, trip.image_url, index);
      return {
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
        image: assignedImages[0] ?? trip.image_url,
        images: assignedImages,
        source: "mock" as const
      };
    });
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
  onFormalizeTrip,
  onViewProfile,
  acceptedTribeMemberIds,
  onAddFriend,
  onLeaveTrip,
  onDeleteTrip,
  blockedUserIds,
  onReport,
  onRefresh
}: {
  conversation: Conversation | null;
  go: (page: Page) => void;
  currentUser: UserProfile;
  accessToken?: string;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
  onFormalizeTrip: (trip: Trip) => void;
  onViewProfile: (profileId: string) => void;
  acceptedTribeMemberIds: Set<string>;
  onAddFriend: (member: UserProfile) => void | Promise<void>;
  onLeaveTrip: (trip: Trip) => void | Promise<void>;
  onDeleteTrip: (trip: Trip) => void | Promise<void>;
  blockedUserIds: Set<string>;
  onReport: (target: ReportTarget) => void;
  onRefresh: () => void | Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [participants, setParticipants] = useState<UserProfile[]>(conversation?.participants ?? []);
  const [remoteMessages, setRemoteMessages] = useState<Conversation["messages"]>([]);
  const [confirmations, setConfirmations] = useState<TripConfirmation[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [tripAction, setTripAction] = useState<"leave" | "delete" | null>(null);
  const [chatNotice, setChatNotice] = useState("");
  const [isSending, setIsSending] = useState(false);
  const conversationId = conversation?.id;
  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const displayMessages = useMemo(() => {
    const systemMessages = conversation?.messages?.filter((message) => message.system) ?? [];
    return [...systemMessages, ...[...remoteMessages]
      .filter((message) => !message.authorId || !blockedUserIds.has(message.authorId))
      .sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime())];
  }, [blockedUserIds, conversation?.messages, remoteMessages]);

  useEffect(() => {
    setParticipants(conversation?.participants ?? []);
    setRemoteMessages([]);
    setConfirmations([]);
    setImageFiles([]);
    setImagePreviews([]);
    setSelectedMessageId(null);
    setChatNotice("");
  }, [conversationId]);

  useEffect(() => {
    const container = messageScrollRef.current;
    if (container) container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [displayMessages.length]);

  useEffect(() => () => imagePreviews.forEach((preview) => URL.revokeObjectURL(preview)), [imagePreviews]);

  useEffect(() => {
    if (!conversationId || !accessToken) return;

    let mounted = true;

    const loadConversationData = async () => {
      try {
        const [memberRows, messageRows, confirmationRows] = await Promise.all([
          getConversationMembers(conversationId, accessToken),
          getConversationMessages(conversationId, accessToken),
          conversation ? getTripConfirmations(conversation.trip.id, accessToken).catch(() => []) : Promise.resolve([])
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

        const allImagePaths = messageRows.flatMap((message) => message.image_paths ?? []);
        const mediaUrls = allImagePaths.length > 0 ? await createConversationMediaUrls(allImagePaths, accessToken) : {};
        const nextMessages = messageRows.map((message) => {
          const profile = profileById.get(message.user_id);
          return {
            id: message.id,
            authorId: message.user_id,
            author: profile?.display_name ?? (message.user_id === currentUser.id ? currentUser.name : "Membre Tribu"),
            content: message.body,
            time: formatConversationTime(message.created_at),
            createdAt: message.created_at,
            updatedAt: message.updated_at,
            imagePaths: message.image_paths ?? [],
            imageUrls: (message.image_paths ?? []).map((path) => mediaUrls[path]).filter(Boolean)
          };
        });

        if (!mounted) return;
        if (nextParticipants.length > 0) {
          setParticipants((previous) => keepPreviousIfEqual(previous, nextParticipants));
        }
        setRemoteMessages((previous) => keepPreviousIfEqual(previous, nextMessages));
        setConfirmations((previous) => keepPreviousIfEqual(previous, confirmationRows));
        setChatNotice((previous) => previous ? "" : previous);
        await markTripConversationAsRead(conversationId, currentUser.id, accessToken).catch(() => undefined);
      } catch (error) {
        console.warn("Conversation indisponible.", error);
        if (mounted) setChatNotice("Impossible de synchroniser la conversation pour le moment.");
      }
    };

    loadConversationData();
    const interval = window.setInterval(loadConversationData, 5_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [accessToken, conversation, conversationId, currentUser.id, currentUser.name]);

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

  const sendMessage = async () => {
    if (!draft.trim() && imageFiles.length === 0) return;
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
      const uploadedPaths = imageFiles.length > 0 ? await uploadConversationImages(currentUser.id, conversation.id, imageFiles, accessToken) : [];
      const mediaUrls = uploadedPaths.length > 0 ? await createConversationMediaUrls(uploadedPaths, accessToken) : {};
      const message = await sendConversationMessage(conversation.id, currentUser.id, body, accessToken, uploadedPaths);
      setRemoteMessages((prev) => [
        ...prev.filter((item) => item.id !== message.id),
        {
          id: message.id,
          authorId: message.user_id,
          author: currentUser.name,
          content: message.body,
          time: formatConversationTime(message.created_at),
          createdAt: message.created_at,
          imagePaths: uploadedPaths,
          imageUrls: uploadedPaths.map((path) => mediaUrls[path]).filter(Boolean)
        }
      ]);
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
      setImageFiles([]);
      setImagePreviews([]);
      await markTripConversationAsRead(conversation.id, currentUser.id, accessToken).catch(() => undefined);
    } catch (error) {
      console.error("Message non envoyé.", error);
      setDraft(body);
      setChatNotice(error instanceof Error ? error.message : "Impossible d'envoyer le message.");
    } finally {
      setIsSending(false);
    }
  };

  const saveEditedMessage = async () => {
    if (!editingMessageId || !editDraft.trim() || !accessToken) return;
    const updated = await updateConversationMessage(editingMessageId, editDraft.trim(), accessToken);
    setRemoteMessages((messages) => messages.map((message) => message.id === updated.id ? { ...message, content: updated.body, updatedAt: updated.updated_at } : message));
    setEditingMessageId(null);
    setSelectedMessageId(null);
  };

  const removeMessage = async (messageId: string) => {
    if (!accessToken) return;
    const message = remoteMessages.find((item) => item.id === messageId);
    if (message?.imagePaths?.length) await deleteConversationImages(message.imagePaths, accessToken).catch(() => undefined);
    await deleteConversationMessage(messageId, accessToken);
    setRemoteMessages((messages) => messages.filter((item) => item.id !== messageId));
    setSelectedMessageId(null);
  };

  const toggleConfirmation = async () => {
    if (!accessToken) return;
    const existing = confirmations.some((confirmation) => confirmation.user_id === currentUser.id);
    if (existing) await withdrawTripConfirmation(conversation.trip.id, currentUser.id, accessToken);
    else await confirmTrip(conversation.trip.id, currentUser.id, accessToken);
    setConfirmations(await getTripConfirmations(conversation.trip.id, accessToken));
    await onRefresh();
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
              <button className={`mt-3 w-full rounded-full px-5 py-3 font-bold ${confirmations.some((item) => item.user_id === currentUser.id) ? "bg-emerald-100 text-emerald-900" : "bg-forest-900 text-white"}`} onClick={toggleConfirmation}>
                <CheckCircle2 className="mr-2 inline" size={18} />
                {confirmations.some((item) => item.user_id === currentUser.id) ? "Départ confirmé" : "Confirmer ce Trip"}
              </button>
              <p className="mt-2 text-center text-xs font-semibold text-forest-600">{confirmations.length}/{participants.length} confirmations</p>
              <button className="btn-secondary mt-5 w-full" onClick={() => go("trip")}>Retour au Trip</button>
              <button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-forest-200 px-4 py-2.5 text-sm font-bold text-forest-700" onClick={() => onReport({ type: "conversation", label: conversation.trip.title, reportedConversationId: conversation.id, reportedTripId: conversation.trip.id })}>
                <Flag size={16} /> Signaler la conversation
              </button>
              <button className="mt-3 w-full rounded-full border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700" onClick={() => setTripAction(conversation.trip.creator_id === currentUser.id ? "delete" : "leave")}>
                {conversation.trip.creator_id === currentUser.id ? "Supprimer le Trip" : "Quitter le Trip"}
              </button>
            </div>
          </div>
          <Panel title="Participants">
            <div className="grid gap-3">
              {participants.map((member) => (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-forest-50 p-3" key={member.id}>
                  <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => onViewProfile(member.id)}>
                    <img className="h-10 w-10 rounded-full object-cover" src={member.photo_url} alt={member.name} />
                    <div>
                      <p className="font-semibold">{member.name}</p>
                      <p className="text-sm text-forest-700">{member.adventure_style}</p>
                    </div>
                  </button>
                  {member.id !== currentUser.id && !acceptedTribeMemberIds.has(member.id) ? (
                    <button className="rounded-full bg-white px-3 py-2 text-xs font-bold text-forest-800" onClick={() => onAddFriend(member)}>Ajouter</button>
                  ) : member.verified ? <BadgeCheck className="shrink-0 text-forest-700" size={18} /> : null}
                </div>
              ))}
            </div>
          </Panel>
        </aside>

        <div className="card flex min-h-[560px] flex-col overflow-hidden sm:min-h-[680px]">
          <div className="border-b border-forest-100 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-forest-700">Chat avec outils de signalement</p>
                <h2 className="text-2xl font-semibold">Préparer l'aventure ensemble</h2>
              </div>
              <span className="pill">{participants.length} membre{participants.length > 1 ? "s" : ""}</span>
            </div>
            {chatNotice && <p className="mt-3 rounded-lg bg-sun/15 px-3 py-2 text-sm font-semibold text-forest-800">{chatNotice}</p>}
          </div>
          <div ref={messageScrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-forest-50 p-4 sm:p-6">
            {displayMessages.map((message) => (
              <div
                className={`rounded-lg p-4 ${message.system ? "bg-skysoft text-forest-900" : message.authorId === currentUser.id ? "ml-auto max-w-[88%] cursor-pointer bg-forest-800 text-white" : "max-w-[88%] bg-white"}`}
                key={message.id}
                onClick={() => message.authorId === currentUser.id && setSelectedMessageId((current) => current === message.id ? null : message.id)}
              >
                <div className="mb-1 flex items-center justify-between gap-4 text-xs font-semibold opacity-80">
                  <span>{message.author}</span>
                  <span className="flex items-center gap-2">
                    <span>{message.time}</span>
                    {!message.system && message.authorId && message.authorId !== currentUser.id && (
                      <button className="rounded-full p-1 hover:bg-forest-50" onClick={(event) => { event.stopPropagation(); onReport({ type: "message", label: `Message de ${message.author}`, reportedMessageId: message.id, reportedUserId: message.authorId, reportedConversationId: conversation.id }); }} aria-label="Signaler ce message">
                        <Flag size={13} />
                      </button>
                    )}
                  </span>
                </div>
                {editingMessageId === message.id ? (
                  <div className="mt-2 grid gap-2" onClick={(event) => event.stopPropagation()}>
                    <textarea className="rounded-lg bg-white p-3 text-forest-900" value={editDraft} onChange={(event) => setEditDraft(event.target.value)} />
                    <div className="flex gap-2">
                      <button className="rounded-full bg-white px-3 py-1 text-xs font-bold text-forest-900" onClick={saveEditedMessage}>Enregistrer</button>
                      <button className="rounded-full border border-white/40 px-3 py-1 text-xs font-bold" onClick={() => setEditingMessageId(null)}>Annuler</button>
                    </div>
                  </div>
                ) : message.content ? <p>{message.content}</p> : null}
                {message.imageUrls && message.imageUrls.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {message.imageUrls.map((url) => <a href={url} target="_blank" rel="noreferrer" key={url}><img className="max-h-72 w-full rounded-lg object-cover" src={url} alt="Photo envoyée" /></a>)}
                  </div>
                )}
                {message.updatedAt && <span className="mt-1 block text-[10px] opacity-60">modifié</span>}
                {selectedMessageId === message.id && !message.system && (
                  <div className="mt-3 flex justify-end gap-2 border-t border-white/20 pt-2" onClick={(event) => event.stopPropagation()}>
                    <button className="rounded-full bg-white/15 p-2" onClick={() => { setEditingMessageId(message.id); setEditDraft(message.content); }} aria-label="Modifier"><FileText size={15} /></button>
                    <button className="rounded-full bg-white/15 p-2" onClick={() => removeMessage(message.id)} aria-label="Supprimer"><Trash2 size={15} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-forest-100 bg-white p-4">
            {imagePreviews.length > 0 && (
              <div className="mb-3 flex gap-2 overflow-x-auto">
                {imagePreviews.map((preview) => <img className="h-16 w-16 rounded-lg object-cover" src={preview} alt="Photo à envoyer" key={preview} />)}
                <button className="rounded-full p-2 text-red-700" onClick={() => { imagePreviews.forEach((preview) => URL.revokeObjectURL(preview)); setImageFiles([]); setImagePreviews([]); }} aria-label="Retirer les photos"><X size={18} /></button>
              </div>
            )}
            <div className="flex gap-3">
              <label className="grid cursor-pointer place-items-center rounded-full bg-forest-50 p-3 text-forest-800" aria-label="Ajouter des photos">
                <ImagePlus size={19} />
                <input className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; const error = validateImageFiles(files, 6); if (error) { setChatNotice(error); return; } imagePreviews.forEach((preview) => URL.revokeObjectURL(preview)); setImageFiles(files); setImagePreviews(files.map((file) => URL.createObjectURL(file))); }} />
              </label>
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
      {tripAction && (
        <ConfirmDialog
          title={tripAction === "delete" ? "Supprimer définitivement ce Trip ?" : "Quitter ce Trip ?"}
          description={tripAction === "delete" ? "Le Trip et sa conversation seront supprimés pour tout le groupe." : "Tu seras retiré des participants et de la conversation."}
          confirmLabel={tripAction === "delete" ? "Supprimer" : "Quitter"}
          danger
          onCancel={() => setTripAction(null)}
          onConfirm={async () => {
            if (tripAction === "delete") await onDeleteTrip(conversation.trip);
            else await onLeaveTrip(conversation.trip);
            setTripAction(null);
          }}
        />
      )}
    </section>
  );
}

type CompatibleTribeProfile = UserProfile & {
  compatibilityScore: number;
  compatibilityTags: string[];
  publicTrips: Trip[];
};

function MessagesPage({
  currentUser,
  profiles,
  tribeRequests,
  trips,
  favoriteTrips,
  accessToken,
  isAuthenticated,
  initialMemberId,
  unreadMessageCounts,
  tripConversationSummaries,
  onRequireAuth,
  onConversationRead,
  onOpenTripConversation,
  onViewProfile,
  onInviteToTrip,
  onReport,
  onBlockUser
}: {
  currentUser: UserProfile;
  profiles: UserProfileRecord[];
  tribeRequests: TribeRequestBundle;
  trips: Trip[];
  favoriteTrips: Trip[];
  accessToken?: string;
  isAuthenticated: boolean;
  initialMemberId: string | null;
  unreadMessageCounts: Record<string, number>;
  tripConversationSummaries: TripConversationSummary[];
  onRequireAuth: () => void;
  onConversationRead: (connectionId: string) => void | Promise<void>;
  onOpenTripConversation: (trip: Trip, conversationId: string) => void | Promise<void>;
  onViewProfile: (profileId: string) => void;
  onInviteToTrip: (trip: Trip, member: UserProfile) => void | Promise<void>;
  onReport: (target: ReportTarget) => void;
  onBlockUser: (userId: string, name: string) => void;
}) {
  const [activeMemberId, setActiveMemberId] = useState<string | null>(initialMemberId);
  const [inviteTarget, setInviteTarget] = useState<CompatibleTribeProfile | null>(null);
  const tribeMemberIds = useMemo(() => new Set(
    tribeRequests.accepted.map((request) => request.requester_id === currentUser.id ? request.receiver_id : request.requester_id)
  ), [currentUser.id, tribeRequests.accepted]);
  const profileUsers = useMemo(() => profiles.map((profile) => profileRecordToUserProfile(profile)), [profiles]);
  const tribePeople = useMemo(
    () => getCompatiblePeople(currentUser, profileUsers.filter((profile) => tribeMemberIds.has(profile.id)), trips),
    [currentUser, profileUsers, tribeMemberIds, trips]
  );

  useEffect(() => {
    if (initialMemberId && tribePeople.some((member) => member.id === initialMemberId)) {
      setActiveMemberId(initialMemberId);
      return;
    }
    if (!activeMemberId || !tribePeople.some((member) => member.id === activeMemberId)) {
      setActiveMemberId(tribePeople[0]?.id ?? null);
    }
  }, [activeMemberId, initialMemberId, tribePeople]);

  if (!isAuthenticated) {
    return (
      <section className="container-page py-10">
        <div className="card mx-auto max-w-2xl p-8 text-center">
          <MessageCircle className="mx-auto text-forest-700" size={42} />
          <h1 className="mt-4 text-3xl font-semibold">Connecte-toi pour accéder à tes messages.</h1>
          <button className="btn-primary mt-6" onClick={onRequireAuth}>Connexion / inscription</button>
        </div>
      </section>
    );
  }

  const selectedMember = tribePeople.find((member) => member.id === activeMemberId) ?? null;
  const selectedConnection = selectedMember ? tribeRequests.accepted.find((request) => (
    (request.requester_id === currentUser.id && request.receiver_id === selectedMember.id)
    || (request.receiver_id === currentUser.id && request.requester_id === selectedMember.id)
  )) : undefined;

  return (
    <section className="container-page py-6 sm:py-10">
      <div>
        <p className="pill">Messages</p>
        <h1 className="mt-3 text-4xl font-semibold">Tes conversations</h1>
        <p className="mt-2 text-forest-700">Retrouve ici tes discussions privées et toutes les conversations de Trips.</p>
      </div>
      <TripConversationInbox summaries={tripConversationSummaries} trips={trips} onOpen={onOpenTripConversation} />
      <div className="mt-8"><h2 className="text-2xl font-semibold">Messages privés</h2></div>
      {tribePeople.length > 0 ? (
        <TribeInbox
          people={tribePeople}
          selectedMember={selectedMember}
          selectedConnection={selectedConnection}
          connections={tribeRequests.accepted}
          unreadMessageCounts={unreadMessageCounts}
          currentUser={currentUser}
          accessToken={accessToken}
          onSelectMember={(member) => setActiveMemberId(member.id)}
          onConversationRead={onConversationRead}
          onViewProfile={onViewProfile}
          onInvite={setInviteTarget}
          onRequireAuth={onRequireAuth}
          onReport={onReport}
          onBlockUser={onBlockUser}
        />
      ) : (
        <EmptyState title="Aucune conversation" text="Ajoute d'abord une personne depuis Tribu. La conversation apparaîtra ici après acceptation." />
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

function TripConversationInbox({ summaries, trips, onOpen }: { summaries: TripConversationSummary[]; trips: Trip[]; onOpen: (trip: Trip, conversationId: string) => void | Promise<void> }) {
  const rows = summaries.map((summary) => ({ summary, trip: trips.find((trip) => trip.id === summary.conversation.trip_id) })).filter((row): row is { summary: TripConversationSummary; trip: Trip } => Boolean(row.trip));
  return (
    <section className="mt-6 overflow-hidden rounded-[1.5rem] bg-white shadow-soft">
      <div className="border-b border-forest-100 p-4">
        <p className="text-sm font-semibold text-forest-600">Conversations de Trips</p>
        <h2 className="text-2xl font-semibold">Tes groupes</h2>
      </div>
      {rows.length > 0 ? rows.map(({ summary, trip }) => (
        <button className={`flex w-full items-center gap-3 border-b border-forest-50 p-4 text-left transition last:border-0 hover:bg-forest-50 ${summary.unreadCount > 0 ? "bg-sun/10" : "bg-white"}`} key={summary.conversation.id} onClick={() => onOpen(trip, summary.conversation.id)}>
          <img className="h-14 w-14 rounded-xl object-cover" src={trip.image_url} alt="" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold">{trip.title}</span>
            <span className="mt-1 block truncate text-sm text-forest-600">{summary.latestMessage?.body || (summary.latestMessage?.image_paths?.length ? "Photo" : "Conversation du groupe")}</span>
          </span>
          {summary.unreadCount > 0 && <span className="grid h-7 min-w-7 place-items-center rounded-full bg-sun px-2 text-xs font-bold text-white">{summary.unreadCount}</span>}
        </button>
      )) : <p className="p-5 text-sm font-semibold text-forest-600">Tes conversations de Trips apparaîtront ici après avoir rejoint un groupe.</p>}
    </section>
  );
}

function Community({
  currentUser,
  trips: availableTrips,
  favoriteTrips,
  profiles,
  tribeRequests,
  isAuthenticated,
  initialTab,
  onRequireAuth,
  onSendTribeRequest,
  onViewProfile,
  onOpenMessages,
  onInviteToTrip
}: {
  currentUser: UserProfile;
  trips: Trip[];
  favoriteTrips: Trip[];
  profiles: UserProfileRecord[];
  tribeRequests: TribeRequestBundle;
  isAuthenticated: boolean;
  initialTab: CommunityTab;
  onRequireAuth: () => void;
  onSendTribeRequest: (member: UserProfile) => void | Promise<void>;
  onViewProfile: (profileId: string) => void;
  onOpenMessages: (memberId?: string) => void;
  onInviteToTrip: (trip: Trip, member: UserProfile) => void | Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<CommunityTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteTarget, setInviteTarget] = useState<CompatibleTribeProfile | null>(null);
  const profileUsers = useMemo(() => {
    return profiles.map((profile) => profileRecordToUserProfile(profile));
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
  const normalizedSearch = normalizeUiText(searchQuery.trim());
  const filteredPeople = compatiblePeople.filter((member) => !normalizedSearch || normalizeUiText(`${member.name} ${member.city}`).includes(normalizedSearch));
  const myTribePeople = useMemo(
    () => getCompatiblePeople(currentUser, profileUsers.filter((profile) => tribeMemberIds.has(profile.id)), availableTrips),
    [availableTrips, currentUser, profileUsers, tribeMemberIds]
  );
  const filteredTribePeople = myTribePeople.filter((member) => !normalizedSearch || normalizeUiText(`${member.name} ${member.city}`).includes(normalizedSearch));
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
            {activeTab === "compatibles" && "Recherche de vrais membres, consulte leur profil et invite-les dans ta tribu."}
            {activeTab === "tribe" && "Retrouve les personnes qui font réellement partie de ta tribu."}
          </p>
        </div>
        <div className="rounded-[1.25rem] bg-white px-4 py-3 text-sm font-semibold text-forest-700 shadow-sm">
          {activeTab === "compatibles" && `${filteredPeople.length} profils compatibles`}
          {activeTab === "tribe" && `${filteredTribePeople.length} membres`}
        </div>
      </div>

      <label className="mt-6 flex items-center gap-3 rounded-[1rem] bg-white px-4 shadow-sm">
        <Search className="text-forest-600" size={20} />
        <input className="min-w-0 flex-1 bg-transparent py-4 outline-none" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Rechercher un membre par nom ou ville" />
      </label>

      <div className="mt-4 flex flex-wrap gap-2 rounded-[1.25rem] bg-white p-2 shadow-sm">
        {[
          ["compatibles", "Découvrir"],
          ["tribe", "Ma tribu"]
        ].map(([key, label]) => (
          <button
            className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${activeTab === key ? "bg-forest-800 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"}`}
            key={key}
            onClick={() => {
              const nextTab = key as CommunityTab;
              setActiveTab(nextTab);
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
          onInvite={(member) => guardSocialAction(() => setInviteTarget(member))}
          onAdd={(member) => guardSocialAction(() => onSendTribeRequest(member))}
          addLabel="Ajouter à ma tribu"
        />
      )}

      {activeTab === "tribe" && (
        filteredTribePeople.length > 0
          ? (
            <TribeProfileGrid
              people={filteredTribePeople}
              onViewProfile={onViewProfile}
              onMessage={(member) => onOpenMessages(member.id)}
              onInvite={(member) => guardSocialAction(() => setInviteTarget(member))}
              addLabel=""
            />
          )
          : <EmptyState title="Ta tribu est encore vide" text="Les personnes apparaîtront ici après acceptation d'une demande." />
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
  addLabel = "Ajouter à ma tribu",
  messageLabel = "Message"
}: {
  people: CompatibleTribeProfile[];
  onViewProfile: (profileId: string) => void;
  onMessage?: (member: CompatibleTribeProfile) => void;
  onInvite?: (member: CompatibleTribeProfile) => void;
  onAdd?: (member: CompatibleTribeProfile) => void;
  addLabel?: string;
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
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="btn-secondary py-2" onClick={() => onViewProfile(member.id)}>Profil</button>
              {onMessage && <button className="btn-primary py-2" onClick={() => onMessage(member)}>{messageLabel}</button>}
              {onInvite && <button className="btn-secondary py-2" onClick={() => onInvite(member)}>Inviter à un Trip</button>}
            </div>
            {onAdd && <button className="mt-2 w-full rounded-full bg-forest-50 px-4 py-2 text-sm font-semibold text-forest-800 transition hover:bg-forest-100" onClick={() => onAdd(member)}>{addLabel}</button>}
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
  connections,
  unreadMessageCounts,
  currentUser,
  accessToken,
  onSelectMember,
  onConversationRead,
  onViewProfile,
  onInvite,
  onRequireAuth,
  onReport,
  onBlockUser
}: {
  people: CompatibleTribeProfile[];
  selectedMember: CompatibleTribeProfile | null;
  selectedConnection?: TribeConnection;
  connections: TribeConnection[];
  unreadMessageCounts: Record<string, number>;
  currentUser: UserProfile;
  accessToken?: string;
  onSelectMember: (member: CompatibleTribeProfile) => void;
  onConversationRead: (connectionId: string) => void | Promise<void>;
  onViewProfile: (profileId: string) => void;
  onInvite: (member: CompatibleTribeProfile) => void;
  onRequireAuth: () => void;
  onReport: (target: ReportTarget) => void;
  onBlockUser: (userId: string, name: string) => void;
}) {
  return (
    <section className="mt-6 grid gap-4 lg:mt-8 lg:grid-cols-[0.86fr_1.14fr] lg:gap-6">
      <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-soft">
        <div className="border-b border-forest-100 p-4">
          <p className="text-sm font-semibold text-forest-700">Ma tribu</p>
          <h2 className="text-2xl font-semibold">Tes amis</h2>
        </div>
        <div className="flex gap-2 overflow-x-auto p-2 lg:block lg:max-h-[680px] lg:overflow-y-auto lg:p-0">
          {people.map((member) => {
            const active = selectedMember?.id === member.id;
            const connection = connections.find((item) => (
              (item.requester_id === currentUser.id && item.receiver_id === member.id)
              || (item.receiver_id === currentUser.id && item.requester_id === member.id)
            ));
            const unreadCount = connection ? unreadMessageCounts[connection.id] ?? 0 : 0;
            return (
              <article
                className={`flex min-w-[230px] cursor-pointer items-center gap-3 rounded-[1rem] border border-forest-50 p-3 transition hover:bg-forest-50 lg:min-w-0 lg:rounded-none lg:border-x-0 lg:border-t-0 lg:p-4 ${active ? "bg-forest-50 ring-2 ring-forest-700 lg:ring-0" : unreadCount > 0 ? "border-l-4 border-l-sun bg-sun/10" : "bg-white"}`}
                key={member.id}
                onClick={() => onSelectMember(member)}
              >
                <span className="relative shrink-0"><img className="h-14 w-14 rounded-full object-cover" src={member.photo_url} alt={member.name} /><span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${isProfileOnline(member.last_seen_at) ? "bg-emerald-500" : "bg-forest-300"}`} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`truncate ${unreadCount > 0 ? "font-bold text-forest-900" : "font-semibold"}`}>{member.name}</p>
                    {member.verified && <BadgeCheck className="shrink-0 text-forest-700" size={16} />}
                  </div>
                  <p className="truncate text-sm text-forest-700">{member.city} · {member.adventure_style}</p>
                  {unreadCount > 0 ? (
                    <p className="mt-1 truncate text-xs font-bold text-forest-900">{unreadCount} nouveau{unreadCount > 1 ? "x" : ""} message{unreadCount > 1 ? "s" : ""}</p>
                  ) : (
                    <p className="mt-1 truncate text-xs font-semibold text-forest-500">{member.compatibilityTags.slice(0, 2).join(" · ")}</p>
                  )}
                </div>
                {unreadCount > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-sun px-1.5 text-xs font-bold text-white">{unreadCount}</span>}
                <button
                  className="hidden rounded-full bg-forest-900 px-4 py-2 text-sm font-semibold text-white lg:block"
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
        onConversationRead={onConversationRead}
        onViewProfile={onViewProfile}
        onInvite={onInvite}
        onRequireAuth={onRequireAuth}
        onReport={onReport}
        onBlockUser={onBlockUser}
      />
    </section>
  );
}

function TribeDirectConversation({
  member,
  connection,
  currentUser,
  accessToken,
  onConversationRead,
  onViewProfile,
  onInvite,
  onRequireAuth,
  onReport,
  onBlockUser
}: {
  member: CompatibleTribeProfile | null;
  connection?: TribeConnection;
  currentUser: UserProfile;
  accessToken?: string;
  onConversationRead: (connectionId: string) => void | Promise<void>;
  onViewProfile: (profileId: string) => void;
  onInvite: (member: CompatibleTribeProfile) => void;
  onRequireAuth: () => void;
  onReport: (target: ReportTarget) => void;
  onBlockUser: (userId: string, name: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<TribeMessage[]>([]);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [isSending, setIsSending] = useState(false);
  const lastReadIncomingMessageId = useRef<string | null>(null);
  const connectionId = connection?.id;
  const memberId = member?.id;

  useEffect(() => {
    setDraft("");
    setMessages([]);
    setMediaUrls({});
    setImageFiles([]);
    setImagePreviews([]);
    setSelectedMessageId(null);
    setNotice("");
    lastReadIncomingMessageId.current = null;
  }, [connectionId, memberId]);

  useEffect(() => () => imagePreviews.forEach((preview) => URL.revokeObjectURL(preview)), [imagePreviews]);

  useEffect(() => {
    if (!memberId || !connectionId || !accessToken) return;

    let mounted = true;

    const loadMessages = async () => {
      try {
        const rows = await getTribeMessages(connectionId, accessToken);
        const paths = rows.flatMap((message) => message.image_paths ?? []);
        const nextMediaUrls = paths.length > 0 ? await createConversationMediaUrls(paths, accessToken) : {};
        if (mounted) {
          setMessages((previous) => keepPreviousIfEqual(previous, [...rows].sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime())));
          setMediaUrls((previous) => keepPreviousIfEqual(previous, nextMediaUrls));
          setNotice((previous) => previous ? "" : previous);
          const latestIncomingMessage = [...rows].reverse().find((message) => message.sender_id !== currentUser.id);
          if (latestIncomingMessage && latestIncomingMessage.id !== lastReadIncomingMessageId.current) {
            lastReadIncomingMessageId.current = latestIncomingMessage.id;
            void onConversationRead(connectionId);
          }
        }
      } catch (error) {
        console.warn("Messages Tribu indisponibles.", error);
        if (mounted) setNotice("Impossible de synchroniser cette conversation pour le moment.");
      }
    };

    loadMessages();
    const interval = window.setInterval(loadMessages, 5_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [accessToken, connectionId, currentUser.id, memberId, onConversationRead]);

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
    if (!draft.trim() && imageFiles.length === 0) return;
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
      const uploadedPaths = imageFiles.length > 0 ? await uploadConversationImages(currentUser.id, connection.id, imageFiles, accessToken) : [];
      const nextUrls = uploadedPaths.length > 0 ? await createConversationMediaUrls(uploadedPaths, accessToken) : {};
      const nextMessage = await sendTribeMessage(connection.id, currentUser.id, body, accessToken, uploadedPaths);
      setMessages((prev) => [...prev.filter((message) => message.id !== nextMessage.id), nextMessage]);
      setMediaUrls((previous) => ({ ...previous, ...nextUrls }));
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
      setImageFiles([]);
      setImagePreviews([]);
    } catch (error) {
      console.error("Message Tribu non envoyé.", error);
      setDraft(body);
      setNotice(error instanceof Error ? error.message : "Impossible d'envoyer le message.");
    } finally {
      setIsSending(false);
    }
  };

  const saveEdit = async () => {
    if (!editingMessageId || !editDraft.trim() || !accessToken) return;
    const updated = await updateTribeMessage(editingMessageId, editDraft.trim(), accessToken);
    setMessages((previous) => previous.map((message) => message.id === updated.id ? updated : message));
    setEditingMessageId(null);
    setSelectedMessageId(null);
  };

  const removeMessage = async (message: TribeMessage) => {
    if (!accessToken) return;
    if (message.image_paths?.length) await deleteConversationImages(message.image_paths, accessToken).catch(() => undefined);
    await deleteTribeMessage(message.id, accessToken);
    setMessages((previous) => previous.filter((item) => item.id !== message.id));
    setSelectedMessageId(null);
  };

  return (
    <div className="flex min-h-[560px] flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-soft sm:min-h-[680px]">
      <div className="border-b border-forest-100 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img className="h-14 w-14 rounded-full object-cover" src={member.photo_url} alt={member.name} />
            <div>
              <p className="text-lg font-semibold">{member.name}</p>
              <p className="text-sm text-forest-700">{isProfileOnline(member.last_seen_at) ? "En ligne" : "Déconnecté"} · {member.city} · {member.compatibilityScore}% compatible</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary py-2 text-sm" onClick={() => onViewProfile(member.id)}>Profil</button>
            <button className="btn-secondary py-2 text-sm" onClick={() => onInvite(member)}>Inviter</button>
            <button className="rounded-full border border-forest-200 p-2 text-forest-700" onClick={() => onReport({ type: "user", label: member.name, reportedUserId: member.id })} aria-label={`Signaler ${member.name}`}><Flag size={16} /></button>
            <button className="rounded-full border border-red-200 p-2 text-red-700" onClick={() => onBlockUser(member.id, member.name)} aria-label={`Bloquer ${member.name}`}><UserX size={16} /></button>
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
            <div className={`max-w-[86%] rounded-2xl p-3 ${mine ? "ml-auto cursor-pointer bg-forest-800 text-white" : "bg-white"}`} key={message.id} onClick={() => mine && setSelectedMessageId((current) => current === message.id ? null : message.id)}>
              <div className="mb-1 flex justify-between gap-3 text-xs font-semibold opacity-75">
                <span>{mine ? "Toi" : member.name}</span>
                <span className="flex items-center gap-2">
                  <span>{formatConversationTime(message.created_at)}</span>
                  {!mine && <button className="rounded-full p-1 hover:bg-forest-50" onClick={(event) => { event.stopPropagation(); onReport({ type: "message", label: `Message de ${member.name}`, reportedMessageId: message.id, reportedUserId: member.id }); }} aria-label="Signaler ce message"><Flag size={13} /></button>}
                </span>
              </div>
              {editingMessageId === message.id ? (
                <div className="grid gap-2" onClick={(event) => event.stopPropagation()}>
                  <textarea className="rounded-lg bg-white p-2 text-forest-900" value={editDraft} onChange={(event) => setEditDraft(event.target.value)} />
                  <div className="flex gap-2"><button className="rounded-full bg-white px-3 py-1 text-xs font-bold text-forest-900" onClick={saveEdit}>Enregistrer</button><button className="text-xs font-bold" onClick={() => setEditingMessageId(null)}>Annuler</button></div>
                </div>
              ) : message.body ? <p>{message.body}</p> : null}
              {(message.image_paths ?? []).length > 0 && <div className="mt-2 grid grid-cols-2 gap-2">{message.image_paths?.map((path) => mediaUrls[path] ? <a href={mediaUrls[path]} target="_blank" rel="noreferrer" key={path}><img className="max-h-72 w-full rounded-lg object-cover" src={mediaUrls[path]} alt="Photo envoyée" /></a> : null)}</div>}
              {message.updated_at && <span className="mt-1 block text-[10px] opacity-60">modifié</span>}
              {mine && selectedMessageId === message.id && <div className="mt-2 flex justify-end gap-2 border-t border-white/20 pt-2" onClick={(event) => event.stopPropagation()}><button className="rounded-full bg-white/15 p-2" onClick={() => { setEditingMessageId(message.id); setEditDraft(message.body); }} aria-label="Modifier"><FileText size={15} /></button><button className="rounded-full bg-white/15 p-2" onClick={() => removeMessage(message)} aria-label="Supprimer"><Trash2 size={15} /></button></div>}
            </div>
          );
        })}
      </div>

      <div className="border-t border-forest-100 p-4">
        {imagePreviews.length > 0 && <div className="mb-3 flex gap-2 overflow-x-auto">{imagePreviews.map((preview) => <img className="h-16 w-16 rounded-lg object-cover" src={preview} alt="Photo à envoyer" key={preview} />)}<button className="text-red-700" onClick={() => { imagePreviews.forEach((preview) => URL.revokeObjectURL(preview)); setImageFiles([]); setImagePreviews([]); }}><X size={18} /></button></div>}
        <div className="flex gap-2">
        <label className="grid cursor-pointer place-items-center rounded-full bg-forest-50 p-3 text-forest-800">
          <ImagePlus size={19} />
          <input className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; const error = validateImageFiles(files, 6); if (error) { setNotice(error); return; } imagePreviews.forEach((preview) => URL.revokeObjectURL(preview)); setImageFiles(files); setImagePreviews(files.map((file) => URL.createObjectURL(file))); }} />
        </label>
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

function MyTripsPage({
  trips: availableTrips,
  userId,
  userTripActions,
  isAuthenticated,
  onAuthClick,
  onOpenTrip,
  onCancelJoinRequest,
  favoriteTripIds,
  onLeaveTrip,
  onDeleteTrip,
  onCreateTrip
}: {
  trips: Trip[];
  userId?: string;
  userTripActions: UserTripActions | null;
  isAuthenticated: boolean;
  onAuthClick: () => void;
  onOpenTrip: (trip: Trip, shouldOpenConversation: boolean) => void | Promise<void>;
  onCancelJoinRequest: (requestId: string) => void | Promise<void>;
  favoriteTripIds: string[];
  onLeaveTrip: (trip: Trip) => void | Promise<void>;
  onDeleteTrip: (trip: Trip) => void | Promise<void>;
  onCreateTrip: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<"all" | "validated" | "pending" | "interested" | "history">("all");
  const [requestToCancel, setRequestToCancel] = useState<{ id: string; tripTitle: string } | null>(null);
  const [tripAction, setTripAction] = useState<{ trip: Trip; action: "leave" | "delete" } | null>(null);

  if (!isAuthenticated || !userId) {
    return (
      <section className="container-page py-10">
        <div className="card mx-auto max-w-2xl p-8 text-center">
          <CalendarDays className="mx-auto text-forest-700" size={42} />
          <h1 className="mt-4 text-3xl font-semibold">Connecte-toi pour retrouver tes Trips.</h1>
          <p className="mt-3 text-forest-700">Tes créations, participations, intérêts et demandes sont liés à ton compte.</p>
          <button className="btn-primary mt-6" onClick={onAuthClick}>Connexion / inscription</button>
        </div>
      </section>
    );
  }

  const myTrips = availableTrips
    .map((trip) => ({ trip, statuses: getMyTripStatuses(trip, userId, userTripActions, favoriteTripIds.includes(trip.id)) }))
    .filter((entry) => entry.statuses.length > 0);
  const matchesStatusFilter = (statuses: MyTripStatus[]) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "validated") return statuses.some((status) => status.key === "created" || status.key === "joined");
    if (statusFilter === "pending") return statuses.some((status) => status.key === "requested");
    if (statusFilter === "interested") return statuses.some((status) => status.key === "interested");
    return statuses.some((status) => status.key === "rejected" || status.key === "cancelled");
  };
  const visibleTrips = myTrips.filter((entry) => matchesStatusFilter(entry.statuses));
  const filterOptions: Array<{ key: typeof statusFilter; label: string; count: number }> = [
    { key: "all", label: "Tous", count: myTrips.length },
    { key: "validated", label: "Validés", count: myTrips.filter((entry) => entry.statuses.some((status) => status.key === "created" || status.key === "joined")).length },
    { key: "pending", label: "En attente", count: myTrips.filter((entry) => entry.statuses.some((status) => status.key === "requested")).length },
    { key: "interested", label: "Intéressé", count: myTrips.filter((entry) => entry.statuses.some((status) => status.key === "interested")).length },
    { key: "history", label: "Historique", count: myTrips.filter((entry) => entry.statuses.some((status) => status.key === "rejected" || status.key === "cancelled")).length }
  ];

  return (
    <section className="container-page py-8 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="pill">Ton espace</p>
          <h1 className="mt-3 text-4xl font-semibold">Mes Trips</h1>
          <p className="mt-2 text-forest-700">Retrouve ici tes trips créés, rejoints, intéressés ou demandés.</p>
        </div>
        <button className="btn-primary" onClick={onCreateTrip}>Créer un Trip</button>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto rounded-[1.25rem] bg-white p-2 shadow-sm">
        {filterOptions.map((option) => (
          <button
            className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-bold transition ${statusFilter === option.key ? "bg-forest-900 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"}`}
            key={option.key}
            onClick={() => setStatusFilter(option.key)}
          >
            {option.label} <span className="ml-1 opacity-70">{option.count}</span>
          </button>
        ))}
      </div>

      {visibleTrips.length > 0 ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {visibleTrips.map(({ trip, statuses }) => {
            const opensConversation = canOpenTripConversation(trip, userId, userTripActions);
            const pendingRequest = userTripActions?.joinRequests.find((request) => request.trip_id === trip.id && request.requester_id === userId && request.status === "pending");
            return (
              <article className="overflow-hidden rounded-[1.5rem] bg-white shadow-soft" key={trip.id}>
                <button className="relative block h-64 w-full overflow-hidden text-left" onClick={() => onOpenTrip(trip, opensConversation)}>
                  <img className="h-full w-full object-cover" src={trip.image_url} alt={trip.destination} />
                  <div className="absolute inset-0 bg-gradient-to-t from-forest-900/90 via-forest-900/20 to-transparent" />
                  <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                    {statuses.map((status) => (
                      <span className={`rounded-full px-3 py-2 text-xs font-bold ${status.tone}`} key={status.key}>{status.label}</span>
                    ))}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <p className="text-sm font-semibold text-white/80">{trip.destination}</p>
                    <h2 className="mt-1 text-2xl font-semibold">{trip.title}</h2>
                  </div>
                </button>

                <div className="p-5">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <MiniFact label="Dates" value={getTripDateLabel(trip)} />
                    <MiniFact label="Durée" value={getTripDurationLabel(trip)} />
                    <MiniFact label="Budget" value={`${trip.budget_min}-${trip.budget_max} €`} />
                    <MiniFact label="Niveau" value={trip.physical_level} />
                  </div>
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-forest-700">{trip.brief ?? trip.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {trip.ambience_tags.slice(0, 3).map((tag) => <span className="pill text-xs" key={tag}>{tag}</span>)}
                    {trip.activities.slice(0, 2).map((activity) => <span className="rounded-full bg-skysoft px-3 py-1 text-xs font-semibold text-forest-800" key={activity}>{activity}</span>)}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm font-semibold text-forest-700">
                    <span>{trip.current_participants ?? 0}/{trip.max_participants ?? 6} participants</span>
                    <span>{getPlanningStatusLabel(trip.planning_status ?? (getTripCardType(trip) === "catalog" ? "idea" : "planned"))}</span>
                  </div>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <button className="btn-primary w-full" onClick={() => onOpenTrip(trip, opensConversation)}>
                      {opensConversation ? "Ouvrir la conversation" : "Voir le Trip"}
                    </button>
                    {pendingRequest && (
                      <button className="btn-secondary w-full border-red-200 text-red-700 hover:bg-red-50" onClick={() => setRequestToCancel({ id: pendingRequest.id, tripTitle: trip.title })}>
                        Annuler la demande
                      </button>
                    )}
                    {!pendingRequest && statuses.some((status) => status.key === "created") && (
                      <button className="btn-secondary w-full border-red-200 text-red-700 hover:bg-red-50" onClick={() => setTripAction({ trip, action: "delete" })}>Supprimer le Trip</button>
                    )}
                    {!pendingRequest && !statuses.some((status) => status.key === "created") && (
                      <button className="btn-secondary w-full border-red-200 text-red-700 hover:bg-red-50" onClick={() => setTripAction({ trip, action: "leave" })}>Retirer de Mes Trips</button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-8 rounded-[1.5rem] bg-white p-8 text-center shadow-soft">
          <h2 className="text-2xl font-semibold">Aucun Trip dans cette catégorie.</h2>
          <p className="mt-2 text-forest-700">Change de statut ou découvre de nouvelles propositions dans Destination.</p>
        </div>
      )}
      {requestToCancel && (
        <ConfirmDialog
          title="Annuler cette demande ?"
          description={`Ta demande pour « ${requestToCancel.tripTitle} » sera annulée. Tu pourras en envoyer une nouvelle plus tard.`}
          confirmLabel="Oui, annuler"
          danger
          onCancel={() => setRequestToCancel(null)}
          onConfirm={async () => {
            await onCancelJoinRequest(requestToCancel.id);
            setRequestToCancel(null);
          }}
        />
      )}
      {tripAction && (
        <ConfirmDialog
          title={tripAction.action === "delete" ? "Supprimer définitivement ce Trip ?" : "Retirer ce Trip ?"}
          description={tripAction.action === "delete" ? "Le Trip et sa conversation seront définitivement supprimés." : "Tu quitteras le Trip et sa conversation. Un simple favori sera retiré de Mes Trips."}
          confirmLabel={tripAction.action === "delete" ? "Supprimer" : "Quitter / retirer"}
          danger
          onCancel={() => setTripAction(null)}
          onConfirm={async () => {
            if (tripAction.action === "delete") await onDeleteTrip(tripAction.trip);
            else await onLeaveTrip(tripAction.trip);
            setTripAction(null);
          }}
        />
      )}
    </section>
  );
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
  travelPreferences,
  onUpdateTravelPreferences,
  onUploadAvatar,
  onOpenTrip,
  trips: availableTrips,
  userTripActions,
  tribeMemberCount,
  isBlocked,
  onReportUser,
  onBlockUser,
  onUnblockUser
}: {
  profileRecord: UserProfileRecord | null;
  profileUser: UserProfile;
  currentProfile: UserProfileRecord | null;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
  onAuthClick: () => void;
  onShowOwnProfile: () => void;
  onUpdateProfile: (updates: UserProfileUpdate) => Promise<UserProfileRecord>;
  travelPreferences: TravelPreferences | null;
  onUpdateTravelPreferences: (updates: TravelPreferencesUpdate) => Promise<TravelPreferences>;
  onUploadAvatar: (file: File) => Promise<UserProfileRecord>;
  onOpenTrip: (trip: Trip, shouldOpenConversation: boolean) => void | Promise<void>;
  trips: Trip[];
  userTripActions: UserTripActions | null;
  tribeMemberCount: number;
  isBlocked: boolean;
  onReportUser: (user: UserProfile) => void;
  onBlockUser: (user: UserProfile) => void;
  onUnblockUser: (user: UserProfile) => void | Promise<void>;
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
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={onShowOwnProfile}>Revenir à mon profil</button>
            <button className="inline-flex items-center gap-2 rounded-full border border-forest-200 px-4 py-2.5 text-sm font-bold text-forest-700" onClick={() => onReportUser(profileUser)}><Flag size={16} />Signaler</button>
            <button className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold ${isBlocked ? "border-forest-200 text-forest-700" : "border-red-200 text-red-700"}`} onClick={() => isBlocked ? onUnblockUser(profileUser) : onBlockUser(profileUser)}><UserX size={16} />{isBlocked ? "Débloquer" : "Bloquer"}</button>
          </div>
        )}
      </div>

      <ProfilePublicCard
        profileRecord={profile}
        profileUser={profileUser}
        isOwnProfile={isOwnProfile}
        createdTripsCount={createdTrips.length}
        tribeMemberCount={tribeMemberCount}
        onUpdateProfile={onUpdateProfile}
        travelPreferences={travelPreferences}
        onUpdateTravelPreferences={onUpdateTravelPreferences}
        onUploadAvatar={onUploadAvatar}
      />

      {!isOwnProfile && <section className="mt-8 rounded-[2rem] bg-white p-5 shadow-soft sm:p-8">
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
      </section>}
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
  preferred_destinations: string;
  preferred_activities: string;
  preferred_accommodation: string;
  food_preferences: string;
  group_preferences: string;
  personal_values: string;
  availability_periods: string;
  max_distance_km: string;
  preferred_group_size_min: string;
  preferred_group_size_max: string;
};

function profileRecordToForm(profile: UserProfileRecord, preferences?: TravelPreferences | null): ProfileFormState {
  return {
    display_name: profile.display_name ?? "",
    avatar_url: resolveProfileAvatarUrl(profile.avatar_url, profile.avatar_path) ?? "",
    city: profile.city ?? "",
    bio: profile.bio ?? "",
    age_range: profile.age_range ?? "",
    physical_level: profile.physical_level ?? "",
    budget_range: profile.budget_range ?? "",
    adventure_style: profile.adventure_style ?? "",
    preferred_ambiences: (profile.preferred_ambiences ?? []).join(", "),
    safety_preferences: (profile.safety_preferences ?? []).join(", "),
    badges: (profile.badges ?? []).join(", "),
    past_trips: String(profile.past_trips ?? 0),
    preferred_destinations: (preferences?.preferred_destinations ?? []).join(", "),
    preferred_activities: (preferences?.preferred_activities ?? []).join(", "),
    preferred_accommodation: (preferences?.preferred_accommodation ?? []).join(", "),
    food_preferences: (preferences?.food_preferences ?? []).join(", "),
    group_preferences: (preferences?.group_preferences ?? []).join(", "),
    personal_values: (preferences?.personal_values ?? []).join(", "),
    availability_periods: (preferences?.availability_periods ?? []).join(", "),
    max_distance_km: preferences?.max_distance_km?.toString() ?? "",
    preferred_group_size_min: preferences?.preferred_group_size_min?.toString() ?? "",
    preferred_group_size_max: preferences?.preferred_group_size_max?.toString() ?? ""
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

function profileFormToTravelPreferences(form: ProfileFormState): TravelPreferencesUpdate {
  const optionalNumber = (value: string) => {
    const parsed = Number(value);
    return value.trim() && Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null;
  };
  const optionalPositiveNumber = (value: string) => {
    const parsed = optionalNumber(value);
    return parsed && parsed > 0 ? parsed : null;
  };

  return {
    preferred_destinations: csvToList(form.preferred_destinations),
    preferred_activities: csvToList(form.preferred_activities),
    preferred_accommodation: csvToList(form.preferred_accommodation),
    food_preferences: csvToList(form.food_preferences),
    group_preferences: csvToList(form.group_preferences),
    personal_values: csvToList(form.personal_values),
    availability_periods: csvToList(form.availability_periods),
    max_distance_km: optionalNumber(form.max_distance_km),
    preferred_group_size_min: optionalPositiveNumber(form.preferred_group_size_min),
    preferred_group_size_max: optionalPositiveNumber(form.preferred_group_size_max)
  };
}

function ProfilePublicCard({
  profileRecord,
  profileUser,
  isOwnProfile,
  createdTripsCount,
  tribeMemberCount,
  onUpdateProfile,
  travelPreferences,
  onUpdateTravelPreferences,
  onUploadAvatar
}: {
  profileRecord: UserProfileRecord;
  profileUser: UserProfile;
  isOwnProfile: boolean;
  createdTripsCount: number;
  tribeMemberCount: number;
  onUpdateProfile: (updates: UserProfileUpdate) => Promise<UserProfileRecord>;
  travelPreferences: TravelPreferences | null;
  onUpdateTravelPreferences: (updates: TravelPreferencesUpdate) => Promise<TravelPreferences>;
  onUploadAvatar: (file: File) => Promise<UserProfileRecord>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<ProfileFormState>(() => profileRecordToForm(profileRecord, travelPreferences));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) setForm(profileRecordToForm(profileRecord, travelPreferences));
  }, [isEditing, profileRecord.avatar_path, profileRecord.avatar_url, profileRecord.id, profileRecord.updated_at, travelPreferences]);

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
      setForm(profileRecordToForm(nextProfile, travelPreferences));
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
      const [nextProfile, nextPreferences] = await Promise.all([
        onUpdateProfile(profileFormToUpdate(form)),
        onUpdateTravelPreferences(profileFormToTravelPreferences(form))
      ]);
      setForm(profileRecordToForm(nextProfile, nextPreferences));
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
          <p className="mt-1 font-semibold text-forest-500">{getProfileHandle(profileRecord)}</p>
          <p className={`mt-2 inline-flex items-center gap-2 text-xs font-bold ${isProfileOnline(profileRecord.last_seen_at) ? "text-emerald-700" : "text-forest-500"}`}><span className={`h-2.5 w-2.5 rounded-full ${isProfileOnline(profileRecord.last_seen_at) ? "bg-emerald-500" : "bg-forest-300"}`} />{isProfileOnline(profileRecord.last_seen_at) ? "En ligne" : "Déconnecté"}</p>
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
            <div className="mt-2 border-t border-forest-100 pt-5">
              <h3 className="text-xl font-semibold">Préférences de matching</h3>
              <p className="mt-1 text-sm text-forest-600">Facultatif. Ces informations privées servent uniquement à affiner tes Trips.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileTextarea label="Destinations préférées" hint="Ex : Valais, Bretagne, Italie" value={form.preferred_destinations} onChange={(value) => updateField("preferred_destinations", value)} />
              <ProfileTextarea label="Activités préférées" hint="Ex : randonnée, kayak, patrimoine" value={form.preferred_activities} onChange={(value) => updateField("preferred_activities", value)} />
              <ProfileTextarea label="Hébergements préférés" hint="Ex : gîte, refuge, hôtel" value={form.preferred_accommodation} onChange={(value) => updateField("preferred_accommodation", value)} />
              <ProfileTextarea label="Préférences alimentaires" hint="Ex : végétarien, halal, sans alcool" value={form.food_preferences} onChange={(value) => updateField("food_preferences", value)} />
              <ProfileTextarea label="Préférences de groupe" hint="Ex : petit groupe, groupe calme" value={form.group_preferences} onChange={(value) => updateField("group_preferences", value)} />
              <ProfileTextarea label="Valeurs et pratiques" hint="Uniquement ce que tu souhaites déclarer." value={form.personal_values} onChange={(value) => updateField("personal_values", value)} />
              <ProfileTextarea label="Disponibilités" hint="Ex : week-end, août, 2026-08-15" value={form.availability_periods} onChange={(value) => updateField("availability_periods", value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <ProfileInput label="Distance maximale (km)" type="number" value={form.max_distance_km} onChange={(value) => updateField("max_distance_km", value)} />
              <ProfileInput label="Groupe minimum" type="number" value={form.preferred_group_size_min} onChange={(value) => updateField("preferred_group_size_min", value)} />
              <ProfileInput label="Groupe maximum" type="number" value={form.preferred_group_size_max} onChange={(value) => updateField("preferred_group_size_max", value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary disabled:cursor-wait disabled:opacity-60" disabled={saving} onClick={saveProfile}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button className="btn-secondary" onClick={() => {
                setForm(profileRecordToForm(profileRecord, travelPreferences));
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
            <div className={`grid grid-cols-2 gap-3 ${isOwnProfile ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
              <Metric label="Trips passées" value={`${profileUser.past_trips}`} />
              <Metric label="Trips publiés" value={`${createdTripsCount}`} />
              {isOwnProfile && <Metric label="Ma tribu" value={`${tribeMemberCount}`} />}
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
          "Les badges vérifiés sont réservés aux profils réellement contrôlés",
          "Les groupes sont limités",
          "Les activités à risque doivent être encadrées",
          "Les utilisateurs peuvent signaler et bloquer un comportement",
          "Chaque Trip peut avoir un référent",
          "Le niveau physique est indiqué clairement",
          "Des groupes plus rassurants peuvent être choisis",
          "Des groupes femmes-only peuvent exister",
          "Signalements de chat transmis à la modération"
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

function SettingsPage({ profile, accessToken, blocks, onRequireAuth, onProfileUpdated, onSignOut, onUnblock, onDeactivate }: { profile: UserProfileRecord | null; accessToken?: string; blocks: UserBlock[]; onRequireAuth: () => void; onProfileUpdated: (profile: UserProfileRecord) => void; onSignOut: () => void | Promise<void>; onUnblock: (blockedId: string) => void | Promise<void>; onDeactivate: () => void | Promise<void> }) {
  const [language, setLanguage] = useState(profile?.preferred_language ?? "fr");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  if (!profile || !accessToken) {
    return <section className="container-page py-10"><EmptyState title="Connecte-toi pour ouvrir les paramètres" text="La langue et la sécurité du compte sont liées à ton profil." /><div className="mt-5 text-center"><button className="btn-primary" onClick={onRequireAuth}>Se connecter</button></div></section>;
  }

  const saveLanguage = async () => {
    setSaving(true);
    try {
      const nextProfile = await updateProfile(profile.id, { preferred_language: language }, accessToken);
      onProfileUpdated(nextProfile);
      document.documentElement.lang = language;
      setFeedback("Préférence de langue enregistrée. Les traductions complètes seront activées progressivement.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Langue impossible à enregistrer.");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (password.length < 8 || password !== passwordConfirmation) {
      setFeedback("Utilise au moins 8 caractères et saisis deux fois le même mot de passe.");
      return;
    }
    setSaving(true);
    try {
      await updatePassword(password, accessToken);
      setPassword("");
      setPasswordConfirmation("");
      setFeedback("Mot de passe modifié.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Mot de passe impossible à modifier.");
    } finally {
      setSaving(false);
    }
  };

  const downloadData = async () => {
    setSaving(true);
    setFeedback("");
    try {
      const data = await exportMyData(accessToken);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `tribu-nature-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setFeedback("Export préparé.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Export impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="container-page py-10">
      <p className="pill">Paramètres</p><h1 className="mt-3 text-4xl font-semibold">Mon compte</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Langue"><label className="grid gap-2 text-sm font-bold">Langue préférée<select className="rounded-lg border border-forest-100 bg-forest-50 p-3" value={language} onChange={(event) => setLanguage(event.target.value)}><option value="fr">Français</option><option value="en">English</option><option value="es">Español</option><option value="de">Deutsch</option><option value="it">Italiano</option><option value="ar">العربية</option></select></label><button className="btn-primary mt-4" disabled={saving} onClick={saveLanguage}><Languages className="mr-2 inline" size={17} />Enregistrer</button></Panel>
        <Panel title="Changer de mot de passe"><div className="grid gap-3"><input className="rounded-lg border border-forest-100 bg-forest-50 p-3" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nouveau mot de passe" /><input className="rounded-lg border border-forest-100 bg-forest-50 p-3" type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} placeholder="Confirmer le mot de passe" /><button className="btn-primary" disabled={saving} onClick={changePassword}>Modifier le mot de passe</button></div></Panel>
        <Panel title="Données et session"><div className="grid gap-3"><button className="btn-secondary" disabled={saving} onClick={downloadData}>Exporter mes données</button><button className="btn-secondary inline-flex items-center justify-center gap-2" onClick={onSignOut}><LogOut size={17} />Déconnexion</button></div></Panel>
        <Panel title="Utilisateurs bloqués">{blocks.length > 0 ? <div className="grid gap-2">{blocks.map((block, index) => <div className="flex items-center justify-between gap-3 rounded-lg bg-forest-50 p-3" key={block.id}><span className="text-sm font-semibold">Utilisateur bloqué {index + 1}</span><button className="rounded-full bg-white px-3 py-2 text-xs font-bold" onClick={() => onUnblock(block.blocked_id)}>Débloquer</button></div>)}</div> : <p className="text-sm text-forest-700">Aucun utilisateur bloqué.</p>}</Panel>
      </div>
      <section className="mt-6 rounded-[1.5rem] border border-red-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-red-800">Supprimer mon compte</h2>
        <p className="mt-2 text-sm leading-6 text-forest-700">Ton profil sera désactivé et anonymisé, tes Trips publics seront fermés et tu quitteras les conversations. Cette action nécessite une confirmation.</p>
        {!showDeleteConfirmation ? <button className="mt-4 rounded-full border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700" onClick={() => setShowDeleteConfirmation(true)}>Commencer la suppression</button> : <div className="mt-4 grid max-w-lg gap-3"><label className="grid gap-2 text-sm font-bold">Écris SUPPRIMER pour confirmer<input className="rounded-lg border border-red-200 bg-red-50 p-3 font-normal" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} /></label><div className="flex gap-2"><button className="btn-secondary" onClick={() => { setShowDeleteConfirmation(false); setDeleteConfirmation(""); }}>Annuler</button><button className="rounded-full bg-red-700 px-5 py-3 font-bold text-white disabled:opacity-40" disabled={deleteConfirmation !== "SUPPRIMER" || saving} onClick={async () => { setSaving(true); setFeedback(""); try { await onDeactivate(); } catch (error) { setFeedback(error instanceof Error ? error.message : "Suppression impossible."); setSaving(false); } }}>Désactiver et anonymiser</button></div></div>}
      </section>
      {feedback && <p className="mt-5 rounded-xl bg-white p-4 font-semibold text-forest-700">{feedback}</p>}
    </section>
  );
}

function LegalPage({ kind }: { kind: "cgu" | "privacy" }) {
  const isPrivacy = kind === "privacy";
  const sections = isPrivacy ? [
    ["Données traitées", "Compte, profil public, préférences de voyage, Trips, relations sociales, messages, médias, données de connexion et demandes de contact."],
    ["Finalités", "Créer le compte, personnaliser les propositions, permettre les échanges, sécuriser la communauté, traiter les demandes et améliorer la beta."],
    ["Visibilité", "L'e-mail et les réglages de compte restent privés. Le pseudo, la photo, la ville, la bio et les préférences choisies composent le profil visible par les membres connectés."],
    ["Conservation", "Les données restent liées au compte tant qu'il est actif. Les Trips datés expirent après leur date de fin. Les durées détaillées seront précisées avant la sortie commerciale."],
    ["Prestataires", "L'hébergement technique et l'authentification reposent actuellement sur Supabase. Des services cartographiques et de contenu peuvent également être sollicités."],
    ["Tes droits", "Tu peux demander l'accès, la rectification, l'effacement, la limitation ou la portabilité via la page Nous contacter. Tu peux aussi saisir la CNIL." ]
  ] : [
    ["Objet", "Tribu Nature est une beta sociale qui permet de proposer, découvrir et organiser des idées de voyage entre membres."],
    ["Compte", "Tu dois fournir des informations exactes, protéger ton mot de passe et utiliser un pseudo ou un nom public respectueux."],
    ["Trips et réservations", "Les membres organisent les dates, transports, hébergements et activités. Tribu Nature n'est pas une agence de voyages et aucune réservation n'est conclue automatiquement dans l'app."],
    ["Comportement", "Harcèlement, discrimination, fraude, contenu illicite ou dangereux et usurpation d'identité sont interdits. Un compte ou un contenu peut être modéré."],
    ["Contenus", "Tu restes responsable des textes et photos publiés et confirmes disposer des droits nécessaires pour les partager avec le groupe."],
    ["Sécurité", "Chaque membre doit vérifier les conditions météo, son niveau, les assurances et l'encadrement professionnel requis avant une activité."],
    ["Beta", "Le service évolue et peut connaître des interruptions. Ces conditions provisoires devront être validées juridiquement avant un lancement commercial." ]
  ];
  return (
    <section className="container-page py-10"><p className="pill">{isPrivacy ? "Vie privée" : "Conditions"}</p><h1 className="mt-3 text-4xl font-semibold">{isPrivacy ? "Politique de confidentialité" : "Conditions générales d'utilisation"}</h1><p className="mt-3 max-w-3xl text-forest-700">Version beta du 30 juin 2026. Document d'information à faire valider avant une exploitation commerciale.</p><div className="mt-8 grid gap-4">{sections.map(([title, text]) => <section className="rounded-[1.25rem] bg-white p-5 shadow-sm" key={title}><h2 className="text-xl font-semibold">{title}</h2><p className="mt-2 leading-7 text-forest-700">{text}</p></section>)}</div></section>
  );
}

function AboutPage() {
  return (
    <VideoPageBackground source="videos/about-background.m4v" label="Des randonneurs avancent ensemble dans une gorge naturelle">
      <section className="container-page flex min-h-[calc(100vh-8rem)] items-center py-12 text-white sm:py-16">
        <div className="max-w-5xl">
          <p className="inline-flex rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-sm font-bold backdrop-blur">À propos</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">Faire passer une envie de voyage du « peut-être » au « on y va ».</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8">Tribu Nature est née d'une idée simple : beaucoup de personnes veulent partir, mais pas forcément seules. Nous créons le cadre qui permet de trouver le bon groupe et de commencer.</p>
          <div className="mt-10 grid gap-3 md:grid-cols-3">
            <AboutValue eyebrow="Mission" title="Créer le bon groupe" text="Réunir des profils compatibles autour d'un projet concret et humain." />
            <AboutValue eyebrow="Produit" title="Des Trips réelles" text="Passer d'une idée de destination à une organisation construite ensemble." />
            <AboutValue eyebrow="Cap" title="Voyager mieux" text="Valoriser la nature, les acteurs locaux et les groupes à taille humaine." />
          </div>
        </div>
      </section>
    </VideoPageBackground>
  );
}

function ContactPage({ profile, accessToken }: { profile: UserProfileRecord | null; accessToken?: string }) {
  const [email, setEmail] = useState(profile?.email ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);
  return (
    <VideoPageBackground source="videos/contact-background.m4v" label="Une personne contemple une cascade au cœur de la nature">
      <section className="container-page grid min-h-[calc(100vh-8rem)] items-center gap-8 py-10 lg:grid-cols-[0.8fr_1.2fr] lg:py-14">
        <div className="max-w-xl text-white">
          <p className="inline-flex rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-sm font-bold backdrop-blur">Nous contacter</p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">Parlons de ton expérience.</h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-white/85 sm:text-lg">Une question, une idée ou un problème pendant la beta ? Écris-nous directement. Chaque retour nous aide à rendre les prochains départs plus simples.</p>
        </div>
        <form
          className="grid gap-4 rounded-lg bg-white/95 p-5 text-forest-900 shadow-2xl backdrop-blur sm:p-7"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!email.includes("@") || !subject.trim() || !body.trim()) { setFeedback("Complète tous les champs."); return; }
            setSending(true);
            try {
              await sendContactMessage({ userId: profile?.id, email, subject, body }, accessToken);
              setSubject("");
              setBody("");
              setFeedback("Message envoyé. Merci pour ton retour.");
            } catch (error) {
              setFeedback(error instanceof Error ? error.message : "Message impossible à envoyer.");
            } finally {
              setSending(false);
            }
          }}
        >
          <label className="grid gap-2 text-sm font-bold">Email<input className="rounded-lg border border-forest-100 bg-forest-50 p-3 font-normal outline-none focus:ring-2 focus:ring-forest-600" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
          <label className="grid gap-2 text-sm font-bold">Sujet<input className="rounded-lg border border-forest-100 bg-forest-50 p-3 font-normal outline-none focus:ring-2 focus:ring-forest-600" value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-bold">Message<textarea className="min-h-36 resize-y rounded-lg border border-forest-100 bg-forest-50 p-3 font-normal outline-none focus:ring-2 focus:ring-forest-600" value={body} onChange={(event) => setBody(event.target.value)} /></label>
          <button className="btn-primary" disabled={sending} type="submit"><Mail className="mr-2 inline" size={18} />{sending ? "Envoi..." : "Envoyer"}</button>
          {feedback && <p className="rounded-lg bg-forest-50 p-3 text-sm font-semibold">{feedback}</p>}
        </form>
      </section>
    </VideoPageBackground>
  );
}

function VideoPageBackground({ source, label, children }: { source: string; label: string; children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden bg-forest-900">
      <video className="absolute inset-0 -z-20 h-full w-full object-cover object-center motion-reduce:hidden" autoPlay loop muted playsInline preload="metadata" aria-label={label}>
        <source src={`${import.meta.env.BASE_URL}${source}`} type="video/mp4" />
      </video>
      <div className="absolute inset-0 -z-10 bg-forest-900/68" />
      {children}
    </div>
  );
}

function AboutValue({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <article className="rounded-lg border border-white/20 bg-white/12 p-5 backdrop-blur-md">
      <p className="text-xs font-bold uppercase text-white/65">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-white/80">{text}</p>
    </article>
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

function ActivityCard({ activity, pexelsPhotos }: { activity: Activity | MockLocalActivity; pexelsPhotos: PexelsActivityPhoto[] }) {
  const display = "duration" in activity
    ? {
        name: activity.name,
        category: activity.category,
        duration: activity.duration,
        price: activity.estimated_price === 0 ? "gratuit" : `${activity.estimated_price} €`,
        physicalLevel: activity.physical_level,
        risk: activity.risk,
        weatherDependent: !activity.weather_compatible.includes("pluie"),
        groupFriendly: activity.group_friendly,
        bookingRequired: activity.booking_required,
        supervisionRequired: activity.risk === "moyen" || activity.risk === "élevé",
        description: activity.description,
        image: activity.image,
        images: activity.images ?? [activity.image],
        mapUrl: activity.lat && activity.lng ? `https://www.google.com/maps/search/?api=1&query=${activity.lat},${activity.lng}` : "",
        referenceUrl: activity.external_url ?? "",
        referenceLabel: activity.external_url ? referenceLabel(activity.source) : ""
      }
    : {
        name: activity.name,
        category: activity.category,
        duration: activity.duration_estimate,
        price: activity.price_min === 0 ? "gratuit" : `${activity.price_min} à ${activity.price_max} €`,
        physicalLevel: activity.physical_level,
        risk: activity.risk_level,
        weatherDependent: activity.weather_dependency,
        groupFriendly: activity.group_size_max > 1,
        bookingRequired: activity.booking_required,
        supervisionRequired: activity.professional_supervision_required,
        description: "",
        image: "",
        images: [],
        mapUrl: `https://www.google.com/maps/search/?api=1&query=${activity.lat},${activity.lng}`,
        referenceUrl: "",
        referenceLabel: ""
      };
  const photos = getActivityPhotos(display.name, display.category, display.image, display.images, pexelsPhotos);
  const highlights = getActivityHighlights(display);
  const hook = getActivityHook(display.name, display.category, display.description);
  const creditedPhoto = photos.find((photo) => photo.pexelsUrl);

  return (
    <article className="group w-[86vw] max-w-[460px] shrink-0 snap-start overflow-hidden rounded-lg bg-white shadow-soft transition duration-300 hover:-translate-y-1">
      <div className="relative grid h-64 grid-cols-4 grid-rows-2 gap-1 overflow-hidden bg-forest-100 sm:h-72">
        {photos.map((photo, index) => {
          const layoutClass = `overflow-hidden ${index === 0 ? "col-span-2 row-span-2" : index === 3 ? "col-span-2" : "col-span-1"}`;
          const image = <img className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" loading="lazy" src={photo.src} alt={photo.alt || `${display.name}, vue ${index + 1}`} />;
          return <div className={layoutClass} key={`${photo.src}-${index}`}>{image}</div>;
        })}
        <span className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1.5 text-xs font-bold text-forest-900 shadow-sm backdrop-blur">
          {display.category}
        </span>
        {creditedPhoto && (
          <span className="absolute bottom-3 left-3 max-w-[55%] truncate rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-forest-900 backdrop-blur">
            Pexels · {creditedPhoto.photographer}
          </span>
        )}
        <span className="absolute bottom-3 right-3 rounded-full bg-forest-900/80 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
          4 photos
        </span>
      </div>
      <div className="p-5">
        <h3 className="text-2xl font-semibold leading-tight text-forest-900">{display.name}</h3>
        <p className="mt-2 min-h-12 text-sm leading-6 text-forest-700">{hook}</p>

        <div className="mt-5 grid grid-cols-3 divide-x divide-forest-100 rounded-lg bg-forest-50 py-3">
          <ActivityQuickFact icon={<Clock3 size={16} />} label="Durée" value={display.duration} />
          <ActivityQuickFact icon={<Euro size={16} />} label="Prix" value={display.price} />
          <ActivityQuickFact icon={<Mountain size={16} />} label="Niveau" value={display.physicalLevel} />
        </div>

        <div className="mt-4 flex min-h-8 flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-forest-700">
          {highlights.map((highlight) => (
            <span className="inline-flex items-center gap-1.5" key={highlight.label}>
              {highlight.weather ? <CloudSun size={16} /> : <CheckCircle2 size={16} />}
              {highlight.label}
            </span>
          ))}
        </div>

        {(display.mapUrl || display.referenceUrl) && (
          <div className="mt-5 flex gap-2 border-t border-forest-100 pt-4">
            {display.mapUrl && (
              <a className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-forest-200 px-4 py-2.5 text-sm font-bold text-forest-900 transition hover:bg-forest-50" href={display.mapUrl} target="_blank" rel="noreferrer">
                <MapPin size={17} />
                Carte
              </a>
            )}
            {display.referenceUrl && (
              <a
                aria-label={display.referenceLabel}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-forest-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-forest-800"
                href={display.referenceUrl}
                target="_blank"
                rel="noreferrer"
                title={display.referenceLabel}
              >
                <ExternalLink size={17} />
                Référence
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function ActivityQuickFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 px-2 text-center">
      <span className="mx-auto flex items-center justify-center gap-1 text-forest-600">{icon}<span className="hidden text-[10px] font-bold uppercase sm:inline">{label}</span></span>
      <strong className="mt-1 block truncate text-xs text-forest-900 sm:text-sm">{value}</strong>
    </div>
  );
}

function getActivityHook(name: string, category: string, description: string) {
  const searchable = normalizeUiText(`${name} ${category}`);
  const cleanDescription = description.trim();
  if (cleanDescription && !normalizeUiText(cleanDescription).includes("l'app pourra l'enrichir")) {
    return cleanDescription.length > 125 ? `${cleanDescription.slice(0, 122).trim()}...` : cleanDescription;
  }
  if (/therm|spa|bien-etre|detente/.test(searchable)) return "Le moment détente qui fait du bien après une journée dehors.";
  if (/parapente|vol|aerien/.test(searchable)) return "L'option grand frisson pour repartir avec un souvenir fort.";
  if (/rando|marche|sentier|trek|refuge|lac/.test(searchable)) return "Une belle sortie pour marcher ensemble et prendre le temps de regarder autour.";
  if (/rafting|canoe|kayak|riviere|eau vive|paddle/.test(searchable)) return "Une parenthèse sur l'eau pour partager de l'énergie et quelques éclats de rire.";
  if (/ferme|producteur/.test(searchable)) return "Une rencontre simple et authentique avec celles et ceux qui font vivre le territoire.";
  if (/repas|diner|restaurant|fromage|degustation|marche/.test(searchable)) return "Un moment convivial pour découvrir le territoire autour d'une bonne table.";
  if (/cheval|equestre/.test(searchable)) return "Une façon douce et dépaysante d'explorer les paysages autrement.";
  if (/village|culture|patrimoine|musee/.test(searchable)) return "Une immersion locale à vivre tranquillement au rythme du lieu.";
  return "Une expérience à partager pour donner une vraie saveur au voyage.";
}

function getActivityHighlights(display: {
  bookingRequired: boolean;
  supervisionRequired: boolean;
  weatherDependent: boolean;
  groupFriendly: boolean;
  risk: string;
}) {
  const highlights: Array<{ label: string; weather?: boolean }> = [];
  if (display.supervisionRequired) highlights.push({ label: "Encadrement conseillé" });
  if (display.bookingRequired) highlights.push({ label: "Réservation conseillée" });
  if (display.weatherDependent) highlights.push({ label: "Météo à vérifier", weather: true });
  if (!highlights.length && display.groupFriendly) highlights.push({ label: "Idéal en groupe" });
  if (highlights.length < 2 && normalizeUiText(display.risk) === "faible") highlights.push({ label: "Risque faible" });
  return highlights.slice(0, 2);
}

type ActivityExperiencePhoto = {
  src: string;
  alt: string;
  photographer?: string;
  pexelsUrl?: string;
};

function buildPexelsActivityQuery(activity: { name: string; category: string }, destination: string) {
  const searchable = normalizeUiText(`${activity.name} ${activity.category}`);
  const destinationParts = destination.split(/[>,]/).map((part) => part.trim()).filter(Boolean);
  const preciseDestination = destinationParts.slice(0, 2).join(" ");
  const mountainHint = /luchon|pyrenees|aspe|lescun|cauterets|gavarnie|louron|bareges|ax-les-thermes/.test(normalizeUiText(destination)) ? "Pyrénées" : "montagne";

  if (searchable.includes("hospice de france")) return "Hospice de France Pyrénées randonnée";
  if (searchable.includes("superbagneres")) return "Luchon Superbagnères panorama Pyrénées";
  if (/therm|spa|bien-etre|balneo|bains chaud/.test(searchable)) return `${preciseDestination} thermes spa montagne`.trim();
  if (/parapente|vol|aerien/.test(searchable)) return `${preciseDestination} parapente ${mountainHint}`.trim();
  if (/rando|marche|sentier|trek|refuge|lac/.test(searchable)) return `${activity.name} ${mountainHint} randonnée`.trim();
  if (/rafting|canoe|kayak|riviere|eau vive|paddle/.test(searchable)) return `${preciseDestination} ${activity.category} aventure eau`.trim();
  if (/ferme|producteur|fromage|degustation/.test(searchable)) return `${preciseDestination} ferme produits locaux`.trim();
  if (/repas|diner|restaurant|gastronomie/.test(searchable)) return `${preciseDestination} cuisine locale restaurant`.trim();
  if (/cheval|equestre/.test(searchable)) return `${preciseDestination} cheval paysage`.trim();
  return `${activity.name} ${preciseDestination}`.trim().slice(0, 120);
}

function getActivityPhotos(name: string, category: string, primaryImage: string, activityImages: string[], pexelsPhotos: PexelsActivityPhoto[]): ActivityExperiencePhoto[] {
  const searchable = normalizeUiText(`${name} ${category}`);
  const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=82`;
  const pools = {
    mountain: [image("photo-1551632811-561732d1e306"), image("photo-1464822759023-fed622ff2c3b"), image("photo-1506744038136-46273834b3fb"), image("photo-1470770841072-f978cf4d019e")],
    wellness: [image("photo-1540555700478-4be289fbecef"), image("photo-1600334089648-b0d9d3028eb2"), image("photo-1544161515-4ab6ce6db874"), image("photo-1570172619644-dfd03ed5d881")],
    aerial: [image("photo-1500534314209-a25ddb2bd429"), image("photo-1464822759023-fed622ff2c3b"), image("photo-1506744038136-46273834b3fb"), image("photo-1470770841072-f978cf4d019e")],
    water: [image("photo-1508166466920-f65aa51f727c"), image("photo-1544550285-f813152fb2fd"), image("photo-1500530855697-b586d89ba3ee"), image("photo-1507525428034-b723cf961d3e")],
    farm: [image("photo-1500595046743-cd271d694d30"), image("photo-1486297678162-eb2a19b0a32d"), image("photo-1452195100486-9cc805987862"), image("photo-1504674900247-0877df9cc836")],
    food: [image("photo-1551218808-94e220e084d2"), image("photo-1504674900247-0877df9cc836"), image("photo-1414235077428-338989a2e8c0"), image("photo-1547592180-85f173990554")],
    horse: [image("photo-1553284965-83fd3e82fa5a"), image("photo-1598974357801-cbca100e65d3"), image("photo-1464822759023-fed622ff2c3b"), image("photo-1500534314209-a25ddb2bd429")],
    culture: [image("photo-1519677100203-a0e668c92439"), image("photo-1500534314209-a25ddb2bd429"), image("photo-1499856871958-5b9627545d1a"), image("photo-1500530855697-b586d89ba3ee")],
    forest: [image("photo-1448375240586-882707db888b"), image("photo-1551632811-561732d1e306"), image("photo-1470770841072-f978cf4d019e"), image("photo-1500530855697-b586d89ba3ee")]
  };
  const contextual = /therm|spa|bien-etre|detente/.test(searchable)
    ? pools.wellness
    : /parapente|vol|aerien/.test(searchable)
      ? pools.aerial
      : /rafting|canoe|kayak|riviere|eau vive|paddle|plage|surf/.test(searchable)
        ? pools.water
        : /ferme|producteur/.test(searchable)
          ? pools.farm
          : /repas|diner|restaurant|fromage|degustation|marche/.test(searchable)
            ? pools.food
            : /cheval|equestre/.test(searchable)
              ? pools.horse
              : /village|culture|patrimoine|musee/.test(searchable)
                ? pools.culture
                : /foret/.test(searchable)
                  ? pools.forest
                  : pools.mountain;
  const preferredImages = Array.from(new Set([...(activityImages ?? []), primaryImage].filter(Boolean)));
  const imageOrder = preferredImages.length > 0 ? [...preferredImages, ...contextual] : contextual;
  const fallbackPhotos = Array.from(new Set(imageOrder.filter(Boolean))).map((src) => ({ src, alt: `${name}, aperçu de l'expérience` }));
  const apiPhotos = pexelsPhotos.map((photo) => ({
    src: photo.src,
    alt: photo.alt || name,
    photographer: photo.photographer,
    pexelsUrl: photo.pexelsUrl
  }));
  return [...apiPhotos, ...fallbackPhotos].filter((photo, index, allPhotos) => allPhotos.findIndex((candidate) => candidate.src === photo.src) === index).slice(0, 4);
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

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  danger = false,
  onCancel,
  onConfirm
}: {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-forest-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-xl">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-3 leading-7 text-forest-700">{description}</p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button className="btn-secondary" disabled={isConfirming} onClick={onCancel}>Retour</button>
          <button
            className={`inline-flex items-center justify-center rounded-full px-5 py-3 font-semibold text-white transition disabled:opacity-60 ${danger ? "bg-red-600 hover:bg-red-700" : "bg-forest-800 hover:bg-forest-900"}`}
            disabled={isConfirming}
            onClick={async () => {
              setIsConfirming(true);
              try {
                await onConfirm();
              } finally {
                setIsConfirming(false);
              }
            }}
          >
            {isConfirming ? "Confirmation..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileBottomNav({ page, go, onCreateTrip }: { page: Page; go: (page: Page) => void; onCreateTrip: () => void }) {
  const items: Array<{ page: Page; label: string; icon: typeof Home }> = [
    { page: "dashboard", label: "Destination", icon: Compass },
    { page: "my-trips", label: "Mes Trips", icon: CalendarDays },
    { page: "communaute", label: "Tribu", icon: Users },
    { page: "profil", label: "Profil", icon: UserRound }
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[60] border-t border-forest-100 bg-white/95 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(12,43,34,0.08)] backdrop-blur lg:hidden" aria-label="Navigation principale">
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end">
        {items.slice(0, 2).map((item) => {
          const Icon = item.icon;
          return <MobileNavButton key={item.page} active={page === item.page} icon={Icon} label={item.label} onClick={() => go(item.page)} />;
        })}
        <button className="mx-auto -mt-7 grid h-14 w-14 place-items-center rounded-full bg-forest-900 text-white shadow-xl" onClick={onCreateTrip} aria-label="Créer un Trip">
          <Plus size={25} />
        </button>
        {items.slice(2).map((item) => {
          const Icon = item.icon;
          return <MobileNavButton key={item.page} active={page === item.page} icon={Icon} label={item.label} onClick={() => go(item.page)} />;
        })}
      </div>
    </nav>
  );
}

function MobileNavButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Home; label: string; onClick: () => void }) {
  return (
    <button className={`flex min-w-0 flex-col items-center gap-1 px-1 py-1 text-[10px] font-bold ${active ? "text-forest-900" : "text-forest-500"}`} onClick={onClick}>
      <Icon size={20} strokeWidth={active ? 2.6 : 2} />
      <span className="truncate">{label}</span>
    </button>
  );
}

function Footer({ go }: { go: (page: Page) => void }) {
  return (
    <footer className="hidden border-t border-forest-100 bg-white lg:block">
      <div className="container-page grid gap-6 py-8 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="font-semibold">Tribu Nature</p>
          <p className="mt-1 text-sm text-forest-700">Une plateforme sociale intelligente qui transforme une envie individuelle de nature en aventure collective organisée.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["Destination", "dashboard", Compass],
            ["À propos", "about", Info],
            ["Contact", "contact", Mail],
            ["CGU", "cgu", FileText],
            ["Confidentialité", "privacy", ShieldCheck],
            ["Paramètres", "settings", Settings]
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
