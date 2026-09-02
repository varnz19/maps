import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, MapPin, Sparkles } from 'lucide-react';
import tourDataRaw from './data/tourData.json';
import type { TourData, TourStop, UserTravelPreferences } from './types/tour';
import { MapContainer } from './components/MapContainer';
import { Timeline } from './components/Timeline';
import { SidePanel } from './components/SidePanel';
import {
  getUserLocation,
  getSavedTravelPrefs,
  saveSavedTravelPrefs,
  saveSavedLocation,
} from './services/location';
import type { UserLocation } from './services/location';
import { LocationControl } from './components/LocationControl';

const tourData: TourData = tourDataRaw as TourData;

const getDynamicTourStops = (stops: TourStop[]): TourStop[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let currentIndex = stops.findIndex((stop) => {
    const dates = stop.dates.map((d) => new Date(d + 'T00:00:00'));
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    return today >= firstDate && today <= lastDate;
  });

  if (currentIndex === -1) {
    currentIndex = stops.findIndex((stop) => {
      const dates = stop.dates.map((d) => new Date(d + 'T00:00:00'));
      const firstDate = dates[0];
      return firstDate > today;
    });
  }

  if (currentIndex === -1) {
    currentIndex = stops.length - 1;
  }

  return stops.map((stop, idx) => {
    let status: 'completed' | 'current' | 'upcoming';
    if (idx < currentIndex) {
      status = 'completed';
    } else if (idx === currentIndex) {
      status = 'current';
    } else {
      status = 'upcoming';
    }
    return { ...stop, status };
  });
};

const tourStops = getDynamicTourStops(tourData.tourStops);

function App() {
  const [selectedStop, setSelectedStop] = useState<TourStop | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [userPrefs, setUserPrefs] = useState<UserTravelPreferences>(() =>
    getSavedTravelPrefs()
  );
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setTimelineOpen(false);
      } else {
        setTimelineOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const getPosition = async () => {
      const position = await getUserLocation();
      setUserLocation(position);
    };
    getPosition();
  }, []);

  useEffect(() => {
    const current = tourStops.find((stop) => stop.status === 'current');
    if (current) {
      const timer = setTimeout(() => {
        setSelectedStop(current);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handlePrefsChange = (newPrefs: UserTravelPreferences) => {
    setUserPrefs(newPrefs);
    saveSavedTravelPrefs(newPrefs);
  };

  const handleLocationChange = (loc: UserLocation) => {
    setUserLocation(loc);
    saveSavedLocation(loc);
  };

  return (
    <div className="relative w-screen h-screen bg-zinc-950 text-zinc-100 flex overflow-hidden font-sans">
      {/* 1. Collapsible Timeline Sidebar */}
      <AnimatePresence initial={false}>
        {timelineOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isMobile ? '100%' : '360px', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`h-full shrink-0 z-30 ${isMobile ? 'absolute inset-0' : 'relative'}`}
          >
            {isMobile && (
              <button
                onClick={() => setTimelineOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 z-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <Timeline
              stops={tourStops}
              selectedStop={selectedStop}
              onStopSelect={(stop) => {
                setSelectedStop(stop);
                if (isMobile) setTimelineOpen(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Main Map Workspace */}
      <div className="flex-1 h-full relative flex flex-col">
        {/* Top Navbar Header */}
        <header className="absolute top-5 right-6 left-6 z-20 flex justify-between items-center pointer-events-none">
          {/* Action Buttons */}
          <div className="pointer-events-auto flex gap-3">
            <button
              onClick={() => setTimelineOpen(!timelineOpen)}
              className="p-3 bg-zinc-950/90 border border-purple-500/30 rounded-2xl shadow-xl text-zinc-200 hover:text-white hover:border-purple-400 transition-all backdrop-blur-xl flex items-center justify-center cursor-pointer hover:scale-105"
              title="Toggle Tour Route"
            >
              {timelineOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setLocationModalOpen(!locationModalOpen)}
              className={`p-3 bg-zinc-950/90 border rounded-2xl shadow-xl hover:text-white transition-all backdrop-blur-xl flex items-center justify-center cursor-pointer hover:scale-105 ${locationModalOpen
                  ? 'border-purple-500 text-purple-300 shadow-purple-950/50'
                  : 'border-zinc-800 text-zinc-300 hover:border-purple-400'
                }`}
              title="Configure My Location & Travel Settings"
            >
              <MapPin className="w-5 h-5 text-purple-400" />
            </button>
          </div>

          {/* BTS Brand Badge */}
          <div className="bg-zinc-950/90 border border-purple-500/30 px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-xl flex items-center gap-3 pointer-events-auto select-none border-l-purple-500 border-l-4">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-400 animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wider uppercase bg-gradient-to-r from-zinc-100 via-purple-300 to-purple-400 bg-clip-text text-transparent">
                TourVerse
              </h1>
              <p className="text-[9px] text-purple-300/80 font-extrabold uppercase tracking-widest mt-0.5">
                {tourData.artist} • {tourData.tourName}
              </p>
            </div>
          </div>
        </header>

        {/* Location & Travel Modal */}
        <LocationControl
          isOpen={locationModalOpen}
          onClose={() => setLocationModalOpen(false)}
          currentLocation={userLocation}
          onLocationChange={handleLocationChange}
          userPrefs={userPrefs}
          onPrefsChange={handlePrefsChange}
        />

        {/* Map Visualization */}
        <div className="w-full h-full relative z-0">
          <MapContainer
            stops={tourStops}
            selectedStop={selectedStop}
            userLocation={userLocation}
            onStopSelect={(stop) => setSelectedStop(stop)}
          />
        </div>

        {/* Side Panel Details */}
        <SidePanel
          stop={selectedStop}
          stops={tourStops}
          userLocation={userLocation}
          userPrefs={userPrefs}
          onPrefsChange={handlePrefsChange}
          onStopSelect={(stop) => setSelectedStop(stop)}
          onClose={() => setSelectedStop(null)}
        />
      </div>
    </div>
  );
}

export default App;
