import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import {
  BadgeCheck,
  CalendarDays,
  Compass,
  HeartHandshake,
  Home,
  Menu,
  MessageCircle,
  Mountain,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  X
} from "lucide-react";
import { activities, destination, members, mockLocalActivities, mockMembers, providers, reviews, trips } from "./data";
import type { Activity, MockLocalActivity, OnboardingProfile, Trip, UserProfile } from "./types";

type Page = "landing" | "dashboard" | "create-trip" | "trip" | "conversation" | "communaute" | "profil" | "prestataires" | "securite";

type Conversation = {
  id: string;
  trip: Trip;
  participants: UserProfile[];
  createdAt: string;
  messages: {
    id: string;
    author: string;
    content: string;
    time: string;
    system?: boolean;
  }[];
};

const navItems: { page: Page; label: string }[] = [
  { page: "dashboard", label: "Trips compatibles" },
  { page: "communaute", label: "Tribu" },
  { page: "profil", label: "Profil utilisateur" }
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

type ResultFilterKey = "localisation" | "dates" | "budget" | "destination" | "ambiance" | "groupe" | "niveau" | "plus";

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

const resultFilterOptions: Record<Exclude<ResultFilterKey, "dates" | "destination">, string[]> = {
  localisation: ["Départ Bordeaux", "Départ Paris", "Départ Lyon", "Départ Toulouse", "30 km max", "100 km max", "300 km max"],
  budget: ["Moins de 100 €", "100 à 200 €", "200 à 350 €", "350 à 500 €", "500 € et plus"],
  ambiance: ["Calme & déconnexion", "Sport & dépassement", "Découverte locale", "Fun & aventure douce", "Contemplatif", "Premium & confort", "Spirituel / introspectif"],
  groupe: ["18-25", "25-35", "35-45", "45+", "Groupe mixte", "Groupe women-only", "Groupe homme uniquement", "Petit groupe : 3 à 5 personnes", "Groupe moyen : 6 à 8 personnes", "Grand groupe : 9 personnes et plus"],
  niveau: ["Débutant", "Intermédiaire", "Sportif", "Très encadré", "Autonome", "Activités à faible risque", "Activités encadrées par un professionnel"],
  plus: ["Repas halal souhaité", "Repas végétarien souhaité", "Pas d'alcool dans le groupe", "Pauses personnelles respectées", "Valeurs similaires", "Groupe calme et respectueux", "Hébergement simple", "Gîte / refuge", "Hôtel confortable", "Tente / bivouac", "Sécurité renforcée", "Profils vérifiés uniquement"]
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

  const availableTrips = [...communityTrips, ...trips];
  const selectedTrip = availableTrips.find((trip) => trip.id === selectedTripId) ?? availableTrips[0] ?? trips[0];
  const currentUser = members[0];
  const validatedMembers = useMemo(() => getTripMembers(selectedTrip), [selectedTrip]);
  const go = (next: Page) => {
    setPage(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openTrip = (id: string) => {
    setSelectedTripId(id);
    go("trip");
  };
  const publishCommunityTrip = (trip: Trip) => {
    setCommunityTrips((prev) => [trip, ...prev]);
    setSelectedTripId(trip.id);
    go("dashboard");
  };
  const joinTrip = (trip: Trip) => {
    const confirmedMembers = getTripMembers(trip);
    const participants = [currentUser, ...confirmedMembers.filter((member) => member.id !== currentUser.id)];
    setConversation({
      id: `conversation-${trip.id}`,
      trip,
      participants,
      createdAt: "Maintenant",
      messages: [
        {
          id: "system-1",
          author: "Tribu Nature",
          content: `Conversation créée pour ${trip.title} avec les membres qui ont validé la Trip.`,
          time: "maintenant",
          system: true
        },
        {
          id: "message-1",
          author: "Léa",
          content: "Bienvenue dans le groupe. On peut commencer par confirmer le rythme, le transport et les activités qu'on garde.",
          time: "maintenant"
        }
      ]
    });
    setSelectedTripId(trip.id);
    go("conversation");
  };

  return (
    <div className="min-h-screen bg-cream text-forest-900">
      <Header page={page} go={go} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <main>
        {page === "landing" && <Landing go={go} openTrip={openTrip} />}
        {page === "dashboard" && <Dashboard trips={availableTrips} generatedMode={false} isGenerating={false} openTrip={openTrip} onCreateTrip={() => go("create-trip")} />}
        {page === "create-trip" && <CreateTripPage proposerName={currentUser.name} onPublish={publishCommunityTrip} />}
        {page === "trip" && <TripDetail trip={selectedTrip} validatedMembers={validatedMembers} joinTrip={joinTrip} />}
        {page === "conversation" && <ConversationPage conversation={conversation} go={go} />}
        {page === "communaute" && <Community currentUser={currentUser} trips={availableTrips} />}
        {page === "profil" && <Profile />}
        {page === "prestataires" && <Providers />}
        {page === "securite" && <Safety />}
      </main>
      <Footer go={go} />
    </div>
  );
}

function Header({
  page,
  go,
  menuOpen,
  setMenuOpen
}: {
  page: Page;
  go: (page: Page) => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
}) {
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
          {navItems.map((item) => (
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
          <button className="btn-primary py-2" onClick={() => go("create-trip")}>Créer une Trip</button>
        </div>
        <button className="rounded-lg border border-forest-100 bg-white p-2 lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>
      {menuOpen && (
        <div className="container-page border-t border-forest-100 py-3 lg:hidden">
          <div className="grid gap-2">
            {[...navItems, { page: "create-trip" as Page, label: "Créer une Trip" }].map((item) => (
              <button key={item.page} className="rounded-lg bg-white px-4 py-3 text-left font-medium" onClick={() => go(item.page)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

function Landing({ go, openTrip }: { go: (page: Page) => void; openTrip: (id: string) => void }) {
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
            {["Exprime ton envie", "Découvre des personnes compatibles", "Rejoins une Trip", "Vote pour les activités", "Pars en sécurité"].map((step, index) => (
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
        <TripGrid trips={trips.slice(0, 3)} openTrip={openTrip} />
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
        <p className="mt-3 max-w-2xl text-forest-700">Quelques choix simples suffisent. L'app s'occupe ensuite de proposer une Trip et des personnes compatibles.</p>
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
  onPublish
}: {
  proposerName: string;
  onPublish: (trip: Trip) => void;
}) {
  const [title, setTitle] = useState("Week-end nature en Vallée d'Aspe");
  const [destinationText, setDestinationText] = useState("Vallée d'Aspe");
  const [duration, setDuration] = useState("Week-end");
  const [budget, setBudget] = useState("200 à 350 €");
  const [level, setLevel] = useState("Facile");
  const [groupSize, setGroupSize] = useState("Petit groupe : 3 à 5 personnes");
  const [groupType, setGroupType] = useState("Groupe mixte");
  const [brief, setBrief] = useState("Je veux proposer une aventure simple, nature et conviviale, avec un petit groupe qui aime marcher tranquillement, découvrir le local et partager un bon moment.");
  const [coverUrl, setCoverUrl] = useState("");
  const [selectedZones, setSelectedZones] = useState<string[]>(["Nouvelle-Aquitaine"]);
  const [ambiences, setAmbiences] = useState<string[]>(["Calme & déconnexion", "Découverte locale"]);
  const [activitiesWanted, setActivitiesWanted] = useState<string[]>(["Randonnée", "Ferme locale", "Restaurant local"]);
  const [groupPreferences, setGroupPreferences] = useState<string[]>(["Profils vérifiés uniquement", "Groupe calme et respectueux"]);
  const [customActivity, setCustomActivity] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const previewTrip = buildCommunityTrip({
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
    brief,
    coverUrl
  });
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

  return (
    <section className="container-page py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="pill">Créer une Trip</p>
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
                <span className="text-sm font-semibold text-forest-700">Titre de la Trip</span>
                <input className="rounded-lg border border-forest-100 bg-forest-50 px-4 py-3 outline-none focus:ring-2 focus:ring-forest-600" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Donne un nom à ton aventure" />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-forest-700">Destination précise</span>
                <input className="rounded-lg border border-forest-100 bg-forest-50 px-4 py-3 outline-none focus:ring-2 focus:ring-forest-600" value={destinationText} onChange={(event) => setDestinationText(event.target.value)} placeholder="Ex : Vallée d'Aspe, Bali, Bretagne..." />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-forest-700">Décris l'esprit de la Trip</span>
                <textarea className="min-h-32 rounded-lg border border-forest-100 bg-forest-50 px-4 py-3 outline-none focus:ring-2 focus:ring-forest-600" value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Décris l'esprit de la Trip" />
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
            <button className="btn-secondary" onClick={() => setShowPreview((value) => !value)}>Prévisualiser la Trip</button>
            <button className="btn-primary" onClick={() => onPublish(previewTrip)}>Publier la Trip</button>
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
  brief: string;
  coverUrl: string;
}): Trip {
  const [budgetMin, budgetMax] = budgetRangeToNumbers(budget);
  const destinationLabel = [selectedZones.join(" > "), destinationText.trim()].filter(Boolean).join(" > ") || "Destination à préciser";
  return {
    id: `community-${Date.now()}`,
    title: title.trim() || "Nouvelle Trip communautaire",
    destination: destinationLabel,
    image_url: coverUrl.trim() || inferCommunityTripImage(destinationLabel, activitiesWanted, ambiences),
    dates: duration,
    duration,
    budget_min: budgetMin,
    budget_max: budgetMax,
    physical_level: level,
    ambience_tags: Array.from(new Set([...ambiences, groupType])).slice(0, 4),
    compatibility_score: 91,
    interested_count: groupSize.includes("Petit") ? 4 : groupSize.includes("moyen") ? 7 : 10,
    status: "Trip communautaire",
    description: brief,
    activities: activitiesWanted.length ? activitiesWanted : ["Activité locale", "Découverte nature"],
    generation_reasons: [`Proposée par ${proposerName}`, ...groupPreferences.slice(0, 2)],
    matched_member_ids: ["sarah", "amine", "lea"],
    community: true,
    created_by: proposerName,
    brief
  };
}

function budgetRangeToNumbers(label: string): [number, number] {
  if (label.includes("Moins")) return [40, 100];
  if (label.includes("100 à 200")) return [100, 200];
  if (label.includes("200 à 350")) return [200, 350];
  if (label.includes("350 à 500")) return [350, 500];
  if (label.includes("500")) return [500, 900];
  return [0, 0];
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
  onCreateTrip
}: {
  trips: Trip[];
  generatedMode: boolean;
  isGenerating: boolean;
  openTrip: (id: string) => void;
  onCreateTrip: () => void;
}) {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [openFilter, setOpenFilter] = useState<ResultFilterKey | null>(null);
  const [filterAnswers, setFilterAnswers] = useState<Record<string, string | string[]>>({
    availability: [],
    destinationZones: []
  });
  const activeFilterTags = useMemo(() => buildActiveResultFilterTags(activeFilters, filterAnswers), [activeFilters, filterAnswers]);
  const filteredTrips = useMemo(() => filterTripsByResultFilters(dashboardTrips, activeFilterTags), [activeFilterTags, dashboardTrips]);
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

  return (
    <section className="container-page py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="pill">Trips compatibles</p>
          <h1 className="mt-4 text-4xl font-semibold">Trips compatibles</h1>
          <p className="mt-2 text-forest-700">{generatedMode ? "Des aventures adaptées à ton profil." : "Des idées simples pour partir avec la bonne tribu."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-forest-700 shadow-sm">{filteredTrips.length} proposition{filteredTrips.length > 1 ? "s" : ""}</span>
          <button className="btn-primary py-2" onClick={onCreateTrip}>Créer une Trip</button>
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold text-forest-700">Tu sais déjà où tu veux partir ? Propose ton aventure et trouve ta tribu.</p>
      <ResultFilters
        activeFilters={activeFilterTags}
        filterAnswers={filterAnswers}
        openFilter={openFilter}
        resultCount={filteredTrips.length}
        totalCount={dashboardTrips.length}
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
        <TripGrid trips={filteredTrips} openTrip={openTrip} />
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

  if (isIsoDate(filter)) return true;
  if (["30 km max", "100 km max", "300 km max", "depart bordeaux", "depart paris", "depart lyon", "depart toulouse"].includes(normalizedFilter)) {
    return true;
  }
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

function TripGrid({ trips: tripList, openTrip }: { trips: Trip[]; openTrip: (id: string) => void }) {
  if (tripList.length === 0) {
    return (
      <div className="mt-8 rounded-[1.5rem] bg-white p-8 text-center shadow-soft">
        <h2 className="text-2xl font-semibold">Aucune Trip ne correspond exactement à ces filtres.</h2>
        <p className="mx-auto mt-3 max-w-xl text-forest-700">Élargis une préférence et on te proposera plus d'options.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {tripList.map((trip) => (
        <article className="group overflow-hidden rounded-[1.5rem] bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-xl" key={trip.id}>
          <div className="relative h-80 overflow-hidden">
            <img className="h-full w-full object-cover transition duration-700 group-hover:scale-105" src={trip.image_url} alt={trip.destination} />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-900/90 via-forest-900/25 to-transparent" />
            <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-2 text-xs font-bold text-forest-900 backdrop-blur">{trip.compatibility_score}% match</span>
            {trip.community && <span className="absolute right-4 top-4 rounded-full bg-sun px-3 py-2 text-xs font-bold text-white shadow-sm">Trip communautaire</span>}
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <p className="text-sm font-semibold text-white/85">{trip.destination}</p>
              <h3 className="mt-1 text-2xl font-semibold leading-tight">{trip.title}</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/18 px-3 py-1.5 text-xs font-semibold backdrop-blur">{trip.dates}</span>
                <span className="rounded-full bg-white/18 px-3 py-1.5 text-xs font-semibold backdrop-blur">{trip.budget_min}-{trip.budget_max} €</span>
                <span className="rounded-full bg-white/18 px-3 py-1.5 text-xs font-semibold backdrop-blur">{trip.physical_level}</span>
              </div>
            </div>
          </div>
          <div className="p-5">
            {trip.created_by && <p className="mb-3 text-sm font-semibold text-forest-700">Proposée par {trip.created_by}</p>}
            <div className="flex items-center justify-between gap-3">
              <div className="flex -space-x-3">
                {getTripMembers(trip).slice(0, 3).map((member) => (
                  <img className="h-9 w-9 rounded-full border-2 border-white object-cover" src={member.photo_url} alt={member.name} key={member.id} />
                ))}
              </div>
              <span className="text-sm font-semibold text-forest-700">{trip.interested_count} membres compatibles</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold text-forest-700">
              <span>{trip.duration}</span>
              <span className="text-forest-300">•</span>
              <span>Profils vérifiés</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {trip.ambience_tags.slice(0, 2).map((tag) => <span className="pill text-xs" key={tag}>{tag}</span>)}
            </div>
            <button className="btn-primary mt-5 w-full" onClick={() => openTrip(trip.id)}>Voir la Trip</button>
          </div>
        </article>
      ))}
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
  validatedMembers,
  joinTrip
}: {
  trip: Trip;
  validatedMembers: UserProfile[];
  joinTrip: (trip: Trip) => void;
}) {
  const tripActivities = getTripActivities(trip);

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
                Rejoindre la Trip
              </button>
              <button className="rounded-full bg-white/18 px-5 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/25">Sauvegarder</button>
              <button className="rounded-full bg-white/18 px-5 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/25">Partager</button>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page space-y-10 py-10">
        {trip.community && (
          <section className="rounded-[1.5rem] bg-white p-5 shadow-soft sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="pill">Proposée par {trip.created_by ?? "un membre"}</p>
                <h2 className="mt-3 text-3xl font-semibold">L'esprit de la Trip</h2>
                <p className="mt-3 max-w-3xl leading-7 text-forest-700">{trip.brief ?? trip.description}</p>
              </div>
              <div className="grid gap-2 text-sm font-semibold text-forest-700 sm:text-right">
                <span>{trip.physical_level}</span>
                <span>{trip.budget_min} à {trip.budget_max} €</span>
                <span>{trip.dates}</span>
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

function ActivitiesSection({ activities: tripActivities }: { activities: Array<Activity | MockLocalActivity> }) {
  return (
    <section>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="pill">Expériences</p>
          <h2 className="mt-3 text-3xl font-semibold">Activités proposées pour cette Trip</h2>
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
        <h2 className="mt-3 text-3xl font-semibold">Membres qui ont validé la Trip</h2>
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

function getTripActivities(trip: Trip): Array<Activity | MockLocalActivity> {
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
    return mockLocalActivities.filter((activity) => trip.generated_activity_ids?.includes(activity.id));
  }

  return activities;
}

function ConversationPage({ conversation, go }: { conversation: Conversation | null; go: (page: Page) => void }) {
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState<Conversation["messages"]>(conversation?.messages ?? []);

  useEffect(() => {
    setLocalMessages(conversation?.messages ?? []);
  }, [conversation]);

  if (!conversation) {
    return (
      <section className="container-page py-10">
        <div className="card mx-auto max-w-2xl p-6 text-center">
          <MessageCircle className="mx-auto text-forest-700" size={42} />
          <h1 className="mt-4 text-3xl font-semibold">Aucune conversation active</h1>
          <p className="mt-3 text-forest-700">Rejoins une Trip pour créer automatiquement une conversation avec les membres qui l'ont validée.</p>
          <button className="btn-primary mt-6" onClick={() => go("dashboard")}>Voir les Trips</button>
        </div>
      </section>
    );
  }

  const sendMessage = () => {
    if (!draft.trim()) return;
    setLocalMessages((prev) => [
      ...prev,
      {
        id: `message-${prev.length + 1}`,
        author: "Sarah",
        content: draft.trim(),
        time: "maintenant"
      }
    ]);
    setDraft("");
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
                Créée {conversation.createdAt.toLowerCase()} avec {conversation.participants.length} membres ayant validé la Trip.
              </p>
              <button className="btn-secondary mt-5 w-full" onClick={() => go("trip")}>Retour à la Trip</button>
            </div>
          </div>
          <Panel title="Participants">
            <div className="grid gap-3">
              {conversation.participants.map((member) => (
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
              <span className="pill">{conversation.participants.length} membres</span>
            </div>
          </div>
          <div className="flex-1 space-y-4 bg-forest-50 p-4 sm:p-6">
            {localMessages.map((message) => (
              <div
                className={`rounded-lg p-4 ${message.system ? "bg-skysoft text-forest-900" : message.author === "Sarah" ? "ml-auto max-w-[88%] bg-forest-800 text-white" : "max-w-[88%] bg-white"}`}
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
              />
              <button className="btn-primary px-4" onClick={sendMessage} aria-label="Envoyer le message">
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

const tribeFilterOptions = ["Bordeaux", "Paris", "Toulouse", "Lyon", "25-35", "Calme & déconnexion", "Découverte locale", "Montagne", "Facile", "Intermédiaire", "Budget 200 à 350 €", "Week-end", "Profils vérifiés", "Petit groupe", "Women-only possible"];

function Community({ currentUser, trips: availableTrips }: { currentUser: UserProfile; trips: Trip[] }) {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [messageTarget, setMessageTarget] = useState<CompatibleTribeProfile | null>(null);
  const [inviteTarget, setInviteTarget] = useState<CompatibleTribeProfile | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const compatiblePeople = useMemo(() => getCompatiblePeople(currentUser, [...members, ...tribeExtraMembers], availableTrips), [availableTrips, currentUser]);
  const filteredPeople = useMemo(() => filterCompatiblePeople(compatiblePeople, activeFilters), [activeFilters, compatiblePeople]);
  const toggleFilter = (filter: string) => setActiveFilters((prev) => (prev.includes(filter) ? prev.filter((item) => item !== filter) : [...prev, filter]));
  const toggleSavedProfile = (id: string) => setSavedProfiles((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  return (
    <section className="container-page py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="pill">Tribu</p>
          <h1 className="mt-4 text-4xl font-semibold">Voici des personnes qui ont le même style de voyage que toi.</h1>
          <p className="mt-3 max-w-2xl text-forest-700">Découvre des profils compatibles, discute avec eux, puis invite-les à rejoindre une Trip.</p>
        </div>
        <div className="rounded-[1.25rem] bg-white px-4 py-3 text-sm font-semibold text-forest-700 shadow-sm">
          {filteredPeople.length} profil{filteredPeople.length > 1 ? "s" : ""} compatible{filteredPeople.length > 1 ? "s" : ""}
        </div>
      </div>

      <div className="mt-6 rounded-[1.25rem] bg-white p-3 shadow-sm">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tribeFilterOptions.map((filter) => {
            const active = activeFilters.includes(filter);
            return (
              <button className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition ${active ? "bg-forest-800 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"}`} key={filter} onClick={() => toggleFilter(filter)}>
                {filter}
              </button>
            );
          })}
        </div>
        {activeFilters.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <button className="inline-flex items-center gap-2 rounded-full bg-forest-800 px-3 py-1.5 text-xs font-semibold text-white" key={filter} onClick={() => toggleFilter(filter)}>
                {filter}
                <X size={12} />
              </button>
            ))}
          </div>
        )}
      </div>

      {notice && <div className="mt-5 rounded-[1rem] bg-skysoft px-4 py-3 text-sm font-semibold text-forest-900">{notice}</div>}

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredPeople.map((member) => (
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
                <p className="mt-4 text-sm font-semibold text-forest-700">Trip publique : {member.publicTrips[0].title}</p>
              )}
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button className="btn-primary py-2" onClick={() => setMessageTarget(member)}>Message</button>
                <button className="btn-secondary py-2" onClick={() => setInviteTarget(member)}>Inviter à une Trip</button>
              </div>
              <button className="mt-2 w-full rounded-full bg-forest-50 px-4 py-2 text-sm font-semibold text-forest-800 transition hover:bg-forest-100" onClick={() => toggleSavedProfile(member.id)}>
                {savedProfiles.includes(member.id) ? "Ajouté à ta tribu" : "Ajouter à ma tribu"}
              </button>
              <div className="mt-3 flex justify-center gap-4 text-xs font-semibold text-forest-600">
                <button>Signaler</button>
                <button>Bloquer</button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {messageTarget && <TribeMessageModal member={messageTarget} onClose={() => setMessageTarget(null)} />}
      {inviteTarget && (
        <TribeInviteModal
          member={inviteTarget}
          trips={availableTrips}
          onClose={() => setInviteTarget(null)}
          onInvite={(trip) => {
            setNotice(`Invitation envoyée à ${inviteTarget.name} pour rejoindre ${trip.title}.`);
            setInviteTarget(null);
          }}
        />
      )}
    </section>
  );
}

function TribeMessageModal({ member, onClose }: { member: CompatibleTribeProfile; onClose: () => void }) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([
    { id: "m1", author: member.name, content: "Salut, j'ai vu qu'on cherchait le même genre de Trip nature.", time: "09:42" },
    { id: "m2", author: "Toi", content: "Oui, je cherche surtout un petit groupe calme et une destination accessible.", time: "09:45" }
  ]);
  const send = () => {
    if (!draft.trim()) return;
    setMessages((prev) => [...prev, { id: `m${prev.length + 1}`, author: "Toi", content: draft.trim(), time: "maintenant" }]);
    setDraft("");
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-forest-900/55 p-4 backdrop-blur-sm">
      <div className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-forest-100 p-4">
          <div className="flex items-center gap-3">
            <img className="h-12 w-12 rounded-2xl object-cover" src={member.photo_url} alt={member.name} />
            <div>
              <p className="font-semibold">Message à {member.name}</p>
              <p className="text-sm text-forest-700">{member.compatibilityScore}% compatible</p>
            </div>
          </div>
          <button className="rounded-full bg-forest-50 p-2" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto bg-forest-50 p-4">
          {messages.map((message) => (
            <div className={`max-w-[86%] rounded-2xl p-3 ${message.author === "Toi" ? "ml-auto bg-forest-800 text-white" : "bg-white"}`} key={message.id}>
              <div className="mb-1 flex justify-between gap-3 text-xs font-semibold opacity-75">
                <span>{message.author}</span>
                <span>{message.time}</span>
              </div>
              <p>{message.content}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t border-forest-100 p-4">
          <input
            className="min-w-0 flex-1 rounded-lg border border-forest-100 bg-forest-50 px-4 py-3 outline-none focus:ring-2 focus:ring-forest-600"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") send();
            }}
            placeholder="Écrire un message..."
          />
          <button className="btn-primary px-4" onClick={send} aria-label="Envoyer">
            <Send size={18} />
          </button>
        </div>
      </div>
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
            <p className="pill">Inviter à une Trip</p>
            <h2 className="mt-3 text-2xl font-semibold">Choisis une Trip pour {member.name}</h2>
          </div>
          <button className="rounded-full bg-forest-50 p-2" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 grid gap-3">
          {inviteTrips.map((trip) => (
            <button className="flex items-center gap-4 rounded-[1rem] bg-forest-50 p-3 text-left transition hover:bg-forest-100" key={trip.id} onClick={() => onInvite(trip)}>
              <img className="h-16 w-16 rounded-xl object-cover" src={trip.image_url} alt={trip.title} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{trip.title}</p>
                <p className="truncate text-sm text-forest-700">{trip.destination} · {trip.dates}</p>
              </div>
              {trip.community && <span className="rounded-full bg-sun px-3 py-1 text-xs font-bold text-white">Communautaire</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
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

function Profile() {
  const me = members[0];
  return (
    <section className="container-page py-10">
      <div className="card overflow-hidden">
        <div className="h-48 bg-[url('https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center" />
        <div className="grid gap-8 p-6 lg:grid-cols-[0.8fr_1.2fr] lg:p-8">
          <div>
            <img className="-mt-20 h-28 w-28 rounded-[1.5rem] border-4 border-white object-cover shadow-soft" src={me.photo_url} alt={me.name} />
            <h1 className="mt-4 text-4xl font-semibold">{me.name}</h1>
            <p className="mt-2 text-forest-700">{me.city} · {me.age_range}</p>
            <p className="mt-4 leading-7 text-forest-700">{me.bio}</p>
            <TagList tags={[me.verified ? "profil vérifié" : "non vérifié", me.physical_level, me.budget_range]} />
          </div>
          <div className="grid gap-5">
            <Panel title="Mon ADN d'aventure">
              <p className="leading-8 text-forest-700">Nature, calme, montagne, niveau facile/intermédiaire, budget moyen, envie de paysages, repas local, petit groupe rassurant.</p>
            </Panel>
            <div className="grid gap-5 md:grid-cols-2">
              <Panel title="Badges">
                <TagList tags={me.badges} />
              </Panel>
              <Panel title="Avis reçus">
                {reviews.map((review) => <p className="mb-3 text-sm text-forest-700" key={review.id}>“{review.comment}” · {review.rating}/5</p>)}
              </Panel>
            </div>
            <Panel title="Trips passées et préférences">
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric label="Trips passées" value={`${me.past_trips}`} />
                <Metric label="Style" value={me.adventure_style} />
              </div>
              <TagList tags={[...me.preferred_ambiences, ...me.safety_preferences]} />
            </Panel>
          </div>
        </div>
      </div>
    </section>
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
