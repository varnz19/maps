import type { TimeInfo } from '../types/tour';

// Map of known cities to IANA Time Zone IDs
const CITY_TIMEZONE_MAP: Record<string, string> = {
  // Tour Stops Specific Mapping
  'Goyang': 'Asia/Seoul',
  'Busan': 'Asia/Seoul',
  'Seoul': 'Asia/Seoul',
  'Tokyo': 'Asia/Tokyo',
  'London': 'Europe/London',
  'Munich': 'Europe/Berlin',
  'Paris': 'Europe/Paris',
  'Tampa': 'America/New_York',
  'El Paso': 'America/Denver',
  'Mexico City': 'America/Mexico_City',
  'Stanford': 'America/Los_Angeles',
  'Las Vegas': 'America/Los_Angeles',
  'East Rutherford': 'America/New_York',
  'Foxborough': 'America/New_York',
  'Baltimore': 'America/New_York',
  'Arlington': 'America/Chicago',
  'Toronto': 'America/Toronto',
  'Chicago': 'America/Chicago',
  'Los Angeles': 'America/Los_Angeles',
  'Kaohsiung': 'Asia/Taipei',
  'Sydney': 'Australia/Sydney',
  'New York': 'America/New_York',
  'Berlin': 'Europe/Berlin'
};

/**
 * Gets the IANA timezone string for a city, falling back to longitude approximation.
 */
export function getTimezoneForCity(city: string, longitude: number): string {
  const normalizedCity = city.trim();
  if (CITY_TIMEZONE_MAP[normalizedCity]) {
    return CITY_TIMEZONE_MAP[normalizedCity];
  }
  // Fallback: Approximate timezone offset by longitude (15 degrees = 1 hour offset)
  const approxOffsetHours = Math.round(longitude / 15);
  // Note: IANA Etc/GMT timezone signs are inverted (UTC+1 is Etc/GMT-1, UTC-1 is Etc/GMT+1)
  const sign = approxOffsetHours >= 0 ? '-' : '+';
  const absHours = Math.abs(approxOffsetHours).toString().padStart(2, '0');
  return `Etc/GMT${sign}${parseInt(absHours)}`;
}

export interface CountdownStatus {
  status: 'upcoming' | 'live' | 'completed';
  days: number;
  hours: number;
  minutes: number;
  isPast: boolean;
}

/**
 * Calculates countdown to a concert date series, taking into account timezone and multiple show dates.
 */
export function calculateCountdown(dates: string[], timezone: string): CountdownStatus {
  const now = new Date();
  
  // Calculate target offset relative to UTC for the current instant
  let targetOffsetMinutes = 0;
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    });
    const parts = formatter.formatToParts(now);
    const tzPart = parts.find(p => p.type === 'timeZoneName')?.value || '';
    if (tzPart.includes('+') || tzPart.includes('-')) {
      const match = tzPart.match(/GMT([+-])(\d+)(?::(\d+))?/);
      if (match) {
        const sign = match[1] === '+' ? 1 : -1;
        const hours = parseInt(match[2], 10);
        const mins = match[3] ? parseInt(match[3], 10) : 0;
        targetOffsetMinutes = sign * (hours * 60 + mins);
      }
    }
  } catch (error) {
    console.error('Error finding offset for countdown timezone:', error);
  }

  // Helper to convert target local date + time to absolute UTC timestamp
  const getTargetUTC = (dateStr: string, timeStr: string): number => {
    // Treat dateStr + timeStr as UTC initially
    const localAsUTC = new Date(`${dateStr}T${timeStr}Z`);
    // Shift by timezone offset to get actual UTC time
    return localAsUTC.getTime() - targetOffsetMinutes * 60 * 1000;
  };

  const nowMs = now.getTime();
  
  // Concerts start at 19:30 (7:30 PM) local and end at 23:00 (11:00 PM) local
  const showTimes = dates.map(d => ({
    start: getTargetUTC(d, '19:30:00'),
    end: getTargetUTC(d, '23:00:00'),
    dateStr: d
  }));

  // 1. Check if currently live
  const liveShow = showTimes.find(show => nowMs >= show.start && nowMs <= show.end);
  if (liveShow) {
    return {
      status: 'live',
      days: 0,
      hours: 0,
      minutes: 0,
      isPast: false
    };
  }

  // 2. Find the next upcoming show (earliest show that hasn't started yet)
  const nextShow = showTimes
    .filter(show => nowMs < show.start)
    .sort((a, b) => a.start - b.start)[0];

  if (nextShow) {
    const diffMs = nextShow.start - nowMs;
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;

    return {
      status: 'upcoming',
      days,
      hours,
      minutes,
      isPast: false
    };
  }

  // 3. All shows are in the past
  return {
    status: 'completed',
    days: 0,
    hours: 0,
    minutes: 0,
    isPast: true
  };
}

