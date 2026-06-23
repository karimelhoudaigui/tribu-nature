import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
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
import { activities, destination, itinerary, members, mockLocalActivities, mockMembers, providers, reviews, trips } from "./data";
import { generateTripFromProfile } from "./generator";
import type { Activity, MockLocalActivity, OnboardingProfile, Trip, UserProfile } from "./types";

type Page = "landing" | "onboarding" | "dashboard" | "trip" | "conversation" | "communaute" | "profil" | "prestataires" | "securite";

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
  { page: "dashboard", label: "Trips" },
  { page: "communaute", label: "Tribu" },
  { page: "prestataires", label: "Prestataires" },
  { page: "securite", label: "Sécurité" }
];

const onboardingSteps = [
  { title: "Tes disponibilités", key: "availability", type: "calendar" },
  { title: "Tes filtres", key: "filters", type: "filters" },
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
  { title: "Ton confort idéal", key: "comfort", options: ["Tente", "Refuge", "Gîte", "Hôtel simple", "Peu importe"] },
  {
    title: "Pour te sentir à l'aise",
    key: "safety",
    multi: true,
    options: ["Profils vérifiés", "Groupe mixte", "Groupe women-only", "Référent de Trip", "Activités encadrées par des professionnels", "Petit groupe uniquement", "Groupe calme et respectueux", "Valeurs similaires", "Respect des temps de prière ou pauses personnelles"]
  }
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
    title: "Filtres de base",
    options: ["Âge 25-35", "Groupe mixte", "Groupe women-only", "Petit groupe", "Grand groupe", "Budget max 350 €", "Départ Bordeaux", "30 km max"]
  },
  {
    title: "Destination & durée",
    options: ["Montagne", "Forêt", "Mer", "Campagne", "Rivière", "Journée", "Week-end", "2-3 jours", "Semaine"]
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

function App() {
  const [page, setPage] = useState<Page>("landing");
  const [selectedTripId, setSelectedTripId] = useState("aspe");
  const [menuOpen, setMenuOpen] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [generatedTrip, setGeneratedTrip] = useState<Trip | null>(null);

  const availableTrips = generatedTrip ? [generatedTrip, ...trips] : trips;
  const selectedTrip = availableTrips.find((trip) => trip.id === selectedTripId) ?? availableTrips[0];
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
  const handleGeneratedTrip = (profile: OnboardingProfile) => {
    const trip = generateTripFromProfile(profile);
    setGeneratedTrip(trip);
    setSelectedTripId(trip.id);
    go("trip");
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
        {page === "onboarding" && <Onboarding onGeneratedTrip={handleGeneratedTrip} />}
        {page === "dashboard" && <Dashboard trips={availableTrips} openTrip={openTrip} />}
        {page === "trip" && <TripDetail trip={selectedTrip} validatedMembers={validatedMembers} go={go} joinTrip={joinTrip} />}
        {page === "conversation" && <ConversationPage conversation={conversation} go={go} />}
        {page === "communaute" && <Community />}
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
        <button className="flex items-center gap-2 font-semibold" onClick={() => go("landing")} aria-label="Accueil Tribu Nature">
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
          <button className="btn-secondary py-2" onClick={() => go("profil")}>Mon profil</button>
          <button className="btn-primary py-2" onClick={() => go("onboarding")}>Trouver ma Trip</button>
        </div>
        <button className="rounded-lg border border-forest-100 bg-white p-2 lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>
      {menuOpen && (
        <div className="container-page border-t border-forest-100 py-3 lg:hidden">
          <div className="grid gap-2">
            {[{ page: "landing" as Page, label: "Accueil" }, ...navItems, { page: "profil" as Page, label: "Profil" }, { page: "onboarding" as Page, label: "Trouver ma Trip" }].map((item) => (
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
              <button className="btn-primary bg-white text-forest-900 hover:bg-forest-50" onClick={() => go("onboarding")}>Trouver ma première Trip</button>
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
          <p className="mx-auto mt-4 max-w-2xl text-forest-700">Crée ton profil d'aventure, rejoins une Trip avec des personnes qui veulent vivre la même aventure que toi.</p>
          <button className="btn-primary mt-8" onClick={() => go("onboarding")}>Crée ton profil d'aventure</button>
        </div>
      </section>
    </>
  );
}

function Onboarding({ onGeneratedTrip }: { onGeneratedTrip: (profile: OnboardingProfile) => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({
    availability: ["2026-06-26", "2026-06-28", "Week-end"],
    filters: ["Petit groupe", "Budget max 350 €", "Montagne", "Week-end", "Ambiance calme"],
    budget: "200 à 350 €",
    level: "Facile",
    ambience: ["Calme & déconnexion"],
    nature: "Montagne",
    comfort: "Gîte",
    safety: ["Profils vérifiés", "Petit groupe uniquement", "Groupe calme et respectueux"]
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
              <h2 className="text-2xl font-semibold">{current.title}</h2>
              {current.type === "calendar" ? (
                <AvailabilityPicker answers={answers} setAnswers={setAnswers} />
              ) : current.type === "filters" ? (
                <FiltersPicker answers={answers} setAnswers={setAnswers} />
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
            <AdventureProfileCard answers={answers} onGeneratedTrip={onGeneratedTrip} />
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

function AdventureProfileCard({
  answers,
  onGeneratedTrip
}: {
  answers: Record<string, string | string[]>;
  onGeneratedTrip: (profile: OnboardingProfile) => void;
}) {
  const ambience = Array.isArray(answers.ambience) ? answers.ambience.join(", ") : "Calme & déconnexion";
  const safety = Array.isArray(answers.safety) ? answers.safety.join(", ") : "profils vérifiés";
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
        {availability}. {answers.nature ?? "Montagne"}, niveau {answers.level ?? "facile"}, budget {answers.budget ?? "200 à 350 €"}, ambiance {ambience.toLowerCase()}, confort {answers.comfort ?? "gîte"}, groupe rassurant avec {safety.toLowerCase()}.
      </p>
      <p className="mt-4 text-forest-700">On a trouvé une Trip qui te correspond. Tu peux rejoindre le groupe avant de confirmer.</p>
      <button className="btn-primary mt-8" onClick={() => onGeneratedTrip(toOnboardingProfile(answers))}>
        Générer ma Trip personnalisée
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
    safety_needs: Array.isArray(answers.safety) ? answers.safety : ["Profils vérifiés"],
    departure_city: inferDepartureCity(answers)
  };
}

function inferDepartureCity(answers: Record<string, string | string[]>) {
  const filters = Array.isArray(answers.filters) ? answers.filters : [];
  const departure = filters.find((filter) => filter.startsWith("Départ "));
  return departure?.replace("Départ ", "") ?? "Bordeaux";
}

function Dashboard({ trips: dashboardTrips, openTrip }: { trips: Trip[]; openTrip: (id: string) => void }) {
  return (
    <section className="container-page py-10">
      <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
        <div>
          <p className="pill">Trips compatibles</p>
          <h1 className="mt-4 text-4xl font-semibold">On a trouvé des Trips qui te correspondent.</h1>
          <p className="mt-4 leading-8 text-forest-700">Choisis l'ambiance, le budget et le niveau. Le reste reste simple.</p>
        </div>
        <div className="card grid gap-3 p-5 sm:grid-cols-3">
          <Metric label="Compatibilité max" value="94 %" />
          <Metric label="Groupes ouverts" value="5" />
          <Metric label="Budget moyen" value="220 €" />
        </div>
      </div>
      <DashboardFilters />
      <TripGrid trips={dashboardTrips} openTrip={openTrip} />
    </section>
  );
}

function DashboardFilters() {
  const filters = ["Week-end", "Montagne", "Petit groupe", "Budget < 350 €", "Facile", "Women-only possible", "Groupe calme", "Départ Bordeaux"];
  return (
    <div className="mt-8 flex gap-3 overflow-x-auto pb-2">
      {filters.map((filter, index) => (
        <button className={`shrink-0 rounded-full px-4 py-3 text-sm font-semibold ${index < 3 ? "bg-forest-800 text-white" : "bg-white text-forest-800 shadow-sm"}`} key={filter}>
          {filter}
        </button>
      ))}
    </div>
  );
}

function TripGrid({ trips: tripList, openTrip }: { trips: Trip[]; openTrip: (id: string) => void }) {
  return (
    <div className="mt-8 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
      {tripList.map((trip) => (
        <article className="group overflow-hidden rounded-[1.75rem] bg-white shadow-soft transition hover:-translate-y-1" key={trip.id}>
          <div className="relative">
            <img className="h-72 w-full object-cover transition duration-500 group-hover:scale-105" src={trip.image_url} alt={trip.destination} />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest-900/85 to-transparent p-5 text-white">
              <p className="text-sm font-semibold">{trip.destination}</p>
              <h3 className="mt-1 text-2xl font-semibold">{trip.title}</h3>
            </div>
            <span className="absolute right-4 top-4 rounded-full bg-white/92 px-3 py-2 text-sm font-bold text-forest-900 backdrop-blur">{trip.compatibility_score}% match</span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <MiniFact label="Dates" value={trip.dates} />
              <MiniFact label="Budget" value={`${trip.budget_min} à ${trip.budget_max} €`} />
              <MiniFact label="Niveau" value={trip.physical_level} />
              <MiniFact label="Sécurité" value="Profils vérifiés" />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex -space-x-3">
                {getTripMembers(trip).slice(0, 3).map((member) => (
                  <img className="h-9 w-9 rounded-full border-2 border-white object-cover" src={member.photo_url} alt={member.name} key={member.id} />
                ))}
              </div>
              <span className="text-sm font-semibold text-forest-700">{trip.interested_count} personnes intéressées</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
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
  go,
  joinTrip
}: {
  trip: Trip;
  validatedMembers: UserProfile[];
  go: (page: Page) => void;
  joinTrip: (trip: Trip) => void;
}) {
  const voteScores = [
    ["Randonnée douce", 92],
    ["Ferme locale", 86],
    ["Rafting doux", 63],
    ["Atelier poterie", 74],
    ["Balade à cheval", 58],
    ["Dîner local", 95]
  ];
  const tripItinerary = trip.generated_itinerary ?? itinerary;
  const tripActivities = getTripActivities(trip);
  const generationReasons = trip.generation_reasons ?? [
    "Cette destination correspond à ton envie de nature calme.",
    "Le budget, le niveau et le format sont compatibles avec ton profil.",
    "Les activités locales sont adaptées au rythme du groupe."
  ];

  return (
    <>
      <section className="relative min-h-[520px] overflow-hidden">
        <img className="absolute inset-0 h-full w-full object-cover" src={trip.image_url} alt={trip.destination} />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-900 via-forest-900/45 to-forest-900/10" />
        <div className="container-page relative flex min-h-[520px] items-end py-10 text-white">
          <div className="max-w-4xl">
            <p className="mb-4 inline-flex rounded-full bg-white/18 px-4 py-2 font-semibold backdrop-blur">{trip.status}</p>
            <h1 className="text-4xl font-semibold sm:text-6xl">{trip.title}</h1>
            <div className="mt-5 flex flex-wrap gap-3">
              <span className="pill border-white/20 bg-white/15 text-white">{trip.destination}</span>
              <span className="pill border-white/20 bg-white/15 text-white">{trip.dates}</span>
              <span className="pill border-white/20 bg-white/15 text-white">{trip.budget_min} à {trip.budget_max} €</span>
              <span className="pill border-white/20 bg-white/15 text-white">{trip.physical_level}</span>
              <span className="pill border-white/20 bg-white/15 text-white">{trip.interested_count} personnes intéressées</span>
            </div>
            <button className="btn-primary mt-7 bg-white text-forest-900 hover:bg-forest-50" onClick={() => joinTrip(trip)}>
              Rejoindre la Trip
            </button>
          </div>
        </div>
      </section>

      <section className="container-page grid gap-8 py-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          <Panel title="Pourquoi cette Trip te correspond">
            <div className="grid gap-3">
              {generationReasons.map((reason) => (
                <div className="flex items-start gap-3 rounded-2xl bg-forest-50 p-4" key={reason}>
                  <Sparkles className="mt-0.5 shrink-0 text-forest-700" size={18} />
                  <p className="text-forest-700">{reason}</p>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Destination proposée">
            <p className="font-semibold">{destination.name}, {destination.region}</p>
            <p className="mt-3 leading-8 text-forest-700">{destination.description}</p>
            <p className="mt-3 text-sm text-forest-700">{destination.access_info}</p>
          </Panel>
          <ActivitiesSection activities={tripActivities} />
          <Panel title="Planning généré">
            <div className="grid gap-4">
              {tripItinerary.map((item) => (
                <div className="rounded-lg bg-forest-50 p-4" key={item.id}>
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-forest-700">
                    <span>{item.day}</span>
                    <span>{item.time}</span>
                    <span>{item.duration}</span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-1 text-forest-700">{item.description}</p>
                  {item.alternative_if_rain && <p className="mt-2 text-sm font-semibold text-forest-800">Plan B pluie : {item.alternative_if_rain}</p>}
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Quelles activités veux-tu garder ?">
            <div className="grid gap-4">
              {voteScores.map(([label, score]) => (
                <div key={label}>
                  <div className="mb-2 flex justify-between text-sm font-semibold">
                    <span>{label}</span>
                    <span>{score}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-forest-100">
                    <div className="h-full rounded-full bg-sun" style={{ width: `${score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <aside className="space-y-6">
          <Panel title="Membres qui ont validé la Trip">
            <p className="mb-4 text-sm text-forest-700">Ces compagnons d'aventure ont déjà confirmé leur envie de rejoindre cette Trip. En rejoignant, une conversation commune est créée.</p>
            <div className="grid gap-3">
              {validatedMembers.map((member) => <MemberCard key={member.id} member={member} />)}
            </div>
          </Panel>
          <Panel title="Budget estimé">
            <BudgetRows rows={[["Transport", "50 à 90 €"], ["Hébergement", "60 à 120 €"], ["Activités", "40 à 120 €"], ["Repas", "50 à 80 €"], ["Total", "200 à 410 €"]]} />
          </Panel>
          <Panel title="Plan B en cas de pluie">
            <TagList tags={["Atelier poterie", "Visite de village", "Repas local prolongé", "Fromagerie", "Marché couvert si disponible"]} />
          </Panel>
          <Panel title="Sécurité et confiance">
            <TagList tags={["Profils vérifiés", "Chat modéré", "Charte comportementale", "Référent de Trip", "Activités à risque encadrées", "Signalement possible", "Pas une app de dating"]} />
            <button className="btn-secondary mt-5 w-full" onClick={() => go("securite")}>Voir la page sécurité</button>
          </Panel>
          <div className="card grid gap-3 p-5">
            <button className="btn-primary" onClick={() => joinTrip(trip)}>
              Rejoindre la Trip
            </button>
            <button className="btn-secondary">Sauvegarder</button>
            <button className="btn-secondary">Partager</button>
            <button className="btn-secondary">Voir les personnes compatibles</button>
            <button className="btn-secondary">Proposer une autre date</button>
          </div>
        </aside>
      </section>
    </>
  );
}

function ActivitiesSection({ activities: tripActivities }: { activities: Array<Activity | MockLocalActivity> }) {
  return (
    <Panel title="Activités proposées pour cette Trip">
      <p className="mb-5 text-forest-700">Une sélection réaliste pour le groupe : outdoor, producteurs locaux, repas, alternatives météo et expériences faciles à organiser sur place.</p>
      <div className="mb-5 flex flex-wrap gap-2">
        {["Randonnées", "Fermes et producteurs", "Activités eau vive", "Cheval", "Artisanat", "Repas local", "Villages", "Points de vue", "Refuges", "Marchés locaux", "Activités météo"].map((tag) => (
          <span className="pill" key={tag}>{tag}</span>
        ))}
      </div>
      <div className="grid gap-4">
        {tripActivities.map((activity) => <ActivityCard activity={activity} key={activity.id} />)}
      </div>
    </Panel>
  );
}

function getTripActivities(trip: Trip): Array<Activity | MockLocalActivity> {
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

function Community() {
  return (
    <section className="container-page py-10">
      <p className="pill">Compagnons d'aventure</p>
      <h1 className="mt-4 text-4xl font-semibold">Des personnes qui cherchent le même type de Trip.</h1>
      <p className="mt-4 max-w-3xl leading-8 text-forest-700">Ici, on ne swipe pas. On découvre des compagnons d'aventure selon le rythme, la confiance et les envies communes.</p>
      <DashboardFilters />
      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {members.map((member) => (
          <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-soft" key={member.id}>
            <MemberCard member={member} />
            <div className="grid gap-2 p-4 pt-0">
              <button className="btn-primary py-2">Inviter dans une Trip</button>
              <button className="btn-secondary py-2">Voir compatibilité</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
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
        description: activity.description
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
        description: ""
      };

  return (
    <div className="rounded-[1.25rem] border border-forest-100 bg-white p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row">
        <div>
          <h3 className="text-lg font-semibold">{display.name}</h3>
          <p className="text-sm text-forest-700">{display.category} · {display.duration} · {display.price}</p>
          {display.description && <p className="mt-2 text-sm leading-6 text-forest-700">{display.description}</p>}
        </div>
        <span className="pill w-fit">{display.score}</span>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-forest-700 sm:grid-cols-2">
        <span>Niveau : {display.physicalLevel}</span>
        <span>Risque : {display.risk}</span>
        <span>Météo-compatible : {display.weather}</span>
        <span>Adapté groupe : {display.group}</span>
        <span>Réservation : {display.booking}</span>
        <span>Encadrement pro : {display.supervision}</span>
      </div>
      <TagList tags={display.tags} />
    </div>
  );
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
    <div className="grid gap-3">
      {rows.map(([label, value]) => (
        <div className="flex justify-between rounded-lg bg-forest-50 p-3" key={label}>
          <span>{label}</span>
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
            ["Accueil", "landing", Home],
            ["Trips", "dashboard", Compass],
            ["Tribu", "communaute", Users],
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
