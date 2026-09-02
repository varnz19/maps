export type TourStatus = 'completed' | 'current' | 'upcoming';

export interface TourHighlight {
  night?: number;
  date?: string;
  title: string;
  description?: string;
  isHero?: boolean;
}

export interface TourStop {
  city: string;
  country: string;
  venue: string;
  dates: string[]; // ["YYYY-MM-DD", ...]
  latitude: number;
  longitude: number;
  status: TourStatus;
  specialEvent?: string;
  highlights?: TourHighlight[];
}

export interface TourData {
  artist: string;
  tourName: string;
  tourStops: TourStop[];
}

export type TravelMode = 'flight' | 'driving' | 'train';
export type DistanceUnit = 'km' | 'mi';

export interface UserTravelPreferences {
  travelMode: TravelMode;
  unit: DistanceUnit;
}

export interface TravelStats {
  distance: number;
  unitLabel: string;
  durationMinutes: number;
  formattedDuration: string;
  co2Kg: number;
  modeLabel: string;
}

export interface WeatherInfo {
  temp: number;
  condition: string;
  icon: string;
  description: string;
}

export interface CountryInfo {
  name: string;
  languages: string[];
  currencies: string[];
  flag: string;
}

export interface TimeInfo {
  localTime: string;
  offset: string;
  differenceMinutes: number;
}

