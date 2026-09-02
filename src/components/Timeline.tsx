import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Calendar, LocateFixed, Sparkles, Filter } from 'lucide-react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const stopRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [filter, setFilter] = useState<'all' | 'completed' | 'current' | 'upcoming'>('all');

  const currentStop = stops.find((s) => s.status === 'current') || stops[0];

  const scrollToStop = (city: string) => {
    const el = stopRefs.current[city];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Scroll to current / present stop on initial load
  useEffect(() => {
    if (currentStop) {
      const timer = setTimeout(() => {
        scrollToStop(currentStop.city);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentStop]);

  const filteredStops = stops.filter((stop) => {
    if (filter === 'all') return true;
    return stop.status === filter;
  });

  return (
    <div className="flex flex-col h-full bg-zinc-950/95 border-r border-zinc-800/80 backdrop-blur-xl">
      {/* Timeline Header */}
      <div className="p-5 border-b border-zinc-800/80 bg-zinc-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 tracking-wide">
                ARIRANG Tour Schedule
              </h2>
              <p className="text-[10px] text-purple-400 font-medium">BTS World Tour 2026</p>
            </div>
          </div>

          {/* Jump to Present Button */}
          <button
            onClick={() => {
              if (currentStop) {
                onStopSelect(currentStop);
                scrollToStop(currentStop.city);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-semibold shadow-lg shadow-purple-950/50 transition-all cursor-pointer hover:scale-105"
            title="Scroll to current present show"
          >
            <LocateFixed className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>Present</span>
          </button>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-zinc-800/60 overflow-x-auto text-[11px]">
          <Filter className="w-3 h-3 text-zinc-500 shrink-0 mr-1" />
          {(['all', 'completed', 'current', 'upcoming'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-lg capitalize font-medium transition-all shrink-0 cursor-pointer ${filter === f
                  ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold'
                  : 'bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Container */}
      <div ref={containerRef} className="flex-1 px-5 py-6 overflow-y-auto relative custom-scrollbar">
        {/* Continuous connector line */}
        <div className="absolute left-[35px] top-8 bottom-12 w-[2px] bg-gradient-to-b from-emerald-500 via-purple-500 to-zinc-800" />

        <div className="space-y-6">
          {filteredStops.map((stop, index) => {
            const isSelected = selectedStop?.city === stop.city;
            const isCurrent = stop.status === 'current';

            let statusIcon = null;
            let dotColorClass = '';
            let textColorClass = 'text-zinc-400';
            let titleColorClass = 'text-zinc-300';
            let statusBadge = '';

            if (stop.status === 'completed') {
              statusIcon = <Check className="w-3.5 h-3.5 text-emerald-950 stroke-[3px]" />;
              dotColorClass = 'bg-emerald-500 border-emerald-400 ring-4 ring-emerald-500/20';
              textColorClass = 'text-zinc-500';
              titleColorClass = 'text-zinc-300';
              statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            } else if (stop.status === 'current') {
              statusIcon = <div className="w-2.5 h-2.5 rounded-full bg-purple-100 animate-ping" />;
              dotColorClass = 'bg-purple-500 border-purple-300 ring-4 ring-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.6)]';
              textColorClass = 'text-purple-300 font-semibold';
              titleColorClass = 'text-zinc-100 font-extrabold';
              statusBadge = 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold animate-pulse';
            } else {
              statusIcon = <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />;
              dotColorClass = 'bg-zinc-900 border-zinc-700 hover:border-zinc-500';
              textColorClass = 'text-zinc-500';
              titleColorClass = 'text-zinc-400';
              statusBadge = 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50';
            }

            return (
              <motion.div
                key={stop.city}
                ref={(el) => { stopRefs.current[stop.city] = el; }}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: index * 0.03 }}
                onClick={() => onStopSelect(stop)}
                className={`relative flex gap-5 items-start cursor-pointer group rounded-2xl p-3.5 transition-all duration-300 border ${isSelected
                    ? 'bg-purple-950/40 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.25)]'
                    : isCurrent
                      ? 'bg-purple-950/20 border-purple-500/30'
                      : 'border-transparent hover:bg-zinc-900/60 hover:border-zinc-800/80'
                  }`}
              >
                {/* Visual Connector Dot */}
                <div className="relative z-10 flex items-center justify-center mt-1 shrink-0">
                  <div
                    className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-300 ${dotColorClass}`}
                  >
                    {statusIcon}
                  </div>
                </div>

                {/* Stop Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-sm truncate transition-colors ${isSelected ? 'text-purple-300 font-bold' : titleColorClass
                      }`}>
                      {stop.city}
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap uppercase font-semibold ${statusBadge}`}>
                      {stop.status === 'current' ? 'Live Now' : stop.status}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 truncate mt-0.5">{stop.venue}</p>

                  <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-purple-400/70 shrink-0" />
                    <span className={textColorClass}>
                      {formatDateRange(stop.dates)}
                    </span>
                  </div>

                  {/* Special Milestone Note */}
                  {stop.specialEvent && (
                    <div className="mt-1.5">
                      <span className="text-[10px] font-medium text-purple-400">
                        {stop.specialEvent}
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
