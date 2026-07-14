import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Globe,
  Plane,
  Navigation,
  Compass,
  AlertCircle,
  Music
} from 'lucide-react';
import type { TourStop, WeatherInfo, CountryInfo, TimeInfo } from '../types/tour';
import { fetchCountryDetails } from '../services/countries';
import { fetchCurrentWeather } from '../services/weather';
import { getTimezoneForCity, getLocalTimeDetails, formatOffsetDifference, calculateCountdown, formatDateRange } from '../utils/time';
import { calculateDistance, estimateFlightTime } from '../utils/geo';
import type { UserLocation } from '../services/location';

interface SidePanelProps {
  stop: TourStop | null;
  userLocation: UserLocation | null;
  onClose: () => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  stop,
  userLocation,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [country, setCountry] = useState<CountryInfo | null>(null);
  const [time, setTime] = useState<TimeInfo | null>(null);
  const [countdown, setCountdown] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  // Monitor resize for layout decisions
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch all stop-specific API details
  useEffect(() => {
    if (!stop) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadStopDetails = async () => {
      try {
        const timezone = getTimezoneForCity(stop.city, stop.longitude);
        
        // Parallel API fetching
        const [weatherData, countryData] = await Promise.all([
          fetchCurrentWeather(stop.latitude, stop.longitude, stop.city),
          fetchCountryDetails(stop.country),
        ]);

        if (!isMounted) return;

        const timeData = getLocalTimeDetails(timezone);

        setWeather(weatherData);
        setCountry(countryData);
        setTime(timeData);
        setCountdown(calculateCountdown(stop.dates, timezone));
        setLoading(false);
      } catch (err) {
        console.error('Error loading side panel statistics:', err);
        if (isMounted) {
          setError('Failed to load local statistics for this destination.');
          setLoading(false);
        }
      }
    };

    loadStopDetails();

    // Set up a clock ticker for local time and countdown
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

  // Calculate distance & flight stats from user location
  const distanceToUser = userLocation
    ? calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        stop.latitude,
        stop.longitude
      )
    : null;

  const flightDetails = distanceToUser ? estimateFlightTime(distanceToUser) : null;

  // Set animation configurations based on viewport
  const animationProps = isMobile
    ? {
        initial: { y: '100%', x: 0 },
        animate: { y: 0, x: 0 },
        exit: { y: '100%', x: 0 },
        transition: { type: 'spring', damping: 30, stiffness: 250 } as const
      }
    : {
        initial: { x: '100%', y: 0 },
        animate: { x: 0, y: 0 },
        exit: { x: '100%', y: 0 },
        transition: { type: 'spring', damping: 25, stiffness: 200 } as const
      };

  return (
    <AnimatePresence>
      <motion.div
        {...animationProps}
        className={`fixed z-40 bg-zinc-900/95 border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-filter backdrop-blur-lg flex flex-col ${
          isMobile
            ? 'bottom-0 left-0 w-full h-[70vh] rounded-t-3xl border-t'
            : 'top-0 right-0 h-full w-[480px] border-l'
        }`}
      >
        {/* Header containing city details */}
        <div className={`relative bg-gradient-to-br from-purple-900/30 to-zinc-900/20 border-b border-zinc-800 flex flex-col justify-end ${
          isMobile ? 'p-5 pt-7 h-36' : 'p-6 h-48'
        }`}>
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors duration-200"
          >
            <X className="w-4 h-4" />
          </button>

          <div>
            <span className={`text-[9px] uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full inline-block mb-2 border ${
              countdown?.status === 'live'
                ? 'text-red-400 bg-red-500/10 border-red-500/20'
                : countdown?.status === 'completed'
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : 'text-purple-400 bg-purple-500/10 border-purple-500/20'
            }`}>
              {(countdown?.status || stop.status)} stop
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 flex items-center gap-2">
              {stop.city}
              {country && (
                <img
                  src={country.flag}
                  alt={stop.country}
                  className="w-7 h-4.5 object-cover rounded shadow border border-zinc-800"
                />
              )}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium mt-1">
              {stop.venue}, {stop.country}
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 sm:space-y-6">
          {loading ? (
            /* Premium Loading Skeleton */
            <div className="space-y-6 animate-pulse">
              <div className="h-20 bg-zinc-900 rounded-xl" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-24 bg-zinc-900 rounded-xl" />
                <div className="h-24 bg-zinc-900 rounded-xl" />
              </div>
              <div className="h-32 bg-zinc-900 rounded-xl" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
              <p className="text-sm text-zinc-300 font-medium">{error}</p>
            </div>
          ) : (
            /* Real Data Layout */
            <>
              {/* Concert Timing Panel */}
              <div className="bg-zinc-800/40 border border-zinc-800 rounded-xl p-4 sm:p-5">
                <div className="flex items-center gap-2 text-zinc-100 font-bold mb-3">
                  <Calendar className="w-4.5 h-4.5 text-purple-500" />
                  Concert Details
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Concert Date(s)</span>
                    <span className="text-zinc-300 font-medium mt-0.5 block">
                      {formatDateRange(stop.dates)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Status / Countdown</span>
                    <span className="text-zinc-300 font-medium mt-0.5 block">
                      {countdown ? (
                        countdown.status === 'live' ? (
                          <span className="text-red-400 font-bold flex items-center gap-1.5 animate-pulse">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            Live Now 🎙️
                          </span>
                        ) : countdown.status === 'upcoming' ? (
                          <span className="text-purple-400 font-semibold">
                            {countdown.days}d {countdown.hours}h {countdown.minutes}m
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-semibold">Completed ✓</span>
                        )
                      ) : (
                        <span className="text-zinc-500">Calculating...</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Surprise Songs Panel */}
              {stop.surpriseSongs && stop.surpriseSongs.length > 0 && (
                <div className="bg-zinc-800/40 border border-zinc-800 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-zinc-100 font-bold mb-3">
                    <Music className="w-4.5 h-4.5 text-purple-500" />
                    Surprise Songs
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {stop.surpriseSongs.map((song, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 bg-zinc-900/30 border border-zinc-800/60 rounded-lg p-3 hover:border-purple-500/20 transition-all duration-300 group"
                      >
                        <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                          Song {i + 1}
                        </span>
                        <span className="text-xs font-bold text-zinc-200 group-hover:text-purple-300 transition-colors duration-200">
                          {song}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weather & Timezone Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Weather card */}
                {weather && (
                  <div className="bg-zinc-800/40 border border-zinc-800 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Weather</span>
                      <div className="flex items-center gap-1.5">
                        <img src={weather.icon} alt={weather.condition} className="w-8 h-8 -ml-1 object-contain" />
                        <div>
                          <span className="text-lg font-bold text-zinc-100">{weather.temp}°C</span>
                          <span className="text-[9px] text-zinc-400 block capitalize truncate max-w-[80px]">{weather.description}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timezone card */}
                {time && (
                  <div className="bg-zinc-800/40 border border-zinc-800 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Local Time</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-bold text-zinc-100">{time.localTime}</span>
                        <span className="text-[8px] text-zinc-400 font-mono">{time.offset}</span>
                      </div>
                      <span className={`text-[9px] block mt-1 truncate ${
                        time.differenceMinutes > 0 ? 'text-purple-400' : 'text-zinc-400'
                      }`}>
                        {formatOffsetDifference(time.differenceMinutes)} from you
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Travel Statistics (User Relational Distance) */}
              {userLocation && (
                <div className="bg-zinc-800/40 border border-zinc-800 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center justify-between text-zinc-100 font-bold mb-3">
                    <span className="flex items-center gap-2">
                      <Plane className="w-4.5 h-4.5 text-purple-500" />
                      Travel Statistics
                    </span>
                    {userLocation.isMocked && (
                      <span className="text-[8px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700/50">
                        Default Location (London)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-lg p-2.5">
                      <span className="text-[9px] text-zinc-400 uppercase block">Distance from you</span>
                      <span className="text-sm font-bold text-zinc-200 mt-1 block flex items-center gap-1">
                        <Navigation className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        {distanceToUser?.toLocaleString()} km
                      </span>
                    </div>

                    <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-lg p-2.5">
                      <span className="text-[9px] text-zinc-400 uppercase block">Flight Time</span>
                      <span className="text-sm font-bold text-zinc-200 mt-1 block flex items-center gap-1">
                        <Compass className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        {flightDetails?.formatted}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Country Details (REST Countries) */}
              {country && (
                <div className="bg-zinc-800/40 border border-zinc-800 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-zinc-100 font-bold mb-3.5">
                    <Globe className="w-4.5 h-4.5 text-purple-500" />
                    Country Information
                  </div>

                  <div className="space-y-3 text-xs sm:text-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/40">
                      <span className="text-zinc-400 font-medium">Languages</span>
                      <span className="text-zinc-300 font-semibold truncate max-w-[200px]">
                        {country.languages.join(', ')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/40">
                      <span className="text-zinc-400 font-medium">Currencies</span>
                      <span className="text-zinc-300 font-semibold truncate max-w-[200px]">
                        {country.currencies.join(', ')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-zinc-400 font-medium">Official Name</span>
                      <span className="text-zinc-300 font-semibold truncate max-w-[200px]">{country.name}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
