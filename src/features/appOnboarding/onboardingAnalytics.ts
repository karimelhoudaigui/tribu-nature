export type AppOnboardingAnalyticsEvent =
  | "onboarding_started"
  | "onboarding_step_viewed"
  | "onboarding_next_clicked"
  | "onboarding_previous_clicked"
  | "onboarding_skipped"
  | "onboarding_completed"
  | "onboarding_reopened";

export function trackAppOnboardingEvent(event: AppOnboardingAnalyticsEvent, properties: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) {
    console.debug("[app-onboarding]", event, properties);
  }
}
