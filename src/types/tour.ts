export type TourStatus = 'completed' | 'current' | 'upcoming';

export interface TourStop {
  city: string;
  country: string;
  venue: string;
  dates: string[]; // ["YYYY-MM-DD", ...]
  latitude: number;
  longitude: number;
  status: TourStatus;
  surpriseSongs: string[];
}

export interface TourData {
  artist: string;
  tourName: string;
  tourStops: TourStop[];
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
