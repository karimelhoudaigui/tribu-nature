import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, MapPin, Save, Sparkles } from "lucide-react";
import type { UserProfileRecord, UserProfileUpdate } from "../../services/authService";
import type { TravelPreferencesUpdate } from "../../services/travelPreferenceService";
import type { TravelPreferences } from "../../types";
import { calculateProfileCompletion } from "./profileCompletion";

type Props = {
  profile: UserProfileRecord;
  preferences: TravelPreferences | null;
  onSavePreferences: (updates: TravelPreferencesUpdate) => Promise<TravelPreferences>;
  onUpdateProfile: (updates: UserProfileUpdate) => Promise<UserProfileRecord>;
  onDone: () => void;
};

const steps = ["Départ", "Disponibilités", "Budget", "Nature", "Activités", "Ambiances", "Confort", "Groupe"];
const activityOptions = ["Randonnée", "Bivouac", "Rafting", "Kayak", "Vélo", "Surf", "Bien-être", "Visites locales", "Gastronomie", "Photographie"];
const natureOptions = ["Montagne", "Forêt", "Mer", "Campagne", "Rivière", "Lac", "Vallée", "Parc naturel"];
const ambienceOptions = ["Calme & déconnexion", "Sport & dépassement", "Découverte locale", "Fun & aventure douce", "Contemplatif", "Premium & confort"];
const comfortOptions = ["Tente / bivouac", "Refuge", "Gîte", "Hôtel simple", "Hôtel confortable"];
const socialOptions = ["Petit groupe", "Groupe sociable", "Groupe calme", "Women-only", "Groupe mixte", "Rythme tranquille", "Rythme sportif"];
const foodOptions = ["Végétarien", "Halal", "Sans alcool", "Allergies à respecter", "Cuisine locale", "Aucune contrainte"];
const safetyOptions = ["Niveau cohérent", "Encadrement professionnel", "Plan B météo", "Organisateur identifié", "Pauses respectées"];

