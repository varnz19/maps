export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  isMocked: boolean;
}

// Default fallback coordinate (e.g., London, UK)
export const DEFAULT_USER_LOCATION: UserLocation = {
  latitude: 51.5074,
  longitude: -0.1278,
  isMocked: true,
};

/**
 * Requests the user's geolocation using the browser navigator API.
 * Resolves with the coordinates if successful, or falls back to a default location if denied/failed.
 */
export function getUserLocation(): Promise<UserLocation> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser. Using default fallback.');
      resolve(DEFAULT_USER_LOCATION);
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 600000, // 10 minutes cache
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          isMocked: false,
        });
      },
      (error) => {
        let reason = 'Unknown error';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reason = 'Permission denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            reason = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            reason = 'Request timed out';
            break;
        }
        console.warn(`Geolocation failed: ${reason}. Using default fallback (London).`);
        resolve(DEFAULT_USER_LOCATION);
      },
      options
    );
  });
}
