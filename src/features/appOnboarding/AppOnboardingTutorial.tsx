import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Compass,
  Euro,
  Heart,
  ImagePlus,
  MessageCircle,
  Search,
  Send,
  Sparkles,
  Users
} from "lucide-react";
import { mockLocalActivities, trips } from "../../data";
import type { Trip } from "../../types";
import { trackAppOnboardingEvent } from "./onboardingAnalytics";
import type { AppOnboardingMode } from "./useAppOnboarding";

type VisualKind = "welcome" | "explore" | "compatibility" | "tribe" | "create" | "final";

type AppOnboardingStep = {
  id: string;
  title: string;
  description: string;
  action: string;
  visual: VisualKind;
};

type AppOnboardingTutorialProps = {
  open: boolean;
  mode: AppOnboardingMode;
  initialStep: number;
  onStepViewed: (step: number, stepId: string) => void;
  onSkip: (step: number) => void | Promise<void>;
  onCompleteProfile: () => void | Promise<void>;
  onExplore: () => void | Promise<void>;
  onCloseReopen: () => void;
};

const steps: AppOnboardingStep[] = [
  {
    id: "welcome",
    title: "Le voyage commence ici",
    description: "Découvre les mêmes cartes, favoris et statuts que tu retrouveras dans Destination.",
    action: "Découvrir Destination",
    visual: "welcome"
  },
  {
    id: "explore",
    title: "Explore des Trips réels",
    description: "Recherche, filtre, compare et ouvre une proposition du catalogue.",
    action: "Parcourir Explorer",
    visual: "explore"
  },
  {
    id: "compatibility",
    title: "Lis ton vrai match",
    description: "Le score, les raisons positives et les alertes reprennent le fonctionnement des cartes.",
    action: "Comprendre ton match",
    visual: "compatibility"
  },
  {
    id: "tribe",
    title: "Rejoins puis échange",
    description: "Une demande acceptée ouvre la conversation de groupe du Trip.",
    action: "Rejoindre un groupe",
    visual: "tribe"
  },
  {
    id: "create",
    title: "Crée ton Trip",
    description: "Le tutoriel reprend les vrais champs : destination, photos, dates, envies et groupe.",
    action: "Créer un Trip",
    visual: "create"
  },
  {
    id: "final",
    title: "Retrouve tes Trips",
    description: "Mes Trips rassemble favoris, demandes, Trips rejoints et créations.",
    action: "Choisir ton départ",
    visual: "final"
  }
];

const tutorialTrips = [
  trips.find((trip) => trip.id === "aspe") ?? trips[0],
  trips.find((trip) => trip.id === "fontainebleau") ?? trips[1],
  trips.find((trip) => trip.id === "vercors") ?? trips[2],
  trips.find((trip) => trip.id === "dordogne") ?? trips[3]
].filter(Boolean) as Trip[];

const tutorialActivities = mockLocalActivities.filter((activity) => activity.destinationId === "vallee-aspe").slice(0, 4);

