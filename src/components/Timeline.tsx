import React from 'react';
import { motion } from 'framer-motion';
import { Check, Music, Calendar } from 'lucide-react';
import type { TourStop } from '../types/tour';
import { formatDateRange } from '../utils/time';

interface TimelineProps {
  stops: TourStop[];
  selectedStop: TourStop | null;
  onStopSelect: (stop: TourStop) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  stops,
  selectedStop,
  onStopSelect,
}) => {
  return (
    <div className="flex flex-col h-full bg-zinc-900/90 border-r border-zinc-800 overflow-y-auto">
      {/* Timeline Header */}
      <div className="p-6 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-100 tracking-wide flex items-center gap-2">
          <Music className="w-5 h-5 text-purple-500" />
          Tour Route
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Chronological schedule of stops. Click any city to explore.
        </p>
      </div>

      {/* Timeline Container */}
      <div className="flex-1 px-6 py-8 relative">
        {/* Continuous connector line */}
        <div className="absolute left-[39px] top-10 bottom-16 w-[2px] bg-gradient-to-b from-emerald-500 via-purple-500 to-zinc-800" />

        <div className="space-y-8">
          {stops.map((stop, index) => {
            const isSelected = selectedStop?.city === stop.city;
            
            // Status colors and icons
            let statusIcon = null;
            let dotColorClass = '';
            let textColorClass = 'text-zinc-400';
            let titleColorClass = 'text-zinc-300';

            if (stop.status === 'completed') {
              statusIcon = <Check className="w-3.5 h-3.5 text-zinc-950 stroke-[3px]" />;
              dotColorClass = 'bg-emerald-500 border-emerald-400 ring-4 ring-emerald-500/20';
              textColorClass = 'text-zinc-500';
              titleColorClass = 'text-zinc-400 line-through decoration-zinc-800';
            } else if (stop.status === 'current') {
              statusIcon = <div className="w-2.5 h-2.5 rounded-full bg-purple-100 animate-ping" />;
              dotColorClass = 'bg-purple-600 border-purple-400 ring-4 ring-purple-500/30';
              textColorClass = 'text-purple-400 font-medium';
              titleColorClass = 'text-zinc-100 font-semibold';
            } else {
              statusIcon = <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />;
              dotColorClass = 'bg-zinc-900 border-zinc-700 hover:border-zinc-500';
              textColorClass = 'text-zinc-500';
              titleColorClass = 'text-zinc-400';
            }

            return (
              <motion.div
                key={stop.city}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => onStopSelect(stop)}
                className={`relative flex gap-6 items-start cursor-pointer group rounded-xl p-3 -mx-3 transition-colors duration-200 ${
                  isSelected 
                    ? 'bg-purple-900/10 border border-purple-400/25' 
                    : 'border border-transparent hover:bg-zinc-800/40'
                }`}
              >
                {/* Visual Connector Dot */}
                <div className="relative z-10 flex items-center justify-center mt-1">
                  <div
                    className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-300 ${dotColorClass}`}
                  >
                    {statusIcon}
                  </div>
                </div>

                {/* Stop Metadata Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-sm truncate transition-colors duration-200 ${
                      isSelected ? 'text-purple-400 font-bold' : titleColorClass
                    }`}>
                      {stop.city}
                    </h3>
                    <span className="text-[10px] text-zinc-400 font-medium whitespace-nowrap bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-700/50">
                      {stop.status.charAt(0).toUpperCase() + stop.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">{stop.venue}</p>
                  
                  <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span className={textColorClass}>
                      {formatDateRange(stop.dates)}
                    </span>
                  </div>

                  {stop.surpriseSongs && stop.surpriseSongs.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-zinc-400/80 truncate">
                      <Music className="w-3.5 h-3.5 text-purple-400/80 shrink-0" />
                      <span className="truncate">
                        {stop.surpriseSongs.join(' • ')}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
