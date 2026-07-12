import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    let flowAnimFrameId: number;

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

      // Calculate completed vs future sections
      // Completed route spans from first stop to current stop
      const completedSplitIndex = currentIndex !== -1 ? segmentIndices[currentIndex] : combinedPath.length - 1;
      const completedCoords = combinedPath.slice(0, completedSplitIndex + 1);
      const futureCoords = currentIndex !== -1 ? combinedPath.slice(completedSplitIndex) : [];

      // Add source for completed route
      map.addSource('completed-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: completedCoords.slice(0, 1), // Start drawing from the first point
          },
        },
      });

      // Add solid background completed line (faded purple) - lighter pastel purple
      map.addLayer({
        id: 'completed-route-base-layer',
        type: 'line',
        source: 'completed-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#c084fc', // Lighter purple
          'line-width': 4,
          'line-opacity': 0.5,
        },
      });

      // Add bright animated glow completed line (flowing overlay) - lighter lilac/white
      map.addLayer({
        id: 'completed-route-layer',
        type: 'line',
        source: 'completed-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#f3e8ff', // Lighter lilac/white
          'line-width': 2.5,
          'line-opacity': 0.95,
        },
      });

      // Add source & layer for future route - lighter slate gray
      if (futureCoords.length > 1) {
        map.addSource('future-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: futureCoords,
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
            'line-color': '#cbd5e1', // Lighter slate gray
            'line-width': 2,
            'line-opacity': 0.4,
            'line-dasharray': [3, 3],
          },
        });
      }

      // Animate line drawing on map load
      let currentStep = 0;
      const totalSteps = completedCoords.length;
      const animationSpeed = 2; // Add 2 points per frame

      function animateLineDraw() {
        if (!mapRef.current) return;

        if (currentStep < totalSteps) {
          currentStep = Math.min(currentStep + animationSpeed, totalSteps);
          const currentCoords = completedCoords.slice(0, currentStep);

          const source = map.getSource('completed-route') as maplibregl.GeoJSONSource;
          if (source) {
            source.setData({
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: currentCoords,
              },
            });
          }
          requestAnimationFrame(animateLineDraw);
        } else {
          // Drawing complete. Kick off flow animation!
          animateFlow();
        }
      }

      // Add flowing dash offset animation to completed route
      let dashOffset = 0;
      function animateFlow() {
        if (!mapRef.current) return;
        dashOffset = (dashOffset - 0.25) % 40;
        try {
          if (map.getLayer('completed-route-layer')) {
            map.setPaintProperty('completed-route-layer', 'line-dasharray', [6, 6, Math.abs(dashOffset) / 4]);
          }
        } catch (e) {
          // Prevent crash if map was unmounted during animation
        }
        flowAnimFrameId = requestAnimationFrame(animateFlow);
      }

      // Start the drawing sequence
      animateLineDraw();
    });

    // 2. Render Markers
    stops.forEach((stop) => {
      // Create HTML element for custom styled markers
      const markerEl = document.createElement('div');
      markerEl.className = 'relative flex items-center justify-center cursor-pointer group';
      
      let markerDotClass = '';
      let markerOuterRing = '';

      if (stop.status === 'completed') {
        // Lighter green marker
        markerDotClass = 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]';
        markerOuterRing = 'border-emerald-400/40';
        markerEl.innerHTML = `
          <div class="w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${markerOuterRing} bg-zinc-900/80 group-hover:scale-110">
            <div class="w-3 h-3 rounded-full ${markerDotClass}"></div>
          </div>
        `;
      } else if (stop.status === 'current') {
        // Lighter purple pulsing marker
        markerDotClass = 'bg-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.8)]';
        markerOuterRing = 'border-purple-400/60';
        markerEl.innerHTML = `
          <div class="w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${markerOuterRing} bg-purple-950/10 marker-pulse-purple">
            <div class="w-4 h-4 rounded-full ${markerDotClass}"></div>
          </div>
        `;
      } else {
        // Lighter gray marker
        markerDotClass = 'bg-zinc-300 shadow-[0_0_5px_rgba(209,213,219,0.4)]';
        markerOuterRing = 'border-zinc-600/50';
        markerEl.innerHTML = `
          <div class="w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${markerOuterRing} bg-zinc-800/60 group-hover:scale-110">
            <div class="w-2.5 h-2.5 rounded-full ${markerDotClass}"></div>
          </div>
        `;
      }

      // Add tooltip/popover label on hover
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
      if (flowAnimFrameId) {
        cancelAnimationFrame(flowAnimFrameId);
      }
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
    </div>
  );
};
