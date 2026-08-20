
export interface TransitDetail {
  mode: string;
  duration: string;
  cost: string;
  instruction: string;
}

export interface Activity {
  time: string;
  title: string;
  description: string;
  location: string;
  estimatedCost: string;
  transitFromPrev?: TransitDetail; // How to get here from the previous point
  bookingRequired: boolean;
  bookingLink?: string;
  coordinates?: { lat: number, lng: number }; // For map visualization
  isValidated?: boolean;
  verificationNote?: string;
}

export interface DayPlan {
  day: string;
  theme: string;
  activities: Activity[];
}

export interface TravelOption {
  type: 'FLIGHT' | 'TRAIN' | 'BUS' | 'CAR';
  provider: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: string;
  departureLocation: string; // e.g. "Terminal 2, BLR"
  arrivalLocation: string;
  bookingLink: string;
}

export interface Accommodation {
  name: string;
  type: string;
  rating: string;
  pricePerNight: string;
  location: string;
  description: string;
  amenities: string[];
  checkInTime: string;
  imageUrl: string; // For room photo
  bookingLink?: string;
}

export interface TripItinerary {
  id?: string;
  destination: string;
  duration: string;
  totalEstimatedCost: string;
  summary: string;
  coordinates?: { lat: number; lon: number; }; // For map visualization
  travelOptions: TravelOption[]; // Ways to reach the destination
  accommodation: Accommodation[]; // Where to stay
  days: DayPlan[]; // The daily plan
  dna?: { Adventure: number; Luxury: number; Culture: number; Relaxation: number; }; // AI-generated DNA scores
  promptId?: string; // Links back to the prompt log entry
  originalPrompt?: string; // The prompt used to generate this trip
  status?: 'draft' | 'confirmed' | 'paused' | 'completed'; // Draft = Prompt Log only, Confirmed = Dashboard, Paused = Frozen, Completed = History
  startDate?: string; // YYYY-MM-DD format for trip start
  calendarEventIds?: string[]; // IDs of synced Google Calendar events
  selectedTravelIndex?: number; // User's selected travel option
  selectedHotelIndex?: number; // User's selected accommodation
  last_frozen_at?: number; // Timestamp when the trip was frozen (if paused)
  is_public?: boolean;
  alert_level?: 'normal' | 'elevated' | 'critical';
  comm_settings?: {
    voice_enabled?: boolean;
    video_enabled?: boolean;
    audio_bitrate?: 'low' | 'high';
    noise_cancellation?: boolean;
    video_resolution?: '720p' | '1080p' | '4k';
    frame_rate?: '30' | '60';
    bandwidth_saver?: boolean;
  };
}


export enum AppView {
  LANDING = 'LANDING',
  PLANNER = 'PLANNER',
  DINING = 'DINING',
  AUTH = 'AUTH',
  ABOUT = 'ABOUT',
  HOW_IT_WORKS = 'HOW_IT_WORKS',
  DASHBOARD = 'DASHBOARD',
  PRICING = 'PRICING',
  BLOG = 'BLOG',
  REWARDS = 'REWARDS',
  WALLET = 'WALLET',
  SUPPORT = 'SUPPORT',
  TRAVEL_DNA = 'TRAVEL_DNA',
  COMMUNITY = 'COMMUNITY',
  MARKETPLACE = 'MARKETPLACE',
  ACHIEVEMENTS = 'ACHIEVEMENTS',
  SUSTAINABILITY = 'SUSTAINABILITY',
  REFERRAL = 'REFERRAL',
  INTEGRATIONS = 'INTEGRATIONS',
  BILLING = 'BILLING',
  NOTIFICATIONS = 'NOTIFICATIONS',
  PRIVACY = 'PRIVACY',
  TERMS = 'TERMS',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  REFUND = 'REFUND',
  SHIPPING = 'SHIPPING'
}

export interface DiningRecommendation {
  restaurantName: string;
  cuisine: string;
  dishName: string;
  description: string;
  price: string;
  rating: string;
  ambiance: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  credits: number;
  createdAt: number;
  avatarUrl?: string;
  preferences?: {
    dietary?: string;
    luxury?: number;
  };
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  imageUrl: string;
  date: string;
}

export interface SquadMember {
  user_id: string;
  role: string;
  joined_at: string;
  full_name?: string;
  avatar_url?: string;
}

export interface MissionMessage {
  id: string;
  user_id: string;
  trip_id?: string;
  message: string;
  is_ai_trigger: boolean;
  created_at: string;
}

export interface MissionPoll {
  id: string;
  question: string;
  options: { id: string, text: string }[];
  expires_at: string;
  created_at: string;
}

export interface RewardTier {
  name: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  minPoints: number;
  benefits: string[];
  color: string;
}

export interface StoredTrip {
  id: string;
  user_id: string;
  destination: string;
  total_cost: string;
  duration: string;
  data: TripItinerary;
  status: 'draft' | 'confirmed' | 'paused' | 'completed' | 'cancelled';
  startDate?: string; // Optional: YYYY-MM-DD format
  promptId?: string; // Links back to the original or local prompt log entry
  is_joined?: boolean; // True if current user is NOT the owner
  created_at: number;
  updated_at?: number;
}

export interface StoredPrompt {
  id: string;
  user_id: string;
  prompt: string;
  destination?: string; // Extracted destination for display
  startingLocation?: string; // Starting location for generation
  status: 'generating' | 'ready' | 'failed' | 'consumed' | 'draft' | 'confirmed' | 'completed'; // Background generation status
  result?: TripItinerary; // The generated itinerary (if ready)
  error?: string; // Error message (if failed)
  created_at: number;
}