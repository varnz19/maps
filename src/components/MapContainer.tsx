import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Info } from 'lucide-react';
import type { TourStop } from '../types/tour';
import { getGeodesicPath } from '../utils/geo';
import type { UserLocation } from '../services/location';

interface MapContainerProps {
  stops: TourStop[];
  selectedStop: TourStop | null;
  userLocation: UserLocation | null;
  onStopSelect: (stop: TourStop) => void;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  stops,
  selectedStop,
  userLocation,
  onStopSelect,
}) => {
  const [showLegend, setShowLegend] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize MapLibre GL
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json', // Premium dark style
      center: [15, 35], // Coarse center of the world
      zoom: 1.8,
      attributionControl: false,
    });

    mapRef.current = map;

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', () => {
      if (!mapRef.current) return;

      // 1. Draw Tour Routes (Geodesic Arcs & Anti-meridian support)
      const currentIndex = stops.findIndex((stop) => stop.status === 'current');

      let combinedPath: [number, number][] = [];
      const segmentIndices: number[] = [0];

      for (let i = 0; i < stops.length - 1; i++) {
        const from = stops[i];
        const to = stops[i + 1];
        const segment = getGeodesicPath(from.latitude, from.longitude, to.latitude, to.longitude, 40);
        if (combinedPath.length === 0) {
          combinedPath.push(...segment);
        } else {
          // Adjust starting longitude offset to keep coordinates continuous across anti-meridian
          const lastLon = combinedPath[combinedPath.length - 1][0];
          const diff = segment[0][0] - lastLon;
          let offset = 0;
          if (diff > 180) {
            offset = -360;
          } else if (diff < -180) {
            offset = 360;
          }
          const adjustedSegment = segment.map(([lon, lat]) => [lon + offset, lat] as [number, number]);
          combinedPath.push(...adjustedSegment.slice(1));
        }
        segmentIndices.push(combinedPath.length - 1);
      }

      // Partition coordinates: Completed vs Active Next Leg vs Remaining Future Legs
      const currentSplitIdx = currentIndex !== -1 ? segmentIndices[currentIndex] : combinedPath.length - 1;
      const nextSplitIdx = currentIndex !== -1 && currentIndex + 1 < segmentIndices.length
        ? segmentIndices[currentIndex + 1]
        : currentSplitIdx;

      const completedCoords = combinedPath.slice(0, currentSplitIdx + 1);
      const activeUpcomingCoords = combinedPath.slice(currentSplitIdx, nextSplitIdx + 1);
      const remainingFutureCoords = combinedPath.slice(nextSplitIdx);

      // 1. Completed Route: Desaturated, dimmed gray line with low opacity
      if (completedCoords.length > 1) {
        map.addSource('completed-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: completedCoords,
            },
          },
        });

        map.addLayer({
          id: 'completed-route-layer',
          type: 'line',
          source: 'completed-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#64748b',
            'line-width': 1.5,
            'line-opacity': 0.25,
          },
        });
      }

      // 2. Active Upcoming Leg (Current City -> Next City): Bright Purple Accent & Glowing
      if (activeUpcomingCoords.length > 1) {
        map.addSource('active-upcoming-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: activeUpcomingCoords,
            },
          },
        });

        map.addLayer({
          id: 'active-upcoming-route-glow',
          type: 'line',
          source: 'active-upcoming-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#a855f7',
            'line-width': 4,
            'line-opacity': 0.7,
          },
        });

        map.addLayer({
          id: 'active-upcoming-route-core',
          type: 'line',
          source: 'active-upcoming-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#f3e8ff',
            'line-width': 2.5,
            'line-opacity': 0.95,
          },
        });
      }

      // 3. Remaining Future Route: Subtle dashed lines
      if (remainingFutureCoords.length > 1) {
        map.addSource('future-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: remainingFutureCoords,
            },
          },
        });

        map.addLayer({
          id: 'future-route-layer',
          type: 'line',
          source: 'future-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#475569',
            'line-width': 1.5,
            'line-opacity': 0.2,
            'line-dasharray': [3, 4],
          },
        });
      }
    });

    // 2. Render Markers with Soft Pulsing Aura Exclusively on Live City
    stops.forEach((stop) => {
      const markerEl = document.createElement('div');
      markerEl.className = 'relative flex items-center justify-center cursor-pointer group';
      
      if (stop.status === 'completed') {
        // Static clean emerald marker
        markerEl.innerHTML = `
          <div class="w-6 h-6 rounded-full border border-emerald-500/30 flex items-center justify-center bg-zinc-950/90 shadow transition-transform duration-200 group-hover:scale-110">
            <div class="w-2 h-2 rounded-full bg-emerald-400"></div>
          </div>
        `;
      } else if (stop.status === 'current') {
        // Soft pulsing glow aura exclusively on the LIVE city marker
        markerEl.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div class="w-8 h-8 rounded-full border-2 border-purple-400/80 flex items-center justify-center bg-purple-950/40 live-marker-aura">
              <div class="w-3 h-3 rounded-full bg-purple-300 shadow-[0_0_8px_rgba(216,180,254,1)]"></div>
            </div>
          </div>
        `;
      } else {
        // Static clean slate/gray marker
        markerEl.innerHTML = `
          <div class="w-5 h-5 rounded-full border border-zinc-700/60 flex items-center justify-center bg-zinc-900/80 shadow transition-transform duration-200 group-hover:scale-110">
            <div class="w-1.5 h-1.5 rounded-full bg-zinc-400"></div>
          </div>
        `;
      }

      // Tooltip label on hover
      const tooltip = document.createElement('div');
      tooltip.className = 'absolute bottom-full mb-2 hidden group-hover:block bg-zinc-950/95 border border-zinc-800 text-zinc-100 text-xs px-2.5 py-1 rounded shadow-xl whitespace-nowrap z-50 pointer-events-none transition-opacity duration-200';
      tooltip.innerHTML = `<span class="font-medium">${stop.city}</span> <span class="text-zinc-400">(${stop.venue})</span>`;
      markerEl.appendChild(tooltip);

      // MapLibre Marker creation
      const marker = new maplibregl.Marker({ element: markerEl })
        .setLngLat([stop.longitude, stop.latitude])
        .addTo(map);

      // Handle marker click
      markerEl.addEventListener('click', (e) => {
        e.stopPropagation();
        onStopSelect(stop);
      });

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [stops]);

  // Render or update user location marker and connect line to selectedStop
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clean up previous user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (!userLocation) {
      // Remove route source/layer if they exist
      try {
        if (map.getLayer('user-route-layer')) map.removeLayer('user-route-layer');
        if (map.getSource('user-route')) map.removeSource('user-route');
      } catch (e) {
        // Safe check
      }
      return;
    }

    // Create custom styled element for user marker
    const el = document.createElement('div');
    el.className = 'relative flex items-center justify-center cursor-pointer group z-50';
    el.innerHTML = `
      <div class="w-9 h-9 rounded-full border-2 border-cyan-400/60 flex items-center justify-center bg-cyan-950/20 marker-pulse-cyan">
        <div class="w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]"></div>
      </div>
      <div class="absolute bottom-full mb-2 hidden group-hover:block bg-zinc-950/95 border border-zinc-800 text-zinc-100 text-[10px] px-2.5 py-1 rounded shadow-xl whitespace-nowrap z-50 pointer-events-none">
        <span class="font-bold text-cyan-400">My Location</span>
      </div>
    `;

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([userLocation.longitude, userLocation.latitude])
      .addTo(map);

    userMarkerRef.current = marker;

    // Handle connection line to selectedStop
    const drawConnection = () => {
      if (!selectedStop) {
        try {
          if (map.getLayer('user-route-layer')) map.removeLayer('user-route-layer');
          if (map.getSource('user-route')) map.removeSource('user-route');
        } catch (e) {
          // ignore
        }
        return;
      }

      const path = getGeodesicPath(
        userLocation.latitude,
        userLocation.longitude,
        selectedStop.latitude,
        selectedStop.longitude,
        40
      );

      const geojson: any = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: path,
        },
      };

      try {
        if (map.getSource('user-route')) {
          const source = map.getSource('user-route') as maplibregl.GeoJSONSource;
          source.setData(geojson);
        } else {
          map.addSource('user-route', {
            type: 'geojson',
            data: geojson,
          });
        }

        if (!map.getLayer('user-route-layer')) {
          map.addLayer({
            id: 'user-route-layer',
            type: 'line',
            source: 'user-route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#22d3ee', // Cyan
              'line-width': 2,
              'line-opacity': 0.7,
              'line-dasharray': [4, 4],
            },
          });
        }
      } catch (e) {
        console.error('Error drawing user connection route:', e);
      }
    };

    // Draw immediately or delay slightly to ensure map style is fully loaded
    if (map.isStyleLoaded()) {
      drawConnection();
    } else {
      map.once('idle', drawConnection);
    }

  }, [userLocation, selectedStop]);

  // Smoothly fly to selected stop
  useEffect(() => {
    if (!mapRef.current || !selectedStop) return;

    mapRef.current.flyTo({
      center: [selectedStop.longitude, selectedStop.latitude],
      zoom: 6.5,
      essential: true,
      duration: 2500, // Very premium, smooth fly-to
      pitch: 35, // Premium 3D look
    });
  }, [selectedStop]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Map Container Element */}
      <div ref={mapContainerRef} className="w-full h-full bg-zinc-950" />

      {/* Decorative dark vignettes */}
      <div className="absolute inset-0 pointer-events-none border border-zinc-900/50 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />

      {/* Collapsible Map Legend (Bottom-Left Info Button & Popover) */}
      <div className="absolute bottom-5 left-5 z-20">
        <div className="relative group">
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="w-8 h-8 rounded-full bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors backdrop-blur-md cursor-pointer shadow-lg"
            title="Map legend"
            aria-label="Toggle map legend"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Popover on hover or when toggled */}
          <div
            className={`absolute bottom-full left-0 mb-2 w-40 bg-zinc-950/95 border border-zinc-800 rounded-xl p-3 shadow-2xl backdrop-blur-xl transition-all duration-200 pointer-events-auto ${
              showLegend
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto'
            }`}
          >
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Map Legend</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[11px] text-zinc-300">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.8)]" />
                <span className="text-[11px] text-purple-300 font-medium">Live show</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-zinc-500" />
                <span className="text-[11px] text-zinc-400">Upcoming</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
