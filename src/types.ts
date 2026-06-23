export type PhysicalLevel = "tres-facile" | "facile" | "facile-intermediaire" | "intermediaire" | "sportif";

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
