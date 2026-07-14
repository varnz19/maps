import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Menu, X, MapPin } from 'lucide-react';
import tourDataRaw from './data/tourData.json';
import type { TourData, TourStop } from './types/tour';
import { MapContainer } from './components/MapContainer';
import { Timeline } from './components/Timeline';
import { NextStopCard } from './components/NextStopCard';
import { SidePanel } from './components/SidePanel';
import { getUserLocation } from './services/location';
import type { UserLocation } from './services/location';
import { LocationControl } from './components/LocationControl';

// Cast raw JSON to typescript TourData structure safely
const tourData: TourData = tourDataRaw as TourData;

// Calculate stop status dynamically based on current local date
const getDynamicTourStops = (stops: TourStop[]): TourStop[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 1. Check if there's a stop happening today
  let currentIndex = stops.findIndex(stop => {
    const dates = stop.dates.map(d => new Date(d + 'T00:00:00'));
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    return today >= firstDate && today <= lastDate;
  });

  // 2. If no stop is happening today, find the next upcoming stop (in the future)
  if (currentIndex === -1) {
    currentIndex = stops.findIndex(stop => {
      const dates = stop.dates.map(d => new Date(d + 'T00:00:00'));
      const firstDate = dates[0];
      return firstDate > today;
    });
  }

  // 3. If all stops have been completed (none happening today and none in the future),
  // default to the last stop in the tour.
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
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  // Monitor resize to toggle responsive states
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setTimelineOpen(false); // Close timeline by default on mobile to prioritize map
      } else {
        setTimelineOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    // Trigger once on mount
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Request user geolocation on mount
  useEffect(() => {
    const getPosition = async () => {
      const position = await getUserLocation();
      setUserLocation(position);
    };
    getPosition();
  }, []);

  // Automatically select the 'current' stop on load to spotlight where the artist is performing
  useEffect(() => {
    const current = tourStops.find((stop) => stop.status === 'current');
    if (current) {
      // Delay slightly for smooth map initialization load
      const timer = setTimeout(() => {
        setSelectedStop(current);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="relative w-screen h-screen bg-zinc-900 text-zinc-100 flex overflow-hidden font-sans">
      {/* 1. Collapsible Timeline Sidebar */}
      <AnimatePresence initial={false}>
        {timelineOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isMobile ? '100%' : '350px', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`h-full shrink-0 z-30 ${isMobile ? 'absolute inset-0' : 'relative'}`}
          >
            {/* Close button for full screen mobile timeline */}
            {isMobile && (
              <button
                onClick={() => setTimelineOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 z-50"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <Timeline
              stops={tourStops}
              selectedStop={selectedStop}
              onStopSelect={(stop) => {
                setSelectedStop(stop);
                if (isMobile) setTimelineOpen(false); // Hide timeline on mobile selection to reveal map
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Main Map Showcase Workspace */}
      <div className="flex-1 h-full relative flex flex-col">
        {/* Top Navbar */}
        <header className="absolute top-6 right-6 left-6 z-20 flex justify-between items-center pointer-events-none">
          {/* Timeline and Location toggle buttons */}
          <div className="pointer-events-auto flex gap-3">
            <button
              onClick={() => setTimelineOpen(!timelineOpen)}
              className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl shadow-lg text-zinc-300 hover:text-zinc-100 hover:border-purple-500/40 transition-all duration-300 backdrop-filter backdrop-blur-md flex items-center justify-center cursor-pointer"
              title="Toggle Timeline"
            >
              {timelineOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setLocationModalOpen(!locationModalOpen)}
              className={`p-3 bg-zinc-900/90 border rounded-xl shadow-lg hover:text-zinc-100 transition-all duration-300 backdrop-filter backdrop-blur-md flex items-center justify-center cursor-pointer ${
                locationModalOpen
                  ? 'border-purple-500 text-purple-400 shadow-purple-500/10'
                  : 'border-zinc-800 text-zinc-300 hover:border-purple-500/40'
              }`}
              title="Configure My Location"
            >
              <MapPin className="w-5 h-5" />
            </button>
          </div>

          {/* Logo Brand Card */}
          <div className="bg-zinc-900/90 border border-zinc-800 px-5 py-3 rounded-xl shadow-lg backdrop-filter backdrop-blur-md flex items-center gap-3 pointer-events-auto select-none border-l-purple-400 border-l-2">
            <Compass className="w-5 h-5 text-purple-500 animate-spin-slow" />
            <div>
              <h1 className="text-sm font-black tracking-wider uppercase bg-gradient-to-r from-zinc-100 to-purple-400 bg-clip-text text-transparent">
                tourVerse
              </h1>
              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
                {tourData.artist} • {tourData.tourName}
              </p>
            </div>
          </div>
        </header>

        {/* Location Selector Panel Overlay */}
        <LocationControl
          isOpen={locationModalOpen}
          onClose={() => setLocationModalOpen(false)}
          currentLocation={userLocation}
          onLocationChange={(loc) => {
            setUserLocation(loc);
            setLocationModalOpen(false);
          }}
        />

        {/* Floating Next Stop Info Card */}
        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="pointer-events-auto max-w-sm">
            <NextStopCard
              stops={tourStops}
              onStopSelect={(stop) => setSelectedStop(stop)}
            />
          </div>
        </div>

        {/* Map Visualization Layer */}
        <div className="w-full h-full relative z-0">
          <MapContainer
            stops={tourStops}
            selectedStop={selectedStop}
            userLocation={userLocation}
            onStopSelect={(stop) => setSelectedStop(stop)}
          />
        </div>

        {/* Interactive Side Panel / Bottom Sheet */}
        <SidePanel
          stop={selectedStop}
          userLocation={userLocation}
          onClose={() => setSelectedStop(null)}
        />
      </div>
    </div>
  );
}

export default App;