export function OnboardingFlow({ profile, preferences, onSavePreferences, onUpdateProfile, onDone }: Props) {
  const initialStep = Math.min(Math.max(preferences?.onboarding_step ?? 0, 0), steps.length - 1);
  const [step, setStep] = useState(initialStep);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [draft, setDraft] = useState<TravelPreferencesUpdate>(() => ({
    departure_city: preferences?.departure_city ?? profile.city ?? "",
    max_distance_km: preferences?.max_distance_km ?? 250,
    availability_start: preferences?.availability_start ?? null,
    availability_end: preferences?.availability_end ?? null,
    availability_flexible: preferences?.availability_flexible ?? true,
    availability_periods: preferences?.availability_periods ?? [],
    budget_min: preferences?.budget_min ?? 100,
    budget_max: preferences?.budget_max ?? 350,
    physical_level: preferences?.physical_level ?? profile.physical_level ?? "Facile",
    nature_types: preferences?.nature_types ?? [],
    preferred_activities: preferences?.preferred_activities ?? [],
    preferred_ambiences: preferences?.preferred_ambiences ?? profile.preferred_ambiences ?? [],
    preferred_trip_durations: preferences?.preferred_trip_durations ?? [],
    preferred_accommodation: preferences?.preferred_accommodation ?? [],
    food_preferences: preferences?.food_preferences ?? [],
    group_preferences: preferences?.group_preferences ?? [],
    personal_values: preferences?.personal_values ?? [],
    preferred_group_size_min: preferences?.preferred_group_size_min ?? 3,
    preferred_group_size_max: preferences?.preferred_group_size_max ?? 6,
    preferred_destinations: preferences?.preferred_destinations ?? []
  }));

  const previewPreferences = useMemo(() => ({
    ...preferences,
    ...draft,
    user_id: profile.id,
    preferred_destinations: draft.preferred_destinations ?? [],
    preferred_activities: draft.preferred_activities ?? [],
    preferred_accommodation: draft.preferred_accommodation ?? [],
    food_preferences: draft.food_preferences ?? [],
    group_preferences: draft.group_preferences ?? [],
    personal_values: draft.personal_values ?? [],
    availability_periods: draft.availability_periods ?? [],
    nature_types: draft.nature_types ?? [],
    preferred_ambiences: draft.preferred_ambiences ?? [],
    preferred_trip_durations: draft.preferred_trip_durations ?? [],
    availability_flexible: draft.availability_flexible ?? true,
    onboarding_step: step,
    onboarding_status: "draft" as const,
    onboarding_started_at: preferences?.onboarding_started_at ?? new Date().toISOString(),
    onboarding_completed_at: null,
    onboarding_skipped_at: null
  }) as TravelPreferences, [draft, preferences, profile.id, step]);
  const completion = calculateProfileCompletion(profile, previewPreferences);

  const save = async (nextStep: number, status: "draft" | "skipped" | "completed") => {
    setSaving(true);
    setFeedback("");
    const now = new Date().toISOString();
    try {
      await onSavePreferences({
        ...draft,
        onboarding_step: Math.min(nextStep, steps.length - 1),
        onboarding_status: status,
        onboarding_started_at: preferences?.onboarding_started_at ?? now,
        onboarding_completed_at: status === "completed" ? now : null,
        onboarding_skipped_at: status === "skipped" ? now : null
      });
      if (status === "completed") {
        await onUpdateProfile({
          city: String(draft.departure_city || "") || null,
          physical_level: String(draft.physical_level || "") || null,
          budget_range: formatBudget(draft.budget_min, draft.budget_max),
          preferred_ambiences: draft.preferred_ambiences ?? [],
          safety_preferences: draft.personal_values ?? []
        });
        onDone();
      } else if (status === "skipped") {
        onDone();
      } else {
        setStep(nextStep);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Sauvegarde impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="container-page py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="pill">Ton profil d'aventure</p><h1 className="mt-3 text-4xl font-semibold">Des Trips vraiment adaptées à toi.</h1><p className="mt-3 max-w-2xl text-forest-700">Chaque étape est enregistrée. Tu peux t'arrêter et reprendre plus tard.</p></div>
          <button className="text-sm font-bold text-forest-700" disabled={saving} onClick={() => save(step, "skipped")}>Continuer plus tard</button>
        </div>
        <div className="mt-7 flex gap-2">{steps.map((label, index) => <div className="min-w-0 flex-1" key={label}><div className={`h-2 rounded-full ${index <= step ? "bg-forest-800" : "bg-forest-100"}`} /><span className="mt-1 hidden truncate text-[10px] font-bold text-forest-600 sm:block">{label}</span></div>)}</div>

        <div className="mt-8 rounded-[1.5rem] bg-white p-5 shadow-soft sm:p-8">
          {step === 0 && <OnboardingSection title="D'où souhaites-tu partir ?" text="Cette information sert au classement des Trips et reste modifiable."><TextField label="Ville de départ" value={draft.departure_city ?? ""} onChange={(value) => setDraft((current) => ({ ...current, departure_city: value }))} icon={<MapPin size={18} />} /><NumberField label="Rayon de déplacement maximal (km)" value={draft.max_distance_km} min={10} max={3000} onChange={(value) => setDraft((current) => ({ ...current, max_distance_km: value }))} /></OnboardingSection>}
          {step === 1 && <OnboardingSection title="Quand peux-tu partir ?" text="Choisis des dates ou garde une disponibilité flexible."><Toggle label="Mes dates sont flexibles" checked={draft.availability_flexible ?? true} onChange={(checked) => setDraft((current) => ({ ...current, availability_flexible: checked }))} />{!draft.availability_flexible && <div className="grid gap-3 sm:grid-cols-2"><DateField label="Du" value={draft.availability_start} onChange={(value) => setDraft((current) => ({ ...current, availability_start: value }))} /><DateField label="Au" value={draft.availability_end} onChange={(value) => setDraft((current) => ({ ...current, availability_end: value }))} /></div>}<ChipGroup label="Durée recherchée" options={["Week-end", "2-3 jours", "Une semaine", "10 jours et plus"]} values={draft.preferred_trip_durations ?? []} onChange={(values) => setDraft((current) => ({ ...current, preferred_trip_durations: values }))} /></OnboardingSection>}
          {step === 2 && <OnboardingSection title="Quel budget te convient ?" text="Nous stockons une fourchette numérique, pas seulement un libellé."><div className="grid gap-3 sm:grid-cols-2"><NumberField label="Budget minimum (€)" value={draft.budget_min} min={0} max={10000} onChange={(value) => setDraft((current) => ({ ...current, budget_min: value }))} /><NumberField label="Budget maximum (€)" value={draft.budget_max} min={0} max={10000} onChange={(value) => setDraft((current) => ({ ...current, budget_max: value }))} /></div></OnboardingSection>}
          {step === 3 && <OnboardingSection title="Ton rythme et tes paysages" text="Le niveau sert aussi à éviter les recommandations risquées."><SingleChoice label="Niveau physique" options={["Très facile", "Facile", "Intermédiaire", "Sportif", "Très sportif"]} value={draft.physical_level ?? ""} onChange={(value) => setDraft((current) => ({ ...current, physical_level: value }))} /><ChipGroup label="Types de nature" options={natureOptions} values={draft.nature_types ?? []} onChange={(values) => setDraft((current) => ({ ...current, nature_types: values }))} /></OnboardingSection>}
          {step === 4 && <OnboardingSection title="Qu'as-tu envie de vivre ?" text="Sélectionne plusieurs activités, même si tu débutes."><ChipGroup label="Activités préférées" options={activityOptions} values={draft.preferred_activities ?? []} onChange={(values) => setDraft((current) => ({ ...current, preferred_activities: values }))} /></OnboardingSection>}
          {step === 5 && <OnboardingSection title="Quelle ambiance recherches-tu ?" text="Ces choix alimentent le matching avec les Trips et les personnes."><ChipGroup label="Ambiances" options={ambienceOptions} values={draft.preferred_ambiences ?? []} onChange={(values) => setDraft((current) => ({ ...current, preferred_ambiences: values }))} /></OnboardingSection>}
          {step === 6 && <OnboardingSection title="Confort et préférences personnelles" text="Indique uniquement ce qui compte vraiment pour toi."><ChipGroup label="Hébergement" options={comfortOptions} values={draft.preferred_accommodation ?? []} onChange={(values) => setDraft((current) => ({ ...current, preferred_accommodation: values }))} /><ChipGroup label="Alimentation" options={foodOptions} values={draft.food_preferences ?? []} onChange={(values) => setDraft((current) => ({ ...current, food_preferences: values }))} /></OnboardingSection>}
          {step === 7 && <OnboardingSection title="Le groupe qui te convient" text="Dernière étape : taille, dynamique, sécurité et destinations."><div className="grid gap-3 sm:grid-cols-2"><NumberField label="Taille minimum" value={draft.preferred_group_size_min} min={2} max={30} onChange={(value) => setDraft((current) => ({ ...current, preferred_group_size_min: value }))} /><NumberField label="Taille maximum" value={draft.preferred_group_size_max} min={2} max={30} onChange={(value) => setDraft((current) => ({ ...current, preferred_group_size_max: value }))} /></div><ChipGroup label="Préférences sociales" options={socialOptions} values={draft.group_preferences ?? []} onChange={(values) => setDraft((current) => ({ ...current, group_preferences: values }))} /><ChipGroup label="Sécurité" options={safetyOptions} values={draft.personal_values ?? []} onChange={(values) => setDraft((current) => ({ ...current, personal_values: values }))} /><ListField label="Destinations ou régions souhaitées" values={draft.preferred_destinations ?? []} onChange={(values) => setDraft((current) => ({ ...current, preferred_destinations: values }))} /></OnboardingSection>}

          {feedback && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{feedback}</p>}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-forest-100 pt-5">
            <button className="btn-secondary inline-flex items-center gap-2" disabled={step === 0 || saving} onClick={() => setStep((current) => Math.max(0, current - 1))}><ArrowLeft size={17} />Retour</button>
            <span className="text-sm font-bold text-forest-600">Profil complété à {completion.percentage}%</span>
            <button className="btn-primary inline-flex items-center gap-2" disabled={saving} onClick={() => save(Math.min(step + 1, steps.length - 1), step === steps.length - 1 ? "completed" : "draft")}>{saving ? <Save size={17} /> : step === steps.length - 1 ? <Sparkles size={17} /> : <ArrowRight size={17} />}{saving ? "Enregistrement..." : step === steps.length - 1 ? "Terminer" : "Enregistrer et continuer"}</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function OnboardingSection({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return <div><h2 className="text-3xl font-semibold">{title}</h2><p className="mt-2 text-forest-700">{text}</p><div className="mt-6 grid gap-5">{children}</div></div>;
}

function ChipGroup({ label, options, values, onChange }: { label: string; options: string[]; values: string[]; onChange: (values: string[]) => void }) {
  return <div><p className="text-sm font-bold text-forest-700">{label}</p><div className="mt-2 flex flex-wrap gap-2">{options.map((option) => { const active = values.includes(option); return <button className={`inline-flex items-center gap-1 rounded-full px-4 py-2.5 text-sm font-bold ${active ? "bg-forest-800 text-white" : "bg-forest-50 text-forest-800"}`} key={option} onClick={() => onChange(active ? values.filter((value) => value !== option) : [...values, option])}>{active && <Check size={14} />}{option}</button>; })}</div></div>;
}

function SingleChoice({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return <ChipGroup label={label} options={options} values={value ? [value] : []} onChange={(values) => onChange(values[values.length - 1] ?? "")} />;
}

function TextField({ label, value, onChange, icon }: { label: string; value: string; onChange: (value: string) => void; icon?: ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold text-forest-700">{label}<span className="flex items-center gap-2 rounded-lg border border-forest-100 bg-forest-50 px-3">{icon}<input className="min-w-0 flex-1 bg-transparent py-3 font-normal outline-none" value={value} onChange={(event) => onChange(event.target.value)} /></span></label>;
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number | null | undefined; min: number; max: number; onChange: (value: number | null) => void }) {
  return <label className="grid gap-2 text-sm font-bold text-forest-700">{label}<input className="rounded-lg border border-forest-100 bg-forest-50 p-3 font-normal" type="number" min={min} max={max} value={value ?? ""} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)} /></label>;
}

function DateField({ label, value, onChange }: { label: string; value: string | null | undefined; onChange: (value: string | null) => void }) {
  return <label className="grid gap-2 text-sm font-bold text-forest-700">{label}<input className="rounded-lg border border-forest-100 bg-forest-50 p-3 font-normal" type="date" value={value ?? ""} onChange={(event) => onChange(event.target.value || null)} /></label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex items-center justify-between gap-4 rounded-lg bg-forest-50 p-4 font-bold"><span>{label}</span><input className="h-5 w-5 accent-forest-800" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}

function ListField({ label, values, onChange }: { label: string; values: string[]; onChange: (values: string[]) => void }) {
  const [value, setValue] = useState("");
  return <div><p className="text-sm font-bold text-forest-700">{label}</p><div className="mt-2 flex gap-2"><input className="min-w-0 flex-1 rounded-lg border border-forest-100 bg-forest-50 p-3" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Ex : Occitanie" /><button className="btn-secondary" onClick={() => { const clean = value.trim(); if (clean && !values.includes(clean)) onChange([...values, clean]); setValue(""); }}>Ajouter</button></div><div className="mt-2 flex flex-wrap gap-2">{values.map((item) => <button className="rounded-full bg-forest-100 px-3 py-2 text-sm font-bold" onClick={() => onChange(values.filter((value) => value !== item))} key={item}>{item} ×</button>)}</div></div>;
}

function formatBudget(minimum?: number | null, maximum?: number | null) {
  if (minimum == null && maximum == null) return null;
  if (minimum == null) return `Jusqu'à ${maximum} €`;
  if (maximum == null) return `${minimum} € et plus`;
  return `${minimum} à ${maximum} €`;
}
