import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plane,
  Car,
  Train,
  Navigation,
  ExternalLink,
  AlertCircle,
  Ticket
} from 'lucide-react';
import type {
  TourStop,
  WeatherInfo,
  CountryInfo,
  TimeInfo,
  UserTravelPreferences,
  TravelMode,
  DistanceUnit
} from '../types/tour';
import { fetchCountryDetails } from '../services/countries';
import { fetchCurrentWeather } from '../services/weather';
import {
  getTimezoneForCity,
  getLocalTimeDetails,
  formatOffsetDifference,
  calculateCountdown,
  formatDateRange
} from '../utils/time';
import { calculateTravelStats, getGoogleMapsDirectionsUrl } from '../utils/geo';
import type { UserLocation } from '../services/location';

interface SidePanelProps {
  stop: TourStop | null;
  stops?: TourStop[];
  userLocation: UserLocation | null;
  userPrefs: UserTravelPreferences;
  onPrefsChange: (prefs: UserTravelPreferences) => void;
  onStopSelect?: (stop: TourStop) => void;
  onClose: () => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  stop,
  stops = [],
  userLocation,
  userPrefs,
  onPrefsChange,
  onStopSelect,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [country, setCountry] = useState<CountryInfo | null>(null);
  const [time, setTime] = useState<TimeInfo | null>(null);
  const [countdown, setCountdown] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  // Live stop and next upcoming stop for compact toggle
  const liveStop = stops.find((s) => s.status === 'current');
  const currentIndex = stops.findIndex((s) => s.status === 'current');
  const nextUpcomingStop =
    stops.find((s, idx) => {
      if (currentIndex !== -1 && idx <= currentIndex) return false;
      return s.status === 'upcoming';
    }) || stops.find((s) => s.status === 'upcoming');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!stop) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadStopDetails = async () => {
      try {
        const timezone = getTimezoneForCity(stop.city, stop.longitude);
        const [weatherData, countryData] = await Promise.all([
          fetchCurrentWeather(stop.latitude, stop.longitude, stop.city),
          fetchCountryDetails(stop.country),
        ]);

        if (!isMounted) return;

        setTime(getLocalTimeDetails(timezone));
        setWeather(weatherData);
        setCountry(countryData);
        setCountdown(calculateCountdown(stop.dates, timezone));
        setLoading(false);
      } catch (err) {
        console.error('Error loading side panel details:', err);
        if (isMounted) {
          setError('Failed to load local statistics for this destination.');
          setLoading(false);
        }
      }
    };

    loadStopDetails();

    const timeInterval = setInterval(() => {
      if (!isMounted) return;
      const timezone = getTimezoneForCity(stop.city, stop.longitude);
      setTime(getLocalTimeDetails(timezone));
      setCountdown(calculateCountdown(stop.dates, timezone));
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(timeInterval);
    };
  }, [stop]);

  if (!stop) return null;

  // Calculate dynamic travel stats
  const travelStats = userLocation
    ? calculateTravelStats(
        userLocation.latitude,
        userLocation.longitude,
        stop.latitude,
        stop.longitude,
        userPrefs.travelMode,
        userPrefs.unit
      )
    : null;

  const googleMapsUrl = userLocation
    ? getGoogleMapsDirectionsUrl(
        userLocation.latitude,
        userLocation.longitude,
        stop.latitude,
        stop.longitude,
        stop.venue
      )
    : null;

  const animationProps = isMobile
    ? {
        initial: { y: '100%', x: 0 },
        animate: { y: 0, x: 0 },
        exit: { y: '100%', x: 0 },
        transition: { type: 'spring', damping: 30, stiffness: 250 } as const,
      }
    : {
        initial: { x: '100%', y: 0 },
        animate: { x: 0, y: 0 },
        exit: { x: '100%', y: 0 },
        transition: { type: 'spring', damping: 25, stiffness: 200 } as const,
      };

  const isCurrentLive = stop.status === 'current';
  const targetStopForNext = nextUpcomingStop && nextUpcomingStop.city !== stop.city ? nextUpcomingStop : null;

  return (
    <AnimatePresence>
      <motion.div
        {...animationProps}
        className={`fixed z-40 bg-zinc-950/98 border-zinc-800 shadow-2xl backdrop-blur-2xl flex flex-col ${
          isMobile
            ? 'bottom-0 left-0 w-full h-[80vh] rounded-t-3xl border-t'
            : 'top-0 right-0 h-full w-[440px] border-l'
        }`}
      >
        {/* Header */}
        <div className="p-6 pb-5 border-b border-zinc-800/60">
          {/* Top Row: Context Switcher & Close */}
          <div className="flex items-center justify-between gap-3 mb-4">
            {/* Compact Segmented Toggle: Selected / Next Up */}
            <div className="inline-flex items-center bg-zinc-900 border border-zinc-800/80 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => onStopSelect && onStopSelect(stop)}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all bg-zinc-800 text-zinc-100 shadow-sm cursor-pointer"
              >
                {stop.city}
              </button>
              {targetStopForNext && onStopSelect && (
                <button
                  onClick={() => onStopSelect(targetStopForNext)}
                  className="px-2.5 py-1 rounded-md text-[11px] text-zinc-400 hover:text-zinc-200 transition-all font-medium cursor-pointer"
                >
                  Next: {targetStopForNext.city}
                </button>
              )}
              {liveStop && liveStop.city !== stop.city && onStopSelect && (
                <button
                  onClick={() => onStopSelect(liveStop)}
                  className="px-2.5 py-1 rounded-md text-[11px] text-purple-400 hover:text-purple-300 transition-all font-medium cursor-pointer flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  Live: {liveStop.city}
                </button>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors cursor-pointer"
              aria-label="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* City, Venue & Status */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
                  {stop.city}
                </h2>
                {country && (
                  <img
                    src={country.flag}
                    alt={stop.country}
                    className="w-5 h-3.5 object-cover rounded-xs border border-zinc-700/60"
                  />
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {stop.venue}, {stop.country}
              </p>
            </div>

            {/* Single Live/Status Indicator */}
            <div className="shrink-0 pt-1">
              {isCurrentLive ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                  <span className="text-xs font-semibold text-purple-400">Live</span>
                </div>
              ) : stop.status === 'completed' ? (
                <span className="text-xs text-zinc-500 font-medium">Completed</span>
              ) : (
                <span className="text-xs text-zinc-400 font-medium">Upcoming</span>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-16 bg-zinc-900/60 rounded-xl" />
              <div className="h-20 bg-zinc-900/60 rounded-xl" />
              <div className="h-16 bg-zinc-900/60 rounded-xl" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-8 h-8 text-zinc-500 mb-2" />
              <p className="text-xs text-zinc-400">{error}</p>
            </div>
          ) : (
            <>
              {/* Section 1: Key Stats Row (Clean, Unbordered Row with Subtle Dividers) */}
              <div className="space-y-3">
                {/* Quiet Mode & Unit Toggles */}
                {userLocation && (
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pb-1">
                    <span className="uppercase font-mono tracking-wider text-[10px]">Travel from base</span>
                    <div className="flex items-center gap-2">
                      {/* Mode Segment */}
                      <div className="inline-flex bg-zinc-900 rounded-md p-0.5 border border-zinc-800/60">
                        {(
                          [
                            { id: 'flight', icon: Plane, label: 'Flight' },
                            { id: 'driving', icon: Car, label: 'Drive' },
                            { id: 'train', icon: Train, label: 'Train' },
                          ] as const
                        ).map((m) => {
                          const Icon = m.icon;
                          const isSelected = userPrefs.travelMode === m.id;
                          return (
                            <button
                              key={m.id}
                              onClick={() =>
                                onPrefsChange({ ...userPrefs, travelMode: m.id as TravelMode })
                              }
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-zinc-800 text-zinc-100'
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                              title={m.label}
                            >
                              <Icon className="w-3 h-3" />
                            </button>
                          );
                        })}
                      </div>

                      {/* Unit Segment */}
                      <div className="inline-flex bg-zinc-900 rounded-md p-0.5 border border-zinc-800/60 font-mono text-[10px]">
                        {(
                          [
                            { id: 'km', label: 'KM' },
                            { id: 'mi', label: 'MI' },
                          ] as const
                        ).map((u) => {
                          const isSelected = userPrefs.unit === u.id;
                          return (
                            <button
                              key={u.id}
                              onClick={() =>
                                onPrefsChange({ ...userPrefs, unit: u.id as DistanceUnit })
                              }
                              className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-zinc-800 text-zinc-100 font-semibold'
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              {u.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Single Clean Stat Row */}
                {travelStats ? (
                  <div className="grid grid-cols-3 divide-x divide-zinc-800/60 py-3 bg-zinc-900/30 rounded-xl border border-zinc-800/40">
                    <div className="px-3 text-center">
                      <div className="text-lg font-semibold text-zinc-100 font-mono tabular-nums tracking-tight">
                        {travelStats.distance.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
                        {travelStats.unitLabel}
                      </div>
                    </div>

                    <div className="px-3 text-center">
                      <div className="text-lg font-semibold text-zinc-100 font-mono tabular-nums tracking-tight">
                        {travelStats.formattedDuration}
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
                        Duration
                      </div>
                    </div>

                    <div className="px-3 text-center">
                      <div className="text-lg font-semibold text-zinc-100 font-mono tabular-nums tracking-tight">
                        {travelStats.co2Kg} kg
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
                        CO₂ Impact
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-2.5 px-3 text-center text-xs text-zinc-500 bg-zinc-900/30 rounded-xl border border-zinc-800/40 font-mono">
                    Concert dates: {formatDateRange(stop.dates)}
                  </div>
                )}
              </div>

              {/* Section 2: Schedule & Countdown */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-medium">Concert Schedule</span>
                  <span className="text-zinc-300 font-mono text-[11px]">{formatDateRange(stop.dates)}</span>
                </div>

                {countdown && countdown.status === 'upcoming' && (
                  <div className="flex items-baseline gap-2 text-xs text-zinc-400 bg-zinc-900/30 px-3 py-2 rounded-lg border border-zinc-800/40 font-mono tabular-nums">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-sans">Starts in</span>
                    <span className="font-semibold text-zinc-200">
                      {countdown.days}d {countdown.hours}h {countdown.minutes}m
                    </span>
                  </div>
                )}
              </div>

              {/* Section 3: Milestones & Highlights (Simple Vertical List) */}
              {stop.highlights && stop.highlights.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-zinc-900">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Tour Milestones
                  </span>
                  <div className="space-y-1.5">
                    {stop.highlights.map((h, i) => {
                      if (h.isHero) {
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-3 border-l-2 border-purple-500 pl-3 py-1.5 bg-purple-500/5 rounded-r text-xs"
                          >
                            {h.date && (
                              <span className="font-mono text-[11px] text-zinc-400 shrink-0 w-20">
                                {h.date}
                              </span>
                            )}
                            <span className="font-medium text-zinc-100">{h.title}</span>
                          </div>
                        );
                      }

                      return (
                        <div key={i} className="flex items-center gap-3 pl-3 py-1 text-xs">
                          {h.date && (
                            <span className="font-mono text-[11px] text-zinc-500 shrink-0 w-20">
                              {h.date}
                            </span>
                          )}
                          <span className="text-zinc-300">{h.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section 4: Local Weather & Time (Unbordered Clean Layout) */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-900 text-xs">
                {/* Weather */}
                {weather && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Weather</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-semibold text-zinc-100 font-mono">{weather.temp}°C</span>
                      <span className="text-xs text-zinc-400 capitalize truncate">{weather.description}</span>
                    </div>
                  </div>
                )}

                {/* Local Venue Time */}
                {time && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Local Venue Time</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-semibold text-zinc-100 font-mono tabular-nums">{time.localTime}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{time.offset}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 block truncate">
                      {formatOffsetDifference(time.differenceMinutes)} from base
                    </span>
                  </div>
                )}
              </div>

              {/* Section 5: CTAs (Primary Solid Purple + Secondary Ghost/Outline) */}
              <div className="space-y-2 pt-3 border-t border-zinc-900">
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium py-2.5 px-4 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Get Directions to Venue</span>
                  </a>
                )}

                <a
                  href="https://ibighit.com/bts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 font-medium py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Tour & Ticket Info</span>
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                </a>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
