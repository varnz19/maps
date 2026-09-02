import type { TravelMode, DistanceUnit, TravelStats } from '../types/tour';

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula (returns km).
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  unit: DistanceUnit = 'km'
): number {
  const km = calculateDistanceKm(lat1, lon1, lat2, lon2);
  return unit === 'mi' ? Math.round(km * 0.621371) : km;
}

export function estimateFlightTime(distanceKm: number): {
  hours: number;
  minutes: number;
  formatted: string;
} {
  if (distanceKm <= 0) {
    return { hours: 0, minutes: 0, formatted: '0h 0m' };
  }
  const averageSpeedKmH = 850;
  const flightTimeHours = distanceKm / averageSpeedKmH;
  const totalMinutes = Math.round(flightTimeHours * 60) + 30; // 30m airport buffer
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let formatted = '';
  if (hours > 0) formatted += `${hours}h `;
  formatted += `${minutes}m`;
  return { hours, minutes, formatted };
}

/**
 * Calculates dynamic travel statistics based on travel mode and distance unit.
 */
export function calculateTravelStats(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  mode: TravelMode = 'flight',
  unit: DistanceUnit = 'km'
): TravelStats {
  const distKm = calculateDistanceKm(lat1, lon1, lat2, lon2);
  const distInUnit = unit === 'mi' ? Math.round(distKm * 0.621371) : distKm;
  const unitLabel = unit === 'mi' ? 'miles' : 'km';

  let totalMinutes = 0;
  let co2Kg = 0;
  let modeLabel = 'Flight';

  if (mode === 'driving') {
    modeLabel = 'Car Driving';
    const drivingDistanceKm = distKm * 1.25; // 25% road curvature factor
    const avgSpeed = 90; // km/h
    totalMinutes = Math.round((drivingDistanceKm / avgSpeed) * 60);
    co2Kg = Math.round(drivingDistanceKm * 0.17); // ~170g CO2 per km
  } else if (mode === 'train') {
    modeLabel = 'High-Speed Rail';
    const railDistanceKm = distKm * 1.15; // 15% rail route factor
    const avgSpeed = 220; // km/h
    totalMinutes = Math.round((railDistanceKm / avgSpeed) * 60) + 15; // 15 min station buffer
    co2Kg = Math.round(railDistanceKm * 0.03); // ~30g CO2 per km
  } else {
    // Flight mode
    modeLabel = 'Commercial Flight';
    const flightHours = distKm / 850;
    totalMinutes = Math.round(flightHours * 60) + 30;
    co2Kg = Math.round(distKm * 0.25); // ~250g CO2 per passenger km
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  let formattedDuration = '';
  if (hours > 0) formattedDuration += `${hours}h `;
  formattedDuration += `${minutes}m`;

  return {
    distance: distInUnit,
    unitLabel,
    durationMinutes: totalMinutes,
    formattedDuration,
    co2Kg,
    modeLabel,
  };
}

/**
 * Builds Google Maps Directions URL from user coordinates to venue coordinates.
 */
export function getGoogleMapsDirectionsUrl(
  userLat: number,
  userLon: number,
  destLat: number,
  destLon: number,
  venueName?: string
): string {
  const destination = venueName
    ? encodeURIComponent(`${venueName}, ${destLat},${destLon}`)
    : `${destLat},${destLon}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLon}&destination=${destination}`;
}

/**
 * Generates a smooth geodesic path (great-circle route) between two coordinates.
 */
export function getGeodesicPath(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  pointsCount = 40
): [number, number][] {
  if (lat1 === lat2 && lon1 === lon2) {
    return [[lon1, lat1]];
  }

  const rLat1 = (lat1 * Math.PI) / 180;
  const rLon1 = (lon1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;
  let rLon2 = (lon2 * Math.PI) / 180;

  const lonDiff = rLon2 - rLon1;
  if (lonDiff > Math.PI) {
    rLon2 -= 2 * Math.PI;
  } else if (lonDiff < -Math.PI) {
    rLon2 += 2 * Math.PI;
  }

  const sinDLat = Math.sin((rLat2 - rLat1) / 2);
  const sinDLon = Math.sin((rLon2 - rLon1) / 2);
  const a = sinDLat * sinDLat + Math.cos(rLat1) * Math.cos(rLat2) * sinDLon * sinDLon;
  const d = 2 * Math.asin(Math.sqrt(a));

  if (d === 0) {
    return [[lon1, lat1]];
  }

  const path: [number, number][] = [];

  for (let i = 0; i <= pointsCount; i++) {
    const f = i / pointsCount;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);

    const x = A * Math.cos(rLat1) * Math.cos(rLon1) + B * Math.cos(rLat2) * Math.cos(rLon2);
    const y = A * Math.cos(rLat1) * Math.sin(rLon1) + B * Math.cos(rLat2) * Math.sin(rLon2);
    const z = A * Math.sin(rLat1) + B * Math.sin(rLat2);

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);

    const degLat = (lat * 180) / Math.PI;
    const degLon = (lon * 180) / Math.PI;

    path.push([degLon, degLat]);
  }

  for (let i = 1; i < path.length; i++) {
    let diff = path[i][0] - path[i - 1][0];
    if (diff > 180) {
      path[i][0] -= 360;
    } else if (diff < -180) {
      path[i][0] += 360;
    }
  }

  return path;
}
