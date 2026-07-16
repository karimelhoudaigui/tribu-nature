import { useCallback, useEffect, useState } from "react";
import { updateProfile, type UserProfileRecord } from "../../services/authService";
import { trackAppOnboardingEvent } from "./onboardingAnalytics";

export type AppOnboardingStatus = "not_started" | "in_progress" | "completed" | "skipped";
export type AppOnboardingMode = "initial" | "reopen";

type LocalOnboardingState = {
  status: AppOnboardingStatus;
  lastStep: number;
  updatedAt: string;
};

type UseAppOnboardingOptions = {
  profile: UserProfileRecord | null;
  accessToken?: string;
  onProfileUpdated: (profile: UserProfileRecord) => void;
};

const baseLocalKey = "app_onboarding_completed";

export function useAppOnboarding({ profile, accessToken, onProfileUpdated }: UseAppOnboardingOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AppOnboardingMode>("initial");
  const [initialStep, setInitialStep] = useState(0);
  const [localState, setLocalState] = useState<LocalOnboardingState | null>(() => profile ? readLocalOnboardingState(profile.id) : null);
  const hasRemoteStatus = Boolean(profile?.app_onboarding_status);
  const profileStatus = profile?.app_onboarding_status ?? "not_started";
  const profileFinished = profileStatus === "completed" || profileStatus === "skipped";
  const localFinished = localState?.status === "completed" || localState?.status === "skipped";
  const shouldAutoOpen = Boolean(profile && accessToken && !isOpen && hasRemoteStatus && !profileFinished && !localFinished);

  useEffect(() => {
    setLocalState(profile ? readLocalOnboardingState(profile.id) : null);
  }, [profile?.id]);

  const persistProfileStatus = useCallback(async (status: AppOnboardingStatus, lastStep: number) => {
    if (!profile || !accessToken) return;
    const now = new Date().toISOString();
    try {
      const nextProfile = await updateProfile(profile.id, {
        app_onboarding_status: status,
        app_onboarding_last_step: lastStep,
        ...(status === "in_progress" && !profile.app_onboarding_started_at ? { app_onboarding_started_at: now } : {}),
        ...(status === "completed" ? { app_onboarding_completed_at: now } : {}),
        ...(status === "skipped" ? { app_onboarding_skipped_at: now } : {})
      }, accessToken);
      onProfileUpdated(nextProfile);
    } catch (error) {
      console.warn("Statut du tutoriel non synchronisé avec Supabase, fallback local utilisé.", error);
    }
  }, [accessToken, onProfileUpdated, profile]);

  const openInitial = useCallback(() => {
    if (!profile) return;
    const startStep = localState?.status === "in_progress" ? localState.lastStep : profile.app_onboarding_last_step ?? 0;
    setMode("initial");
    setInitialStep(clampStep(startStep));
    setIsOpen(true);
    setLocalState(writeLocalOnboardingState(profile.id, "in_progress", clampStep(startStep)));
    void persistProfileStatus("in_progress", clampStep(startStep));
    trackAppOnboardingEvent("onboarding_started", { profileId: profile.id, mode: "initial" });
  }, [localState?.lastStep, localState?.status, persistProfileStatus, profile]);

  const reopen = useCallback(() => {
    if (!profile) return;
    setMode("reopen");
    setInitialStep(0);
    setIsOpen(true);
    trackAppOnboardingEvent("onboarding_reopened", { profileId: profile.id });
  }, [profile]);

  const closeReopen = useCallback(() => {
    setIsOpen(false);
  }, []);

  const markStepViewed = useCallback((step: number, stepId: string) => {
    if (!profile) return;
    const nextStep = clampStep(step);
    if (mode === "initial") setLocalState(writeLocalOnboardingState(profile.id, "in_progress", nextStep));
    trackAppOnboardingEvent("onboarding_step_viewed", { profileId: profile.id, step: nextStep, stepId, mode });
  }, [mode, profile]);

  const finish = useCallback(async (status: "completed" | "skipped", lastStep: number) => {
    if (!profile) {
      setIsOpen(false);
      return;
    }
    if (mode === "initial") {
      setLocalState(writeLocalOnboardingState(profile.id, status, clampStep(lastStep)));
      await persistProfileStatus(status, clampStep(lastStep));
      trackAppOnboardingEvent(status === "completed" ? "onboarding_completed" : "onboarding_skipped", { profileId: profile.id, lastStep });
    }
    setIsOpen(false);
  }, [mode, persistProfileStatus, profile]);

  return {
    isOpen,
    mode,
    initialStep,
    shouldAutoOpen,
    openInitial,
    reopen,
    closeReopen,
    markStepViewed,
    finish
  };
}

function getLocalOnboardingKey(userId: string) {
  return `${baseLocalKey}:${userId}`;
}

function readLocalOnboardingState(userId: string): LocalOnboardingState | null {
  if (typeof window === "undefined") return null;
  try {
    const rawValue = window.localStorage.getItem(getLocalOnboardingKey(userId));
    if (!rawValue) return null;
    const parsed = JSON.parse(rawValue) as LocalOnboardingState;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocalOnboardingState(userId: string, status: AppOnboardingStatus, lastStep: number) {
  const value: LocalOnboardingState = {
    status,
    lastStep,
    updatedAt: new Date().toISOString()
  };
  if (typeof window === "undefined") return value;
  window.localStorage.setItem(getLocalOnboardingKey(userId), JSON.stringify(value));
  return value;
}

function clampStep(step: number) {
  return Number.isFinite(step) ? Math.min(Math.max(Math.round(step), 0), 5) : 0;
}
