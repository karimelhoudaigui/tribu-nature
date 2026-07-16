import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  MessageCircle,
  Mountain,
  Send,
  Sparkles,
  Users,
  X
} from "lucide-react";
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
    description: "Découvre des aventures, rencontre les bonnes personnes et forme ta tribu.",
    action: "Découvrir les possibilités",
    visual: "welcome"
  },
  {
    id: "explore",
    title: "Trouve une aventure qui te ressemble",
    description: "Explore des idées de voyages et des projets créés par la communauté.",
    action: "Parcourir les propositions",
    visual: "explore"
  },
  {
    id: "compatibility",
    title: "Voyage avec les bonnes personnes",
    description: "Ton score de compatibilité t’aide à trouver les voyages et les groupes qui te correspondent.",
    action: "Comprendre ton match",
    visual: "compatibility"
  },
  {
    id: "tribe",
    title: "Ne voyage plus seul",
    description: "Demande à rejoindre un voyage et échange avec les participants avant le départ.",
    action: "Rejoindre un groupe",
    visual: "tribe"
  },
  {
    id: "create",
    title: "Une destination en tête ?",
    description: "Publie ton projet, définis tes préférences et trouve les personnes avec qui partir.",
    action: "Créer ton voyage",
    visual: "create"
  },
  {
    id: "final",
    title: "Ta prochaine aventure t’attend",
    description: "Complète ton profil pour recevoir des recommandations plus pertinentes.",
    action: "Choisir ton départ",
    visual: "final"
  }
];

