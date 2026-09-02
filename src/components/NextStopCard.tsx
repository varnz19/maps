import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, Clock, Calendar, MapPin, Sparkles } from 'lucide-react';
import type { TourStop, UserTravelPreferences } from '../types/tour';
import { calculateCountdown, getTimezoneForCity } from '../utils/time';
import { calculateDistance } from '../utils/geo';

interface NextStopCardProps {
  stops: TourStop[];
  userPrefs?: UserTravelPreferences;
  onStopSelect: (stop: TourStop) => void;
}

export const NextStopCard: React.FC<NextStopCardProps> = ({
  stops,
  userPrefs = { travelMode: 'flight', unit: 'km' },
  onStopSelect,
}) => {
  const currentIndex = stops.findIndex((stop) => stop.status === 'current');
  const currentStop = currentIndex !== -1 ? stops[currentIndex] : null;

  const nextStop =
    stops.find((stop, idx) => {
      if (currentIndex !== -1 && idx <= currentIndex) return false;
      return stop.status === 'upcoming';
    }) || stops.find((stop) => stop.status === 'upcoming');

  const [countdown, setCountdown] = useState(() => {
    if (!nextStop) return null;
    const tz = getTimezoneForCity(nextStop.city, nextStop.longitude);
    return calculateCountdown(nextStop.dates, tz);
  });

  useEffect(() => {
    if (!nextStop) return;
    const tz = getTimezoneForCity(nextStop.city, nextStop.longitude);

    const interval = setInterval(() => {
      setCountdown(calculateCountdown(nextStop.dates, tz));
    }, 60000);

    setCountdown(calculateCountdown(nextStop.dates, tz));
    return () => clearInterval(interval);
  }, [nextStop]);

  if (!nextStop) return null;

  const distance = currentStop
    ? calculateDistance(
        currentStop.latitude,
        currentStop.longitude,
        nextStop.latitude,
        nextStop.longitude,
        userPrefs.unit
      )
    : null;

  const unitLabel = userPrefs.unit === 'mi' ? 'miles' : 'km';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        onClick={() => onStopSelect(nextStop)}
        className="absolute bottom-6 left-6 z-20 w-80 max-w-[calc(100vw-3rem)] bg-zinc-950/90 border border-purple-500/30 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl cursor-pointer hover:border-purple-400/60 transition-all duration-300 group"
      >
        {/* Header Label */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-widest text-purple-300 font-extrabold bg-purple-500/20 border border-purple-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
            Next Concert
          </span>
          {distance !== null && (
            <span className="text-[10px] text-zinc-300 flex items-center gap-1 font-semibold bg-zinc-900/80 border border-zinc-800 px-2.5 py-0.5 rounded-full">
              <Navigation className="w-3 h-3 text-purple-400" />
              {distance.toLocaleString()} {unitLabel} away
            </span>
          )}
        </div>

        {/* Location & Venue */}
        <div>
          <h3 className="text-lg font-black text-zinc-100 group-hover:text-purple-300 transition-colors truncate">
            {nextStop.city}, {nextStop.country}
          </h3>
          <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1 font-medium truncate">
            <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            {nextStop.venue}
          </p>
        </div>

        {/* Divider */}
        <div className="w-full h-[1px] bg-zinc-800/80 my-3.5" />

        {/* Countdown */}
        {countdown && countdown.status === 'upcoming' ? (
          <div>
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1 font-bold">
              <Clock className="w-3 h-3 text-purple-400" />
              Countdown to Concert
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-2 text-center">
                <div className="text-lg font-black text-zinc-100">{countdown.days}</div>
                <div className="text-[9px] text-zinc-400 uppercase font-semibold">Days</div>
              </div>
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-2 text-center">
                <div className="text-lg font-black text-zinc-100">{countdown.hours}</div>
                <div className="text-[9px] text-zinc-400 uppercase font-semibold">Hours</div>
              </div>
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-2 text-center">
                <div className="text-lg font-black text-zinc-100">{countdown.minutes}</div>
                <div className="text-[9px] text-zinc-400 uppercase font-semibold">Mins</div>
              </div>
            </div>
          </div>
        ) : countdown && countdown.status === 'live' ? (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 px-3 py-2 rounded-xl font-bold animate-pulse">
            <Calendar className="w-4 h-4" />
            Show is live now! 🎙️
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-xl font-bold">
            <Calendar className="w-4 h-4" />
            Show day has arrived!
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
