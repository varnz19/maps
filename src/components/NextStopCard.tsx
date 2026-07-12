import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, Clock, Calendar, MapPin } from 'lucide-react';
import type { TourStop } from '../types/tour';
import { calculateCountdown, getTimezoneForCity } from '../utils/time';
import { calculateDistance } from '../utils/geo';

interface NextStopCardProps {
  stops: TourStop[];
  onStopSelect: (stop: TourStop) => void;
}

export const NextStopCard: React.FC<NextStopCardProps> = ({ stops, onStopSelect }) => {
  // Find current and next stop
  const currentIndex = stops.findIndex((stop) => stop.status === 'current');
  const currentStop = currentIndex !== -1 ? stops[currentIndex] : null;
  
  // Find the next upcoming stop
  const nextStop = stops.find((stop, idx) => {
    if (currentIndex !== -1 && idx <= currentIndex) return false;
    return stop.status === 'upcoming';
  }) || stops.find(stop => stop.status === 'upcoming'); // Fallback if no current stop

  const [countdown, setCountdown] = useState(() => {
    if (!nextStop) return null;
    const tz = getTimezoneForCity(nextStop.city, nextStop.longitude);
    return calculateCountdown(nextStop.dates, tz);
  });

  useEffect(() => {
    if (!nextStop) return;

    const tz = getTimezoneForCity(nextStop.city, nextStop.longitude);

    // Update countdown every minute
    const interval = setInterval(() => {
      setCountdown(calculateCountdown(nextStop.dates, tz));
    }, 60000);

    // Initial run
    setCountdown(calculateCountdown(nextStop.dates, tz));

    return () => clearInterval(interval);
  }, [nextStop]);

  if (!nextStop) return null;

  // Calculate distance from current stop to next stop
  const distance = currentStop
    ? calculateDistance(
        currentStop.latitude,
        currentStop.longitude,
        nextStop.latitude,
        nextStop.longitude
      )
    : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        onClick={() => onStopSelect(nextStop)}
        className="absolute bottom-6 left-6 z-20 w-80 max-w-[calc(100vw-3rem)] lg:bottom-6 lg:top-auto top-24 lg:left-6 bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-filter backdrop-blur-md cursor-pointer hover:border-purple-400/40 transition-all duration-300 group"
      >
        {/* Card Header Label */}
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-[10px] uppercase tracking-widest text-purple-400 font-bold bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
            Next Destination
          </span>
          {distance !== null && (
            <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-medium bg-zinc-800/60 border border-zinc-700/50 px-2.5 py-0.5 rounded-full">
              <Navigation className="w-3 h-3 text-purple-400" />
              {distance.toLocaleString()} km away
            </span>
          )}
        </div>

        {/* Location & Venue */}
        <div>
          <h3 className="text-lg font-bold text-zinc-100 group-hover:text-purple-400 transition-colors duration-200 truncate">
            {nextStop.city}, {nextStop.country}
          </h3>
          <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1.5 font-medium truncate">
            <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            {nextStop.venue}
          </p>
        </div>

        {/* Divider */}
        <div className="w-full h-[1px] bg-zinc-800 my-4" />

        {/* Countdown Layout */}
        {countdown && countdown.status === 'upcoming' ? (
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3 text-zinc-500" />
              Countdown to Concert
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-zinc-800/50 border border-zinc-800/60 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-zinc-200">{countdown.days}</div>
                <div className="text-[9px] text-zinc-500 uppercase">Days</div>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-800/60 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-zinc-200">{countdown.hours}</div>
                <div className="text-[9px] text-zinc-500 uppercase">Hours</div>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-800/60 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-zinc-200">{countdown.minutes}</div>
                <div className="text-[9px] text-zinc-500 uppercase">Mins</div>
              </div>
            </div>
          </div>
        ) : countdown && countdown.status === 'live' ? (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg font-medium animate-pulse">
            <Calendar className="w-4 h-4" />
            Show is live now! 🎙️
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg font-medium">
            <Calendar className="w-4 h-4" />
            Show day has arrived!
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