/**
 * Formats a timezone offset difference in a user-friendly format (+3 hr 30 min, -5 hr, etc.)
 */
export function formatOffsetDifference(diffMinutes: number): string {
  if (diffMinutes === 0) return 'Same time';
  
  const isAhead = diffMinutes > 0;
  const absMinutes = Math.abs(diffMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  
  const sign = isAhead ? '+' : '-';
  let formatted = `${sign}${hours} hr`;
  if (minutes > 0) {
    formatted += ` ${minutes} min`;
  }
  return formatted;
}

/**
 * Calculates current local time in target timezone and the offset difference from the user's local time.
 */
export function getLocalTimeDetails(timezone: string): TimeInfo {
  try {
    const now = new Date();
    
    // Get target local time string
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const localTime = formatter.format(now);

    // Calculate target offset relative to UTC
    const targetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    });
    
    const parts = targetFormatter.formatToParts(now);
    const tzPart = parts.find(p => p.type === 'timeZoneName')?.value || '';
    
    // Extract offset from format (e.g. "GMT+9", "GMT-05:00", "GMT")
    let targetOffsetMinutes = 0;
    if (tzPart.includes('+') || tzPart.includes('-')) {
      const match = tzPart.match(/GMT([+-])(\d+)(?::(\d+))?/);
      if (match) {
        const sign = match[1] === '+' ? 1 : -1;
        const hours = parseInt(match[2], 10);
        const mins = match[3] ? parseInt(match[3], 10) : 0;
        targetOffsetMinutes = sign * (hours * 60 + mins);
      }
    }
    
    // User local offset relative to UTC (note: getTimezoneOffset returns minutes *west* of UTC, so invert it)
    const userOffsetMinutes = -now.getTimezoneOffset();
    
    // Time difference: target - user
    const differenceMinutes = targetOffsetMinutes - userOffsetMinutes;
    
    // Format offset label (e.g., GMT+9)
    const offsetLabel = tzPart.replace('Greenwich Mean Time', 'GMT');
    
    return {
      localTime,
      offset: offsetLabel,
      differenceMinutes,
    };
  } catch (error) {
    console.error('Error calculating timezone details:', error);
    // Fallback to local system time if errors occur
    return {
      localTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      offset: 'UTC',
      differenceMinutes: 0,
    };
  }
}

/**
 * Formats a list of dates into a human-readable date range.
 */
export function formatDateRange(dates: string[]): string {
  if (!dates || dates.length === 0) return '';
  if (dates.length === 1) {
    return new Date(dates[0] + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Parse first and last dates
  const first = new Date(dates[0] + 'T00:00:00');
  const last = new Date(dates[dates.length - 1] + 'T00:00:00');

  const firstMonth = first.toLocaleDateString('en-US', { month: 'short' });
  const lastMonth = last.toLocaleDateString('en-US', { month: 'short' });
  const firstDay = first.getDate();
  const lastDay = last.getDate();
  const firstYear = first.getFullYear();
  const lastYear = last.getFullYear();

  if (firstYear !== lastYear) {
    return `${firstMonth} ${firstDay}, ${firstYear} - ${lastMonth} ${lastDay}, ${lastYear}`;
  }

  if (firstMonth !== lastMonth) {
    return `${firstMonth} ${firstDay} - ${lastMonth} ${lastDay}, ${firstYear}`;
  }

  return `${firstMonth} ${firstDay} - ${lastDay}, ${firstYear}`;
}

