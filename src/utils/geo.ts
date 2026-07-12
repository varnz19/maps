/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 */
export function calculateDistance(
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
  const distance = R * c;
  return Math.round(distance);
}

/**
 * Estimates flight time based on distance (km).
 * Average commercial flight speed is roughly 800-850 km/h.
 * We add a 30-minute buffer for taxiing, takeoff, and landing.
 */
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
  
  // Convert to total minutes and add a 30-minute buffer
  const totalMinutes = Math.round(flightTimeHours * 60) + 30;
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  let formatted = '';
  if (hours > 0) {
    formatted += `${hours}h `;
  }
  formatted += `${minutes}m`;
  
  return { hours, minutes, formatted };
}

/**
 * Generates a smooth, curved geodesic path (great-circle route) between two points
 * and automatically unwraps the longitudes to handle anti-meridian crossing.
 */
export function getGeodesicPath(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  pointsCount = 40
): [number, number][] {
  // If the coordinates are identical, return just one point
  if (lat1 === lat2 && lon1 === lon2) {
    return [[lon1, lat1]];
  }

  // Convert to radians
  const rLat1 = (lat1 * Math.PI) / 180;
  const rLon1 = (lon1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;
  let rLon2 = (lon2 * Math.PI) / 180;

  // Shortest path logic on the sphere for longitudes crossing the wrap
  const lonDiff = rLon2 - rLon1;
  if (lonDiff > Math.PI) {
    rLon2 -= 2 * Math.PI;
  } else if (lonDiff < -Math.PI) {
    rLon2 += 2 * Math.PI;
  }

  // Angular distance d between points
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
    
    // Spherical linear interpolation formula (Slerp-like for great circle)
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);

    const x = A * Math.cos(rLat1) * Math.cos(rLon1) + B * Math.cos(rLat2) * Math.cos(rLon2);
    const y = A * Math.cos(rLat1) * Math.sin(rLon1) + B * Math.cos(rLat2) * Math.sin(rLon2);
    const z = A * Math.sin(rLat1) + B * Math.sin(rLat2);

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);

    // Convert back to degrees
    const degLat = (lat * 180) / Math.PI;
    const degLon = (lon * 180) / Math.PI;

    path.push([degLon, degLat]);
  }

  // Ensure unwrapped/continuous coordinates sequence
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

