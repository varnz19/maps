import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, X, AlertCircle, Radio } from 'lucide-react';
import type { UserTravelPreferences, TravelMode, DistanceUnit } from '../types/tour';
import { getUserLocation } from '../services/location';
import type { UserLocation } from '../services/location';

interface LocationControlProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: UserLocation | null;
  onLocationChange: (location: UserLocation) => void;
  userPrefs?: UserTravelPreferences;
  onPrefsChange?: (prefs: UserTravelPreferences) => void;
}

const PRESET_CITIES = [
  { name: 'Seoul', country: 'South Korea', lat: 37.5665, lon: 126.9780 },
  { name: 'Goyang', country: 'South Korea', lat: 37.6748, lon: 126.7482 },
  { name: 'Busan', country: 'South Korea', lat: 35.1901, lon: 129.0848 },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503 },
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278 },
  { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522 },
  { name: 'Munich', country: 'Germany', lat: 48.1351, lon: 11.5820 },
  { name: 'New York', country: 'United States', lat: 40.7128, lon: -74.0060 },
  { name: 'Los Angeles', country: 'United States', lat: 34.0522, lon: -118.2437 },
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lon: -79.3832 },
  { name: 'Chicago', country: 'United States', lat: 41.8781, lon: -87.6298 },
  { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lon: -99.1332 },
];

export const LocationControl: React.FC<LocationControlProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onLocationChange,
  userPrefs,
  onPrefsChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDetectGps = async () => {
    setDetectingGps(true);
    setErrorMsg(null);
    try {
      const loc = await getUserLocation();
      onLocationChange(loc);
      if (loc.isMocked) {
        setErrorMsg('GPS access was not granted. Reverted to default base.');
      }
    } catch (err) {
      setErrorMsg('Failed to detect browser location.');
    } finally {
      setDetectingGps(false);
    }
  };

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
      cityName: `Custom (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
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

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(searchQuery)}`
      );
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSearchResults(data);
      if (data.length === 0) {
        setErrorMsg('No locations found. Try manual coordinates or presets.');
      }
    } catch (err) {
      setErrorMsg('Geocoding search failed. Please select from presets or enter coordinates.');
    } finally {
      setSearching(false);
    }
  };

  const selectResult = (result: any) => {
    onLocationChange({
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      isMocked: false,
      cityName: result.display_name.split(',')[0],
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
          className="absolute top-20 left-6 w-[360px] max-w-[calc(100vw-3rem)] bg-zinc-950/95 border border-purple-500/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl p-5 z-50 text-zinc-100 overflow-hidden flex flex-col pointer-events-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-purple-400" />
              My Location & Travel Settings
            </span>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current Location Display & Detect Live GPS */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 mb-4 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-400 uppercase tracking-wider text-[9px] font-bold">
                Current Origin Base
              </span>
              <span className={`h-2 w-2 rounded-full ${currentLocation?.isMocked ? 'bg-amber-400' : 'bg-purple-400 animate-pulse'}`} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-zinc-100 text-sm block">
                  {currentLocation?.cityName || 'Custom Position'}
                </span>
                <span className="text-zinc-400 font-mono text-[10px]">
                  {currentLocation?.latitude.toFixed(4)}°, {currentLocation?.longitude.toFixed(4)}°
                </span>
              </div>

              <button
                onClick={handleDetectGps}
                disabled={detectingGps}
                className="flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/40 text-purple-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer hover:scale-105"
              >
                <Radio className={`w-3.5 h-3.5 ${detectingGps ? 'animate-spin text-purple-400' : ''}`} />
                <span>{detectingGps ? 'Detecting...' : 'Detect GPS'}</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preferences (Travel Mode & Units) */}
          {userPrefs && onPrefsChange && (
            <div className="mb-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3">
              <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-bold block mb-2">
                Travel Mode & Units
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                  {(['flight', 'driving', 'train'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onPrefsChange({ ...userPrefs, travelMode: m as TravelMode })}
                      className={`flex-1 py-1 rounded text-[10px] capitalize font-bold transition-all cursor-pointer ${
                        userPrefs.travelMode === m ? 'bg-purple-600 text-white shadow' : 'text-zinc-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                  {(['km', 'mi'] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => onPrefsChange({ ...userPrefs, unit: u as DistanceUnit })}
                      className={`flex-1 py-1 rounded text-[10px] uppercase font-bold transition-all cursor-pointer ${
                        userPrefs.unit === u ? 'bg-purple-600 text-white shadow' : 'text-zinc-400'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-4 relative">
            <input
              type="text"
              placeholder="Search city (e.g. Goyang, Tokyo, London...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 focus:border-purple-500/80 rounded-xl py-2 pl-3 pr-9 text-xs placeholder-zinc-500 text-zinc-200 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={searching}
              className="absolute right-2 top-1.5 text-zinc-400 hover:text-zinc-200 p-1 cursor-pointer"
            >
              <Search className={`w-3.5 h-3.5 ${searching ? 'animate-pulse text-purple-400' : ''}`} />
            </button>

            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-zinc-950 border border-purple-500/40 rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
                {searchResults.map((res, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectResult(res)}
                    className="w-full text-left px-2.5 py-2 hover:bg-purple-950/40 rounded-lg text-[11px] text-zinc-300 hover:text-zinc-100 transition-colors truncate block"
                  >
                    {res.display_name}
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Quick Presets Grid */}
          <div className="mb-4">
            <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-bold block mb-2">
              Presets
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {PRESET_CITIES.map((c) => {
                const isSelected =
                  currentLocation &&
                  Math.abs(currentLocation.latitude - c.lat) < 0.05 &&
                  Math.abs(currentLocation.longitude - c.lon) < 0.05;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() =>
                      onLocationChange({
                        latitude: c.lat,
                        longitude: c.lon,
                        isMocked: false,
                        cityName: `${c.name}, ${c.country}`,
                      })
                    }
                    className={`px-1 py-1.5 rounded-lg border text-[10px] font-bold text-center truncate transition-all cursor-pointer ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/20 text-purple-300 shadow-md'
                        : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manual Entry */}
          <form onSubmit={handleManualSubmit} className="flex gap-2 items-end pt-2 border-t border-zinc-800/60">
            <div className="flex-1">
              <label className="text-[9px] text-zinc-500 block mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                placeholder="37.566"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-purple-500 rounded-xl py-1.5 px-2 text-xs text-zinc-200 outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-[9px] text-zinc-500 block mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                placeholder="126.978"
                value={manualLon}
                onChange={(e) => setManualLon(e.target.value)}
                className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-purple-500 rounded-xl py-1.5 px-2 text-xs text-zinc-200 outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-500 text-white py-1.5 px-3 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Set
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