export function AppOnboardingTutorial({
  open,
  mode,
  initialStep,
  onStepViewed,
  onSkip,
  onCompleteProfile,
  onExplore,
  onCloseReopen
}: AppOnboardingTutorialProps) {
  const [stepIndex, setStepIndex] = useState(initialStep);
  const [isBusy, setIsBusy] = useState(false);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const step = steps[stepIndex] ?? steps[0];
  const isLast = stepIndex === steps.length - 1;
  const progress = ((stepIndex + 1) / steps.length) * 100;

  useEffect(() => {
    if (!open) return;
    setStepIndex(Math.min(Math.max(initialStep, 0), steps.length - 1));
  }, [initialStep, open]);

  useEffect(() => {
    if (!open) return;
    onStepViewed(stepIndex, step.id);
  }, [onStepViewed, open, step.id, stepIndex]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
      } else if (event.key === "Escape") {
        event.preventDefault();
        void closeFromEscape();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, stepIndex, mode]);

  const goNext = () => {
    if (isLast) return;
    trackAppOnboardingEvent("onboarding_next_clicked", { step: stepIndex, stepId: step.id, mode });
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const goPrevious = () => {
    if (stepIndex === 0) return;
    trackAppOnboardingEvent("onboarding_previous_clicked", { step: stepIndex, stepId: step.id, mode });
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const closeFromEscape = async () => {
    if (mode === "reopen") {
      onCloseReopen();
      return;
    }
    await onSkip(stepIndex);
  };

  const handleSkip = async () => {
    setIsBusy(true);
    try {
      if (mode === "reopen") onCloseReopen();
      else await onSkip(stepIndex);
    } finally {
      setIsBusy(false);
    }
  };

  const handleCompleteProfile = async () => {
    setIsBusy(true);
    try {
      await onCompleteProfile();
    } finally {
      setIsBusy(false);
    }
  };

  const handleExplore = async () => {
    setIsBusy(true);
    try {
      await onExplore();
    } finally {
      setIsBusy(false);
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (startXRef.current == null || startYRef.current == null) return;
    const deltaX = event.clientX - startXRef.current;
    const deltaY = event.clientY - startYRef.current;
    startXRef.current = null;
    startYRef.current = null;
    if (Math.abs(deltaX) < 54 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
    if (deltaX < 0) goNext();
    else goPrevious();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-forest-950/95 text-white" role="dialog" aria-modal="true" aria-labelledby="app-onboarding-title">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(245,178,77,0.22),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(174,211,199,0.18),transparent_34%),linear-gradient(135deg,#09231d_0%,#0f3b30_52%,#f3efe4_170%)]" />
      <div className="relative mx-auto flex h-dvh w-screen max-w-[100vw] flex-col overflow-hidden bg-transparent px-3 pb-[max(0.7rem,env(safe-area-inset-bottom))] pt-[max(0.7rem,env(safe-area-inset-top))] sm:h-[min(820px,calc(100dvh-2rem))] sm:w-full sm:max-w-5xl sm:translate-y-[1rem] sm:rounded-[2rem] sm:border sm:border-white/12 sm:bg-white/8 sm:p-4 sm:shadow-2xl sm:shadow-black/25 sm:backdrop-blur-xl lg:p-6">
        <header className="flex shrink-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-white/55">Tripeer</p>
            <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-white/15 sm:w-40">
              <div className="h-full rounded-full bg-sun transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <button
            className="shrink-0 rounded-full bg-white/10 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-white/18 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            disabled={isBusy}
            onClick={handleSkip}
          >
            {mode === "reopen" ? "Fermer" : "Passer"}
          </button>
        </header>

        <main
          className="app-onboarding-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-24 pt-3 sm:py-5"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          <div className="grid min-h-full min-w-0 content-center gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-8">
            <section className="order-2 min-w-0 lg:order-1">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-bold text-white/85 backdrop-blur">
                <Sparkles size={14} /> {step.action}
              </p>
              <h1 id="app-onboarding-title" className="mt-3 text-[clamp(1.7rem,7vw,3.75rem)] font-semibold leading-tight">{step.title}</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/78 sm:text-base">{step.description}</p>

              <div className="mt-4 flex items-center gap-2" aria-label={`Étape ${stepIndex + 1} sur ${steps.length}`}>
                {steps.map((item, index) => (
                  <button
                    className={`h-2.5 rounded-full transition-all ${index === stepIndex ? "w-8 bg-sun" : "w-2.5 bg-white/28 hover:bg-white/45"}`}
                    key={item.id}
                    onClick={() => setStepIndex(index)}
                    aria-label={`Aller à l'étape ${index + 1}`}
                  />
                ))}
              </div>
            </section>

            <section className="order-1 min-w-0 lg:order-2">
              <div className="mx-auto w-full min-w-0 max-w-full overflow-hidden rounded-[1.45rem] border border-white/12 bg-white/10 p-2 shadow-2xl shadow-black/20 backdrop-blur-xl sm:max-w-[520px] sm:rounded-[2rem] sm:p-3">
                <div className="app-onboarding-visual w-full min-w-0 overflow-hidden rounded-[1.2rem] bg-forest-50 text-forest-900 sm:rounded-[1.6rem]">
                  <StepVisual kind={step.visual} activeStep={stepIndex} />
                </div>
              </div>
            </section>
          </div>
        </main>

        <footer className="fixed inset-x-0 bottom-0 z-[101] w-screen max-w-[100vw] min-w-0 shrink-0 overflow-hidden border-t border-white/10 bg-forest-950/92 px-3 pb-[max(0.7rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:bg-transparent sm:px-0 sm:pb-0">
          <div
            className="grid items-center gap-2"
            style={{
              width: "100vw",
              maxWidth: "calc(100vw - 1.5rem)",
              gridTemplateColumns: isLast ? "repeat(3, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))"
            }}
          >
            <button
              className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-full bg-white/12 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-white/18 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              disabled={stepIndex === 0 || isBusy}
              onClick={goPrevious}
            >
              <ArrowLeft className="shrink-0" size={17} /> <span className="truncate">Précédent</span>
            </button>
            {!isLast ? (
              <button
                className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-full bg-white px-3 py-2.5 text-sm font-bold text-forest-900 transition hover:bg-forest-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                disabled={isBusy}
                onClick={goNext}
              >
                <span className="truncate">Suivant</span> <ArrowRight className="shrink-0" size={17} />
              </button>
            ) : (
              <>
                <button
                  className="inline-flex min-h-11 min-w-0 items-center justify-center rounded-full border border-white/25 px-2 py-2.5 text-sm font-bold text-white transition hover:bg-white/12 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  disabled={isBusy}
                  onClick={handleExplore}
                >
                  Explorer
                </button>
                <button
                  className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-full bg-white px-2 py-2.5 text-sm font-bold text-forest-900 transition hover:bg-forest-50 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  disabled={isBusy}
                  onClick={handleCompleteProfile}
                >
                  <span className="truncate">Profil</span> <ArrowRight className="shrink-0" size={16} />
                </button>
              </>
            )}
          </div>
          <p className="mt-2 text-center text-[11px] font-semibold text-white/45 sm:hidden">Glisse pour naviguer</p>
        </footer>
      </div>
    </div>
  );
}

function StepVisual({ kind, activeStep }: { kind: VisualKind; activeStep: number }) {
  const reducedMotion = usePrefersReducedMotion();
  if (kind === "welcome") return <WelcomeVisual reducedMotion={reducedMotion} />;
  if (kind === "explore") return <ExploreVisual reducedMotion={reducedMotion} />;
  if (kind === "compatibility") return <CompatibilityVisual activeStep={activeStep} reducedMotion={reducedMotion} />;
  if (kind === "tribe") return <TribeVisual activeStep={activeStep} reducedMotion={reducedMotion} />;
  if (kind === "create") return <CreateTripVisual reducedMotion={reducedMotion} />;
  return <FinalVisual />;
}

function WelcomeVisual({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden bg-[#eef6f1] p-3 sm:p-4">
      <div className="grid grid-cols-2 gap-2 rounded-[1.1rem] bg-white p-2 shadow-sm">
        <Segment active eyebrow="Section Trip" label="Trips" count="0 projet membre" />
        <Segment eyebrow="Section Explorer" label="Explorer" count={`${tutorialTrips.length} idées`} />
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-[1rem] bg-white px-3 py-2 shadow-sm">
        <Search className="shrink-0 text-forest-600" size={16} />
        <span className="truncate text-xs font-semibold text-forest-500">Rechercher une destination, une région ou un Trip</span>
      </div>
      <div className="mt-3 min-h-0 flex-1 overflow-hidden">
        <div className={`flex h-full min-w-0 gap-3 ${reducedMotion ? "" : "app-onboarding-card-flow"}`}>
          {tutorialTrips.slice(0, 3).map((trip, index) => (
            <MiniTripCard favorite={index === 0} key={trip.id} matchLabel={index === 0 ? "94% match" : "Idée à découvrir"} trip={trip} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ExploreVisual({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="h-full bg-[#eef6f1] p-3 sm:p-4">
      <div className="flex h-full flex-col rounded-[1.35rem] bg-white p-3 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1.5 text-xs font-bold text-forest-800">
            <Compass size={14} /> Explorer
          </p>
          <span className="rounded-full bg-forest-900 px-3 py-1.5 text-xs font-bold text-white">{tutorialTrips.length} propositions</span>
        </div>
        <div className="mt-3 flex gap-2 overflow-hidden">
          {["Dates", "Destination", "Localisation", "Plus"].map((filter, index) => (
            <span className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${index === 1 ? "bg-forest-800 text-white" : "bg-forest-50 text-forest-800"}`} key={filter}>{filter}</span>
          ))}
        </div>
        <div className={`mt-3 grid min-h-0 flex-1 gap-3 overflow-hidden ${reducedMotion ? "" : "app-onboarding-phone-scroll"}`}>
          {tutorialTrips.slice(0, 4).map((trip, index) => (
            <ExploreResultRow active={index === 0} key={trip.id} trip={trip} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CompatibilityVisual({ activeStep, reducedMotion }: { activeStep: number; reducedMotion: boolean }) {
  const [score, setScore] = useState(reducedMotion ? 94 : 0);
  const trip = tutorialTrips[0];

  useEffect(() => {
    if (reducedMotion) {
      setScore(94);
      return;
    }
    setScore(0);
    const interval = window.setInterval(() => setScore((value) => Math.min(value + 4, 94)), 28);
    return () => window.clearInterval(interval);
  }, [activeStep, reducedMotion]);

  return (
    <div className="flex h-full flex-col bg-white p-3 sm:p-4">
      <div className="relative h-32 shrink-0 overflow-hidden rounded-[1.25rem] sm:h-44">
        <img className="h-full w-full object-cover" src={trip.image_url} alt={trip.destination} />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-900/90 via-forest-900/25 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-2 text-xs font-bold text-forest-900">{score}% match</span>
        <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-2 text-xs font-bold text-forest-900">Idée de voyage</span>
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="text-xs font-semibold text-white/80">{trip.destination}</p>
          <h3 className="mt-1 line-clamp-2 text-lg font-semibold leading-tight sm:text-xl">{trip.title}</h3>
          <div className="mt-2 flex flex-wrap gap-2 sm:mt-3">
            <span className="rounded-full bg-white/18 px-3 py-1.5 text-xs font-semibold">{trip.duration}</span>
            <span className="rounded-full bg-white/18 px-3 py-1.5 text-xs font-semibold">{trip.budget_min}-{trip.budget_max} €</span>
          </div>
        </div>
      </div>
      <div className="mt-3 grid gap-1.5 rounded-[1rem] bg-forest-50 p-3 sm:gap-2">
        <p className="text-xs font-bold text-forest-600">Pourquoi ce match ?</p>
        {["Ambiance calme"].map((reason) => (
          <span className="inline-flex items-center gap-2 text-xs font-bold text-forest-800" key={reason}>
            <CheckCircle2 size={15} /> {reason}
          </span>
        ))}
      </div>
    </div>
  );
}

function TribeVisual({ activeStep, reducedMotion }: { activeStep: number; reducedMotion: boolean }) {
  const [phase, setPhase] = useState(0);
  const trip = tutorialTrips[0];
  const phases = ["Demander à rejoindre", "Demande envoyée", "Acceptée", "Conversation"];

  useEffect(() => {
    if (reducedMotion) {
      setPhase(3);
      return;
    }
    setPhase(0);
    const interval = window.setInterval(() => setPhase((value) => (value + 1) % phases.length), 950);
    return () => window.clearInterval(interval);
  }, [activeStep, reducedMotion]);

  return (
    <div className="grid h-full grid-rows-[auto_1fr] gap-2 bg-[#f4f1e8] p-2.5 sm:gap-3 sm:p-4">
      <article className="overflow-hidden rounded-[1.2rem] bg-white shadow-xl">
        <div className="flex gap-2 p-2.5 sm:gap-3 sm:p-3">
          <img className="h-16 w-20 shrink-0 rounded-[0.9rem] object-cover sm:h-20 sm:w-24" src={trip.image_url} alt={trip.destination} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-forest-600">{trip.destination}</p>
            <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-tight sm:text-base">{trip.title}</h3>
            <button className={`mt-2 w-full rounded-full px-3 py-1.5 text-xs font-bold sm:py-2 ${phase > 0 ? "bg-emerald-100 text-emerald-900" : "bg-forest-900 text-white"}`}>
              {phases[Math.min(phase, 1)]}
            </button>
          </div>
        </div>
      </article>
      <section className="min-h-0 rounded-[1.2rem] bg-white p-2.5 shadow-xl sm:p-3">
        <div>
          <p className="text-xs font-bold text-forest-600">Conversation de groupe</p>
          <h3 className="text-base font-semibold sm:text-lg">Préparer l'aventure</h3>
        </div>
        <div className="mt-1.5 grid gap-1.5">
          <div className="truncate rounded-lg bg-skysoft px-2 py-1.5 text-xs font-semibold text-forest-900">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-forest-600"><MessageCircle size={12} /> Tripeer</span>
            <span className="ml-1">Conversation créée.</span>
          </div>
          {phase >= 3 && <div className="ml-auto rounded-lg bg-forest-800 p-2 text-xs font-semibold text-white">Oui, disponible ce week-end.</div>}
        </div>
      </section>
    </div>
  );
}

function CreateTripVisual({ reducedMotion }: { reducedMotion: boolean }) {
  const activityNames = tutorialActivities.slice(0, 2).map((activity) => activity.name).join(", ");
  const fields = [
    ["Destination précise", "Vallée d'Aspe, Pyrénées"],
    ["Dates", "Vendredi soir -> dimanche soir"],
    ["Ambiance", "calme, nature"],
    ["Activités souhaitées", activityNames || "Randonnée douce, ferme locale"]
  ];

  return (
    <div className="h-full bg-white p-3 sm:p-4">
      <div className="flex h-full flex-col rounded-[1.35rem] bg-forest-900 p-3 text-white shadow-xl sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold">Créer un Trip</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-xs font-bold"><ImagePlus size={14} /> Photos</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:mt-4 sm:gap-2">
          {fields.map(([label, value], index) => (
            <div className="min-w-0 rounded-[0.8rem] bg-white/10 px-2.5 py-1.5 sm:rounded-[0.9rem] sm:px-3 sm:py-2" key={label}>
              <p className="truncate text-[10px] font-bold text-white/55 sm:text-[11px]">{label}</p>
              <p className="mt-0.5 truncate text-xs font-semibold leading-tight sm:mt-1 sm:text-sm">{value}</p>
              <div className={`mt-1 h-1 rounded-full bg-sun ${reducedMotion ? "w-full" : "app-onboarding-form-fill"}`} style={{ animationDelay: `${index * 180}ms` }} />
            </div>
          ))}
        </div>
        <button className="mt-1.5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-forest-900 sm:mt-3 sm:py-3">
          Publier le projet <Send size={16} />
        </button>
      </div>
    </div>
  );
}

function FinalVisual() {
  const trip = tutorialTrips[0];
  return (
    <div className="h-full bg-forest-50 p-3 sm:p-4">
      <div className="flex h-full flex-col rounded-[1.35rem] bg-white p-3 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-forest-500">Ton espace</p>
            <h3 className="text-xl font-semibold">Mes Trips</h3>
          </div>
          <CalendarDays className="text-forest-700" />
        </div>
        <div className="mt-3 flex gap-2 overflow-hidden rounded-[1rem] bg-forest-50 p-2">
          {["Tous 3", "Validés 1", "En attente 1", "Intéressé 1"].map((tab, index) => (
            <span className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${index === 3 ? "bg-forest-900 text-white" : "bg-white text-forest-800"}`} key={tab}>{tab}</span>
          ))}
        </div>
        <article className="mt-3 min-h-0 flex-1 overflow-hidden rounded-[1.15rem] bg-white shadow-soft">
          <div className="relative h-32">
            <img className="h-full w-full object-cover" src={trip.image_url} alt={trip.destination} />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-900/80 to-transparent" />
            <span className="absolute left-3 top-3 rounded-full bg-sun px-3 py-1.5 text-xs font-bold text-white">Intéressé</span>
            <h4 className="absolute bottom-3 left-3 right-3 line-clamp-2 font-semibold text-white">{trip.title}</h4>
          </div>
          <div className="grid grid-cols-3 gap-2 p-3 text-center">
            <MiniFactLite icon={<Clock3 size={14} />} label="Durée" value={trip.duration} />
            <MiniFactLite icon={<Euro size={14} />} label="Budget" value={`${trip.budget_min}-${trip.budget_max} €`} />
            <MiniFactLite icon={<Users size={14} />} label="Statut" value="Groupe" />
          </div>
        </article>
      </div>
    </div>
  );
}

function Segment({ active = false, eyebrow, label, count }: { active?: boolean; eyebrow: string; label: string; count: string }) {
  return (
    <div className={`rounded-[0.95rem] p-3 ${active ? "bg-forest-900 text-white" : "bg-forest-50 text-forest-900"}`}>
      <span className="text-[10px] font-bold opacity-75">{eyebrow}</span>
      <strong className="mt-1 block text-lg leading-none">{label}</strong>
      <span className="mt-2 block text-[11px] font-semibold opacity-75">{count}</span>
    </div>
  );
}

function MiniTripCard({ trip, favorite, matchLabel }: { trip: Trip; favorite: boolean; matchLabel: string }) {
  return (
    <article className="min-w-[225px] overflow-hidden rounded-[1.25rem] bg-white shadow-soft">
      <div className="relative h-40">
        <img className="h-full w-full object-cover" src={trip.image_url} alt={trip.destination} />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-900/90 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold">{matchLabel}</span>
        <span className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full ${favorite ? "bg-sun text-white" : "bg-white/90 text-forest-800"}`}>
          <Heart size={16} fill={favorite ? "currentColor" : "none"} />
        </span>
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <p className="text-[11px] font-semibold text-white/80">{trip.destination}</p>
          <h3 className="line-clamp-2 font-semibold leading-tight">{trip.title}</h3>
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs font-semibold text-forest-700">À organiser ensemble</p>
        <div className="mt-2 flex gap-1.5 overflow-hidden">
          {trip.ambience_tags.slice(0, 2).map((tag) => <span className="shrink-0 rounded-full bg-forest-50 px-2 py-1 text-[10px] font-bold text-forest-700" key={tag}>{tag}</span>)}
        </div>
      </div>
    </article>
  );
}

function ExploreResultRow({ trip, active }: { trip: Trip; active: boolean }) {
  return (
    <article className={`flex gap-3 rounded-[1rem] p-2.5 ${active ? "bg-forest-50 ring-2 ring-forest-700" : "bg-white shadow-sm"}`}>
      <img className="h-20 w-24 shrink-0 rounded-[0.85rem] object-cover" src={trip.image_url} alt={trip.destination} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-bold leading-tight">{trip.title}</h3>
          <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-bold">{trip.compatibility_score}%</span>
        </div>
        <p className="mt-1 truncate text-xs font-semibold text-forest-600">{trip.destination}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-forest-700">{trip.duration}</span>
          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-forest-700">{trip.physical_level}</span>
        </div>
      </div>
    </article>
  );
}

function MiniFactLite({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-forest-50 p-2">
      <span className="mx-auto flex items-center justify-center gap-1 text-forest-600">{icon}</span>
      <p className="mt-1 text-[10px] font-bold text-forest-500">{label}</p>
      <p className="truncate text-xs font-bold text-forest-900">{value}</p>
    </div>
  );
}

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const update = () => setReducedMotion(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reducedMotion;
}