const tripPhotos = [
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80"
];

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
    <div className="fixed inset-0 z-[100] bg-forest-950/95 text-white" role="dialog" aria-modal="true" aria-labelledby="app-onboarding-title">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(245,178,77,0.24),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(174,211,199,0.2),transparent_34%),linear-gradient(135deg,#09231d_0%,#0f3b30_48%,#f3efe4_160%)]" />
      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-4 sm:px-6 lg:py-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">tripeer</p>
            <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-sun transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <button
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/18 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            disabled={isBusy}
            onClick={handleSkip}
          >
            {mode === "reopen" ? "Fermer" : "Passer"}
          </button>
        </div>

        <div
          className="grid flex-1 items-center gap-6 py-5 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          <div className="order-2 lg:order-1">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-bold text-white/85 backdrop-blur">
                <Sparkles size={14} /> {step.action}
              </p>
              <h1 id="app-onboarding-title" className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">{step.title}</h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-white/78 sm:text-lg">{step.description}</p>
            </div>

            <div className="mt-7 flex items-center gap-2" aria-label={`Étape ${stepIndex + 1} sur ${steps.length}`}>
              {steps.map((item, index) => (
                <button
                  className={`h-2.5 rounded-full transition-all ${index === stepIndex ? "w-9 bg-sun" : "w-2.5 bg-white/28 hover:bg-white/45"}`}
                  key={item.id}
                  onClick={() => setStepIndex(index)}
                  aria-label={`Aller à l'étape ${index + 1}`}
                />
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-full bg-white/12 px-5 py-3 font-bold text-white transition hover:bg-white/18 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                disabled={stepIndex === 0 || isBusy}
                onClick={goPrevious}
              >
                <ArrowLeft size={18} /> Retour
              </button>
              {!isLast ? (
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-forest-900 transition hover:bg-forest-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  disabled={isBusy}
                  onClick={goNext}
                >
                  Suivant <ArrowRight size={18} />
                </button>
              ) : (
                <>
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-forest-900 transition hover:bg-forest-50 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    disabled={isBusy}
                    onClick={handleCompleteProfile}
                  >
                    Compléter mon profil <ArrowRight size={18} />
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 font-bold text-white transition hover:bg-white/12 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    disabled={isBusy}
                    onClick={handleExplore}
                  >
                    Explorer maintenant
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="order-1 min-h-[360px] lg:order-2">
            <div className="mx-auto max-w-[520px] rounded-[2rem] border border-white/12 bg-white/10 p-3 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="overflow-hidden rounded-[1.6rem] bg-forest-50 text-forest-900">
                <StepVisual kind={step.visual} activeStep={stepIndex} />
              </div>
            </div>
          </div>
        </div>

        <p className="pb-2 text-center text-xs font-semibold text-white/45 sm:hidden">Glisse horizontalement pour naviguer</p>
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
    <div className="relative min-h-[440px] overflow-hidden bg-forest-900 p-5 text-white">
      <img className="absolute inset-0 h-full w-full object-cover opacity-35" src={tripPhotos[0]} alt="Montagnes au lever du jour" />
      <div className="absolute inset-0 bg-gradient-to-t from-forest-900 via-forest-900/55 to-transparent" />
      <div className={`relative flex gap-4 pt-10 ${reducedMotion ? "" : "app-onboarding-card-flow"}`}>
        {[
          ["Val d’Aspe", "92% match", "4/6"],
          ["Côte basque", "87% match", "3/5"],
          ["Vercors doux", "84% match", "2/4"]
        ].map(([title, match, group], index) => (
          <div className="min-w-[230px] overflow-hidden rounded-[1.35rem] bg-white text-forest-900 shadow-xl" key={title}>
            <img className="h-32 w-full object-cover" src={tripPhotos[index % tripPhotos.length]} alt="" />
            <div className="p-4">
              <p className="text-xs font-bold text-forest-500">{group} participants</p>
              <h3 className="mt-1 text-xl font-semibold">{title}</h3>
              <div className="mt-3 flex items-center justify-between">
                <span className="rounded-full bg-sun/20 px-3 py-1 text-xs font-bold text-forest-900">{match}</span>
                <Users size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="relative mt-10 rounded-[1.5rem] bg-white/12 p-4 backdrop-blur">
        <p className="text-sm font-bold text-white/85">Aujourd’hui</p>
        <p className="mt-1 text-2xl font-semibold">3 aventures compatibles t’attendent</p>
      </div>
    </div>
  );
}

function ExploreVisual({ reducedMotion }: { reducedMotion: boolean }) {
  const cards = [
    ["Lac d’Annecy", "Facile", "Week-end", "5 places", "89%"],
    ["Forêt de Brocéliande", "Très facile", "2 jours", "4 places", "81%"],
    ["Pyrénées catalanes", "Intermédiaire", "Août", "3 places", "92%"],
    ["Cap Corse", "Facile", "Septembre", "6 places", "86%"]
  ];
  return (
    <div className="min-h-[440px] bg-[#eef6f1] p-5">
      <div className="mx-auto max-w-[310px] rounded-[2rem] border border-forest-100 bg-white p-3 shadow-xl">
        <div className="mb-3 flex items-center gap-2 rounded-full bg-forest-50 px-3 py-2 text-sm font-bold">
          <Compass size={16} /> Destination
        </div>
        <div className={`grid gap-3 ${reducedMotion ? "" : "app-onboarding-phone-scroll"}`}>
          {cards.map(([title, level, date, places, match], index) => (
            <article className="overflow-hidden rounded-[1.2rem] bg-white shadow-soft" key={title}>
              <div className="relative h-28">
                <img className="h-full w-full object-cover" src={tripPhotos[index % tripPhotos.length]} alt="" />
                <span className="absolute left-3 top-3 rounded-full bg-white/92 px-2.5 py-1 text-xs font-bold">{match} match</span>
              </div>
              <div className="p-3">
                <h3 className="font-bold">{title}</h3>
                <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] font-bold text-forest-700">
                  <span>{level}</span>
                  <span>{date}</span>
                  <span>{places}</span>
                  <span>Petit groupe</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompatibilityVisual({ activeStep, reducedMotion }: { activeStep: number; reducedMotion: boolean }) {
  const [score, setScore] = useState(reducedMotion ? 92 : 0);
  useEffect(() => {
    if (reducedMotion) {
      setScore(92);
      return;
    }
    setScore(0);
    const interval = window.setInterval(() => setScore((value) => Math.min(value + 4, 92)), 28);
    return () => window.clearInterval(interval);
  }, [activeStep, reducedMotion]);
  return (
    <div className="grid min-h-[440px] place-items-center bg-white p-6">
      <div className="w-full rounded-[1.6rem] bg-forest-900 p-5 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <p className="font-bold">Match de groupe</p>
          <Mountain className="text-sun" />
        </div>
        <div className="mx-auto mt-8 grid h-44 w-44 place-items-center rounded-full bg-[conic-gradient(#f5b24d_var(--score),rgba(255,255,255,0.14)_0)] p-3" style={{ "--score": `${score * 3.6}deg` } as CSSProperties}>
          <div className="grid h-full w-full place-items-center rounded-full bg-forest-900 text-center">
            <span className="text-5xl font-semibold">{score}%</span>
            <span className="-mt-8 text-xs font-bold text-white/60">compatible</span>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {["Rythme doux", "Gîte", "Valeurs communes", "Repas halal", "Groupe calme"].map((tag) => (
            <span className="rounded-full bg-white/12 px-3 py-2 text-xs font-bold" key={tag}>{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TribeVisual({ activeStep, reducedMotion }: { activeStep: number; reducedMotion: boolean }) {
  const [phase, setPhase] = useState(0);
  const phases = ["Rejoindre le voyage", "Demande envoyée", "Acceptée", "Groupe ouvert"];
  useEffect(() => {
    if (reducedMotion) {
      setPhase(3);
      return;
    }
    setPhase(0);
    const interval = window.setInterval(() => setPhase((value) => (value + 1) % phases.length), 900);
    return () => window.clearInterval(interval);
  }, [activeStep, reducedMotion]);
  return (
    <div className="min-h-[440px] bg-[#f4f1e8] p-5">
      <div className="rounded-[1.5rem] bg-white p-4 shadow-xl">
        <img className="h-36 w-full rounded-[1.1rem] object-cover" src={tripPhotos[1]} alt="Sentier de voyage en groupe" />
        <h3 className="mt-4 text-xl font-semibold">Week-end nature en petit groupe</h3>
        <button className={`mt-4 w-full rounded-full px-4 py-3 font-bold transition ${phase > 0 ? "bg-emerald-100 text-emerald-900" : "bg-forest-900 text-white"}`}>
          {phases[Math.min(phase, 2)]}
        </button>
      </div>
      <div className="mt-4 grid gap-2">
        {phases.slice(1).map((item, index) => {
          const active = phase >= index + 1;
          return (
            <div className={`flex items-center gap-3 rounded-[1rem] p-3 transition ${active ? "bg-white shadow-sm" : "bg-white/55"}`} key={item}>
              <span className={`grid h-8 w-8 place-items-center rounded-full ${active ? "bg-forest-900 text-white" : "bg-forest-100 text-forest-600"}`}>
                {active ? <CheckCircle2 size={17} /> : index + 1}
              </span>
              <span className="font-bold">{item}</span>
            </div>
          );
        })}
      </div>
      {phase === 3 && (
        <div className="mt-4 rounded-[1rem] bg-forest-900 p-3 text-white shadow-lg">
          <p className="text-xs font-bold text-white/60">Conversation</p>
          <p className="mt-1 text-sm font-semibold">Bienvenue dans le groupe !</p>
        </div>
      )}
    </div>
  );
}

function CreateTripVisual({ reducedMotion }: { reducedMotion: boolean }) {
  const fields = ["Destination : Dolomites", "Activité : randonnée", "Dates : flexibles", "Participants : 4 à 6", "Description : lever de soleil", "Groupe : calme"];
  return (
    <div className="min-h-[440px] bg-white p-5">
      <div className="rounded-[1.6rem] bg-forest-900 p-5 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <p className="font-bold">Créer un Trip</p>
          <Sparkles className="text-sun" />
        </div>
        <div className="mt-6 grid gap-3">
          {fields.map((field, index) => (
            <div className="rounded-[1rem] bg-white/10 p-3" key={field}>
              <div className={`h-3 rounded-full bg-sun ${reducedMotion ? "w-full" : "app-onboarding-form-fill"}`} style={{ animationDelay: `${index * 180}ms` }} />
              <p className="mt-2 text-sm font-semibold">{field}</p>
            </div>
          ))}
        </div>
        <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 font-bold text-forest-900">
          Publier le projet <Send size={16} />
        </button>
      </div>
    </div>
  );
}

function FinalVisual() {
  return (
    <div className="min-h-[440px] bg-forest-50 p-5">
      <div className="rounded-[1.7rem] bg-white p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-[1rem] bg-forest-900 text-white">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-forest-500">Profil d’aventure</p>
            <h3 className="text-xl font-semibold">Recommandations plus fines</h3>
          </div>
        </div>
        <div className="mt-6 grid gap-3">
          {[
            ["Préférences", "80% complété"],
            ["Compatibilité", "92% sur ton prochain groupe"],
            ["Tribu", "3 profils à découvrir"]
          ].map(([label, value]) => (
            <div className="rounded-[1rem] bg-forest-50 p-4" key={label}>
              <p className="text-xs font-bold text-forest-500">{label}</p>
              <p className="mt-1 font-semibold">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-[1.2rem] bg-sun/20 p-4">
          <p className="text-sm font-bold text-forest-900">Ta prochaine aventure t’attend.</p>
        </div>
      </div>
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
