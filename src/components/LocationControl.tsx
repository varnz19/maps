import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, X, AlertCircle } from 'lucide-react';
import type { UserLocation } from '../services/location';

interface LocationControlProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: UserLocation | null;
  onLocationChange: (location: UserLocation) => void;
}

const PRESET_CITIES = [
  { name: 'Munich', country: 'Germany', lat: 48.1351, lon: 11.5820 },
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278 },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503 },
  { name: 'Seoul', country: 'South Korea', lat: 37.5665, lon: 126.9780 },
  { name: 'New York', country: 'United States', lat: 40.7128, lon: -74.0060 },
  { name: 'Los Angeles', country: 'United States', lat: 34.0522, lon: -118.2437 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093 },
  { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522 },
];

export const LocationControl: React.FC<LocationControlProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onLocationChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setErrorMsg('Latitude must be a number between -90 and 90.');
      return;
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      setErrorMsg('Longitude must be a number between -180 and 180.');
      return;
    }

    onLocationChange({
      latitude: lat,
      longitude: lon,
      isMocked: false,
    });
    setManualLat('');
    setManualLon('');
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setErrorMsg(null);
    setSearchResults([]);

    // Check presets first for speed/offline support
    const queryLower = searchQuery.toLowerCase().trim();
    const presetMatches = PRESET_CITIES.filter(
      (c) => c.name.toLowerCase().includes(queryLower) || c.country.toLowerCase().includes(queryLower)
    );

    if (presetMatches.length > 0) {
      const results = presetMatches.map((c) => ({
        display_name: `${c.name}, ${c.country}`,
        lat: c.lat.toString(),
        lon: c.lon.toString(),
      }));
      setSearchResults(results);
      setSearching(false);
      return;
    }

    // Fallback: Live keyless geocode using OpenStreetMap Nominatim
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(searchQuery)}`
      );
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSearchResults(data);
      if (data.length === 0) {
        setErrorMsg('No locations found. Try entering coordinates manually.');
      }
    } catch (err) {
      setErrorMsg('Geocoding search failed. Please try manual coordinate input.');
    } finally {
      setSearching(false);
    }
  };

  const selectResult = (result: any) => {
    onLocationChange({
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      isMocked: false,
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute top-20 left-6 w-[340px] bg-zinc-900/95 border border-zinc-800 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl p-5 z-40 text-zinc-100 overflow-hidden flex flex-col pointer-events-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              Configure My Location
            </span>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current location display */}
          <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-3 mb-4 text-xs">
            <div className="text-zinc-500 uppercase tracking-wider mb-1 text-[9px] font-bold">Current Location</div>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-zinc-200">
                  {currentLocation?.latitude.toFixed(4)}°, {currentLocation?.longitude.toFixed(4)}°
                </span>
                <span className="text-zinc-400 block text-[10px] mt-0.5">
                  {currentLocation?.isMocked ? 'Fallback Default (London)' : 'Custom Position'}
                </span>
              </div>
              <span className={`h-2 w-2 rounded-full ${currentLocation?.isMocked ? 'bg-amber-400' : 'bg-purple-400 animate-pulse'}`} />
            </div>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* City Search */}
          <form onSubmit={handleSearch} className="mb-4 relative">
            <input
              type="text"
              placeholder="e.g. Berlin, Paris, New York..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 focus:border-purple-500/80 rounded-xl py-2 pl-3 pr-9 text-xs placeholder-zinc-500 text-zinc-200 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={searching}
              className="absolute right-2 top-1.5 text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
            >
              <Search className={`w-3.5 h-3.5 ${searching ? 'animate-pulse text-purple-400' : ''}`} />
            </button>

            {/* Geocode Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
                {searchResults.map((res, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectResult(res)}
                    className="w-full text-left px-2.5 py-2 hover:bg-purple-950/30 rounded-lg text-[11px] text-zinc-300 hover:text-zinc-100 transition-colors truncate block border border-transparent hover:border-purple-500/20"
                  >
                    {res.display_name}
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Quick Presets Grid */}
          <div className="mb-4">
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold block mb-2">Popular Presets</span>
            <div className="grid grid-cols-4 gap-1.5">
              {PRESET_CITIES.map((c) => {
                const isSelected =
                  currentLocation &&
                  Math.abs(currentLocation.latitude - c.lat) < 0.01 &&
                  Math.abs(currentLocation.longitude - c.lon) < 0.01;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() =>
                      onLocationChange({
                        latitude: c.lat,
                        longitude: c.lon,
                        isMocked: false,
                      })
                    }
                    className={`px-1.5 py-1.5 rounded-lg border text-[10px] font-medium text-center truncate transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/10 text-purple-400 font-bold'
                        : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/20 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-zinc-800"></div>
            <span className="flex-shrink mx-3 text-zinc-500 uppercase text-[9px] tracking-wider font-bold">Or Coordinates</span>
            <div className="flex-grow border-t border-zinc-800"></div>
          </div>

          {/* Manual Entry */}
          <form onSubmit={handleManualSubmit} className="flex gap-2 items-end mt-2">
            <div className="flex-1">
              <label className="text-[9px] text-zinc-500 block mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                placeholder="48.135"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                className="w-full bg-zinc-950/60 border border-zinc-800/80 focus:border-purple-500/80 rounded-xl py-1.5 px-2 text-xs text-zinc-200 outline-none transition-all"
              />
            </div>
            <div className="flex-1">
              <label className="text-[9px] text-zinc-500 block mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                placeholder="11.582"
                value={manualLon}
                onChange={(e) => setManualLon(e.target.value)}
                className="w-full bg-zinc-950/60 border border-zinc-800/80 focus:border-purple-500/80 rounded-xl py-1.5 px-2 text-xs text-zinc-200 outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              className="bg-zinc-800 hover:bg-purple-600/85 hover:text-zinc-100 text-zinc-300 py-1.5 px-3.5 rounded-xl font-bold text-xs transition-colors border border-zinc-700/60 cursor-pointer"
            >
              Set
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
