import type { TravelPreferences } from "../../types";
import type { UserProfileRecord } from "../../services/authService";

export type ProfileCompletion = {
  percentage: number;
  completed: number;
  total: number;
  missingFields: string[];
};

export function calculateProfileCompletion(profile: UserProfileRecord | null, preferences: TravelPreferences | null): ProfileCompletion {
  const checks: Array<[string, boolean]> = [
    ["ville de départ", Boolean(preferences?.departure_city || profile?.city)],
    ["rayon de déplacement", Boolean(preferences?.max_distance_km)],
    ["disponibilités", Boolean(preferences?.availability_flexible || preferences?.availability_start || preferences?.availability_periods.length)],
    ["budget", preferences?.budget_min != null && preferences?.budget_max != null],
    ["niveau physique", Boolean(preferences?.physical_level || profile?.physical_level)],
    ["types de nature", Boolean(preferences?.nature_types.length)],
    ["activités préférées", Boolean(preferences?.preferred_activities.length)],
    ["ambiances", Boolean(preferences?.preferred_ambiences.length || profile?.preferred_ambiences?.length)],
    ["durée recherchée", Boolean(preferences?.preferred_trip_durations.length)],
    ["confort", Boolean(preferences?.preferred_accommodation.length)],
    ["taille de groupe", Boolean(preferences?.preferred_group_size_min && preferences?.preferred_group_size_max)],
    ["préférences sociales", Boolean(preferences?.group_preferences.length)],
    ["préférences alimentaires", Boolean(preferences?.food_preferences.length)],
    ["contraintes de sécurité", Boolean(profile?.safety_preferences?.length)],
    ["destinations souhaitées", Boolean(preferences?.preferred_destinations.length)]
  ];
  const completed = checks.filter(([, value]) => value).length;
  return {
    percentage: Math.round((completed / checks.length) * 100),
    completed,
    total: checks.length,
    missingFields: checks.filter(([, value]) => !value).map(([label]) => label)
  };
}
