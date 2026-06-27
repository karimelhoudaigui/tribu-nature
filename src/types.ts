export type PhysicalLevel = "tres-facile" | "facile" | "facile-intermediaire" | "intermediaire" | "sportif";

export type TripCardType = "catalog" | "user_project";
export type TripCreatedByType = "platform" | "user";
export type TripPlanningStatus = "idea" | "forming_group" | "planned" | "confirmed" | "cancelled";
export type TripVisibility = "public" | "private" | "unlisted";
export type TripModerationStatus = "approved" | "pending" | "rejected";

export type TravelPreferences = {
  user_id: string;
  preferred_destinations: string[];
  preferred_activities: string[];
  preferred_accommodation: string[];
  food_preferences: string[];
  group_preferences: string[];
  personal_values: string[];
  availability_periods: string[];
  max_distance_km: number | null;
  preferred_group_size_min: number | null;
  preferred_group_size_max: number | null;
  updated_at?: string;
};

export type UserProfile = {
  id: string;
  name: string;
  age_range: string;
  city: string;
  photo_url: string;
  bio: string;
  verified: boolean;
  physical_level: string;
  budget_range: string;
  adventure_style: string;
  preferred_ambiences: string[];
  safety_preferences: string[];
  past_trips: number;
  badges: string[];
  travel_preferences?: TravelPreferences | null;
};

export type AdventureProfile = {
  user_id: string;
  free_text_intent: string;
  availability: string;
  budget: string;
  physical_level: string;
  preferred_nature: string;
  ambience: string[];
  comfort_level: string;
  safety_needs: string[];
};

export type Trip = {
  id: string;
  title: string;
  destination: string;
  image_url: string;
  dates: string;
  duration: string;
  budget_min: number;
  budget_max: number;
  physical_level: string;
  ambience_tags: string[];
  compatibility_score: number;
  interested_count: number;
  status: string;
  description: string;
  activities: string[];
  generation_reasons?: string[];
  matched_member_ids?: string[];
  generated_activity_ids?: string[];
  generated_itinerary?: ItineraryItem[];
  community?: boolean;
  created_by?: string;
  brief?: string;
  card_type?: TripCardType;
  created_by_type?: TripCreatedByType;
  planning_status?: TripPlanningStatus;
  visibility?: TripVisibility;
  moderation_status?: TripModerationStatus;
  creator_name?: string;
  creator_id?: string;
  departure_city?: string;
  max_participants?: number;
  current_participants?: number;
  conversation_id?: string;
  source_catalog_trip_id?: string;
  created_from_catalog?: boolean;
  region?: string;
  country?: string;
  accommodation_tags?: string[];
  food_tags?: string[];
  group_tags?: string[];
  safety_tags?: string[];
  value_tags?: string[];
  activity_tags?: string[];
};

export type OnboardingProfile = {
  availability: string[];
  filters: string[];
  budget: string;
  physical_level: string;
  preferred_nature: string;
  ambience: string[];
  comfort_level: string;
  safety_needs: string[];
  departure_city: string;
  destination_zones: string[];
};

export type MockDestination = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  nature_type: string[];
  compatible_departure_cities: string[];
  approximate_distance: string;
  average_budget: number;
  recommended_physical_level: string[];
  compatible_ambiences: string[];
  accessibility: string;
  image: string;
  safety_score: number;
  ideal_season: string;
  region: string;
  description: string;
};

export type DestinationSeed = {
  userId: string;
  destinationId: string;
  dates: string;
  budget: string;
  physical_level: string;
  ambience: string[];
  people_wanted: number;
};

export type CollectiveIntent = {
  nature_type: string;
  departure_city: string;
  dates: string;
  budget: string;
  physical_level: string;
  ambience: string[];
  interested_count: number;
};

export type MockLocalActivity = {
  id: string;
  destinationId: string;
  lat?: number;
  lng?: number;
  name: string;
  category: string;
  duration: string;
  estimated_price: number;
  physical_level: string;
  ambience: string[];
  weather_compatible: string[];
  risk: string;
  booking_required: boolean;
  group_friendly: boolean;
  description: string;
  image: string;
  source?: "mock" | "openstreetmap" | "google_places" | "datatourisme";
  external_url?: string;
};

export type MockMember = {
  id: string;
  name: string;
  age: string;
  city: string;
  photo: string;
  physical_level: string;
  preferred_ambience: string[];
  budget: string;
  availability: string[];
  preferred_nature: string[];
  trust_badges: string[];
};

export type Destination = {
  id: string;
  name: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  description: string;
  best_season: string;
  access_info: string;
};

export type Activity = {
  id: string;
  name: string;
  destination_id: string;
  category: string;
  sub_category: string;
  lat: number;
  lng: number;
  duration_estimate: string;
  price_min: number;
  price_max: number;
  physical_level: string;
  risk_level: string;
  weather_dependency: boolean;
  seasonality: string;
  group_size_min: number;
  group_size_max: number;
  booking_required: boolean;
  professional_supervision_required: boolean;
  ambience_tags: string[];
  good_for: string[];
  source: string;
  confidence_score: number;
};

export type Provider = {
  id: string;
  name: string;
  category: string;
  location: string;
  website: string;
  phone: string;
  verified: boolean;
  activities: string[];
};

export type ItineraryItem = {
  id: string;
  trip_id: string;
  day: string;
  time: string;
  title: string;
  description: string;
  activity_id?: string;
  duration: string;
  alternative_if_rain?: string;
};

export type Vote = {
  id: string;
  trip_id: string;
  user_id: string;
  activity_id: string;
  vote_value: number;
};

export type Review = {
  id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  trip_id: string;
  rating: number;
  comment: string;
};
