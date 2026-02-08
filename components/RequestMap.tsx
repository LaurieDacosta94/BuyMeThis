
import React, { useMemo, useRef, useEffect } from 'react';
import { RequestItem, User, Category, RequestStatus } from '../types';
import L from 'leaflet';
import { MapPin, Lock } from 'lucide-react';

interface RequestMapProps {
  currentUser: User | null;
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
  const map = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);

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
    if (!mapContainer.current) return;

    // If no user or coordinates, we can still show map but centered generically or handle differently
    // For this specific requirement, we rely on user coords to center "You"
    const startLat = currentUser?.coordinates?.lat || 40.7128; // Default to NYC if unknown
    const startLng = currentUser?.coordinates?.lng || -74.0060;

    if (map.current) {
        // Just update view if map exists
        // map.current.setView([startLat, startLng], 13); 
        return; 
    }

    // Initialize Leaflet
    map.current = L.map(mapContainer.current).setView(
        [startLat, startLng], 
        13
    );

    // Add OpenStreetMap Tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map.current);

    markersLayer.current = L.layerGroup().addTo(map.current);

    // Add user location marker ONLY if user is logged in and has coords
    if (currentUser?.coordinates) {
        const userIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="w-4 h-4 bg-indigo-500 rounded-full border-2 border-white shadow-[0_0_15px_rgba(99,102,241,0.6)] animate-pulse"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        L.marker([currentUser.coordinates.lat, currentUser.coordinates.lng], { icon: userIcon })
        .addTo(map.current)
        .bindPopup("<b>You are here</b>");
    }

  }, [currentUser?.coordinates]); // Re-run if coords change

  // Update markers when requests change
  useEffect(() => {
      if (!map.current || !markersLayer.current) return;

      markersLayer.current.clearLayers();

      visibleRequests.forEach(req => {
          if (!req.coordinates) return;

          let colorClass = 'text-teal-400';
          if (req.category === Category.ESSENTIALS) colorClass = 'text-red-400';
          if (req.category === Category.EDUCATION) colorClass = 'text-blue-400';
          
          const iconHtml = `
            <div class="transform hover:scale-125 transition-transform duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${colorClass} drop-shadow-md fill-slate-900"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
          `;

          const customIcon = L.divIcon({
              className: 'bg-transparent border-none',
              html: iconHtml,
              iconSize: [32, 32],
              iconAnchor: [16, 32],
              popupAnchor: [0, -32]
          });

          const marker = L.marker([req.coordinates.lat, req.coordinates.lng], { icon: customIcon })
              .addTo(markersLayer.current!);

          const popupContent = document.createElement('div');
          popupContent.innerHTML = `
              <div class="p-2 min-w-[200px]">
                  <h3 class="font-bold text-slate-800 text-sm mb-1">${req.title}</h3>
                  <p class="text-xs text-slate-500 line-clamp-2 mb-2">${req.reason}</p>
                  <span class="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-1 py-0.5 rounded border border-slate-200">${req.category}</span>
                  <button class="mt-2 w-full bg-indigo-600 text-white text-xs font-bold py-1 rounded hover:bg-indigo-700 transition-colors view-btn">View Details</button>
              </div>
          `;

          // Handle button click inside popup
          popupContent.querySelector('.view-btn')?.addEventListener('click', () => {
              onSelectRequest(req);
          });

          marker.bindPopup(popupContent);
      });
  }, [visibleRequests, onSelectRequest]);


  // Case 1: Not Logged In
  if (!currentUser) {
       return (
        <div className="w-full h-96 bg-slate-900 rounded-2xl overflow-hidden shadow-2xl relative border border-slate-700 flex flex-col items-center justify-center text-center p-8">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
            <div className="relative z-10 bg-slate-900/80 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm max-w-sm">
                <Lock className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-white font-bold text-lg mb-2">Restricted Access</h3>
                <p className="text-slate-400 text-sm mb-4">Please log in to access live geolocation data and nearby requests.</p>
            </div>
        </div>
       );
  }

  // Case 2: Logged In but No Coordinates
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

  return (
    <div className="w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl relative aspect-square md:aspect-video border border-slate-700">
       <div ref={mapContainer} className="absolute inset-0 z-0" style={{ isolation: 'isolate' }} />
       
       {/* Legend Overlay */}
       <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur border border-slate-700 p-3 rounded-lg text-xs text-slate-300 pointer-events-none z-[1000]">
        <div className="font-semibold text-white mb-2 flex items-center gap-2">
           <MapPin className="h-3 w-3" /> Area Map
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
