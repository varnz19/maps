import type { UserTravelPreferences } from '../types/tour';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  isMocked: boolean;
  cityName?: string;
}

// Default fallback coordinate (e.g., Seoul / Goyang or London)
export const DEFAULT_USER_LOCATION: UserLocation = {
  latitude: 37.5665,
  longitude: 126.9780,
  isMocked: true,
  cityName: 'Seoul (Default Base)',
};

const LOCATION_STORAGE_KEY = 'tourverse_user_location';
const PREFS_STORAGE_KEY = 'tourverse_travel_prefs';

export function getSavedLocation(): UserLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load user location from localStorage:', e);
  }
  return null;
}

export function saveSavedLocation(location: UserLocation): void {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
  } catch (e) {
    console.error('Failed to save user location to localStorage:', e);
  }
}

export function getSavedTravelPrefs(): UserTravelPreferences {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load travel preferences from localStorage:', e);
  }
  return { travelMode: 'flight', unit: 'km' };
}

export function saveSavedTravelPrefs(prefs: UserTravelPreferences): void {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('Failed to save travel preferences to localStorage:', e);
  }
}

/**
 * Requests the user's geolocation using the browser navigator API.
 * Resolves with the coordinates if successful, or falls back to saved/default location.
 */
export function getUserLocation(): Promise<UserLocation> {
  return new Promise((resolve) => {
    const saved = getSavedLocation();
    if (saved && !saved.isMocked) {
      resolve(saved);
      return;
    }

    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser. Using fallback.');
      resolve(saved || DEFAULT_USER_LOCATION);
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 300000,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          isMocked: false,
        };
        saveSavedLocation(loc);
        resolve(loc);
      },
      (error) => {
        console.warn(`Geolocation error code ${error.code}. Using fallback.`);
        resolve(saved || DEFAULT_USER_LOCATION);
      },
      options
    );
  });
}
