import React, { useMemo, useState, useRef, useEffect } from 'react';
import { RequestItem, User, Category, RequestStatus } from '../types';
import mapboxgl from 'mapbox-gl';
import { MapPin, Navigation } from 'lucide-react';

interface RequestMapProps {
  currentUser: User;
  requests: RequestItem[];
  onSelectRequest: (request: RequestItem) => void;
  categoryFilter?: Category | 'All';
  searchTerm?: string;
  onEnableLocation?: () => void;
}

export const RequestMap: React.FC<RequestMapProps> = ({ 
  currentUser, 
  requests, 
  onSelectRequest,
  categoryFilter = 'All',
  searchTerm = '',
  onEnableLocation
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  // Filter requests that have coordinates
  const visibleRequests = useMemo(() => {
    return requests
      .filter(r => {
        // Basic Status Check
        if (!r.coordinates || r.status !== RequestStatus.OPEN) return false;

        // Category Filter
        if (categoryFilter !== 'All' && r.category !== categoryFilter) return false;

        // Search Term Filter
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const matchesTitle = r.title.toLowerCase().includes(term);
          const matchesReason = r.reason.toLowerCase().includes(term);
          if (!matchesTitle && !matchesReason) return false;
        }

        return true;
      });
  }, [requests, categoryFilter, searchTerm]);

  useEffect(() => {
    if (!mapContainer.current || !currentUser.coordinates) return;

    // Set Mapbox Token
    const token = process.env.VITE_MAPBOX_TOKEN;
    if (!token) {
        console.error("Mapbox token missing");
        return;
    }
    mapboxgl.accessToken = token;

    if (map.current) return; // initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11', // Dark mode style
      center: [currentUser.coordinates.lng, currentUser.coordinates.lat],
      zoom: 12
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add user location marker
    const el = document.createElement('div');
    el.className = 'w-4 h-4 bg-indigo-500 rounded-full border-2 border-white shadow-[0_0_15px_rgba(99,102,241,0.6)] animate-pulse';
    new mapboxgl.Marker(el)
        .setLngLat([currentUser.coordinates.lng, currentUser.coordinates.lat])
        .addTo(map.current);

  }, [currentUser.coordinates]);

  // Update markers when requests change
  useEffect(() => {
      if (!map.current) return;

      // Clear existing markers
      markers.current.forEach(marker => marker.remove());
      markers.current = [];

      visibleRequests.forEach(req => {
          if (!req.coordinates) return;

          // Create custom marker element
          const el = document.createElement('div');
          el.className = 'cursor-pointer transform hover:scale-125 transition-transform duration-200';
          
          let colorClass = 'text-teal-400';
          if (req.category === Category.ESSENTIALS) colorClass = 'text-red-400';
          if (req.category === Category.EDUCATION) colorClass = 'text-blue-400';
          
          el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${colorClass} drop-shadow-md fill-current opacity-90"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

          const marker = new mapboxgl.Marker({ element: el })
              .setLngLat([req.coordinates.lng, req.coordinates.lat])
              .addTo(map.current!);

          // Add popup
          const popup = new mapboxgl.Popup({ offset: 25 })
              .setHTML(`
                  <div class="p-2 min-w-[200px]">
                      <h3 class="font-bold text-slate-800 text-sm mb-1">${req.title}</h3>
                      <p class="text-xs text-slate-500 line-clamp-2 mb-2">${req.reason}</p>
                      <span class="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-1 py-0.5 rounded border border-slate-200">${req.category}</span>
                      <button id="btn-${req.id}" class="mt-2 w-full bg-indigo-600 text-white text-xs font-bold py-1 rounded hover:bg-indigo-700 transition-colors">View Details</button>
                  </div>
              `);

          marker.setPopup(popup);
          
          // Event listener for popup button
          // Mapbox popups remove elements from DOM on close, so we need to delegate or handle click on map
          popup.on('open', () => {
             document.getElementById(`btn-${req.id}`)?.addEventListener('click', () => {
                 onSelectRequest(req);
             });
          });

          markers.current.push(marker);
      });
  }, [visibleRequests, onSelectRequest]);


  if (!currentUser.coordinates) {
    return (
      <div className="w-full h-96 bg-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 p-8 text-center">
        <MapPin className="h-12 w-12 mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-slate-600">Location Required</h3>
        <p className="max-w-md mt-2 mb-4">To view the Request Map, please add your GPS coordinates in your profile settings so we can show you what's nearby.</p>
        {onEnableLocation && (
            <button 
                onClick={onEnableLocation}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700 transition-colors"
            >
                Enable Location
            </button>
        )}
      </div>
    );
  }

  if (!process.env.VITE_MAPBOX_TOKEN) {
      return (
          <div className="w-full h-96 bg-slate-900 rounded-2xl flex items-center justify-center text-white border border-slate-700 p-8 text-center">
              <div>
                  <Navigation className="h-12 w-12 mx-auto mb-4 text-red-500" />
                  <h3 className="text-lg font-bold">Mapbox Token Missing</h3>
                  <p className="text-sm text-slate-400 mt-2">Please add <code className="bg-slate-800 px-1 rounded text-red-300">VITE_MAPBOX_TOKEN</code> to your environment variables to enable the map.</p>
              </div>
          </div>
      );
  }

  return (
    <div className="w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl relative aspect-square md:aspect-video border border-slate-700">
       <div ref={mapContainer} className="absolute inset-0" />
       
       {/* Legend Overlay */}
       <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur border border-slate-700 p-3 rounded-lg text-xs text-slate-300 pointer-events-none z-10">
        <div className="font-semibold text-white mb-2 flex items-center gap-2">
           <Navigation className="h-3 w-3" /> Area Map
        </div>
        <div className="flex items-center gap-2 mb-1">
           <div className="w-3 h-3 bg-indigo-500 rounded-full border border-white"></div> You
        </div>
        <div className="flex items-center gap-2">
           <MapPin className="h-3 w-3 text-red-400" /> Essentials
        </div>
        <div className="flex items-center gap-2">
           <MapPin className="h-3 w-3 text-blue-400" /> Education
        </div>
        <div className="flex items-center gap-2">
           <MapPin className="h-3 w-3 text-teal-400" /> Others
        </div>
      </div>
    </div>
  );
};