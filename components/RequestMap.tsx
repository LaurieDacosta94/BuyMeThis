import React, { useMemo, useState } from 'react';
import { RequestItem, User, Category, RequestStatus } from '../types';
import { projectCoordinates } from '../utils/geo';
import { MapPin, Navigation } from 'lucide-react';

interface RequestMapProps {
  currentUser: User;
  requests: RequestItem[];
  onSelectRequest: (request: RequestItem) => void;
  categoryFilter?: Category | 'All';
  searchTerm?: string;
}

export const RequestMap: React.FC<RequestMapProps> = ({ 
  currentUser, 
  requests, 
  onSelectRequest,
  categoryFilter = 'All',
  searchTerm = ''
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Configuration
  const VIEW_RADIUS_KM = 50; // The map shows a 50km radius
  const MAP_SIZE = 600; // Pixel size of the map container
  const CENTER = MAP_SIZE / 2;
  const SCALE = (MAP_SIZE / 2) / VIEW_RADIUS_KM; // pixels per km

  // Filter requests that have coordinates and are within range
  const visibleRequests = useMemo(() => {
    if (!currentUser.coordinates) return [];

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
      })
      .map(r => {
        const proj = projectCoordinates(
          currentUser.coordinates!.lat,
          currentUser.coordinates!.lng,
          r.coordinates!.lat,
          r.coordinates!.lng
        );
        return { ...r, x: proj.x, y: proj.y };
      })
      .filter(r => Math.sqrt(r.x * r.x + r.y * r.y) <= VIEW_RADIUS_KM);
  }, [currentUser.coordinates, requests, categoryFilter, searchTerm]);

  if (!currentUser.coordinates) {
    return (
      <div className="w-full h-96 bg-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 p-8 text-center">
        <MapPin className="h-12 w-12 mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-slate-600">Location Required</h3>
        <p className="max-w-md mt-2">To view the Request Radar, please add your GPS coordinates in your profile settings so we can show you what's nearby.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl relative aspect-square md:aspect-video flex items-center justify-center border border-slate-700">
      {/* Grid / Radar Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0" 
             style={{ 
               backgroundImage: 'radial-gradient(circle, #4f46e5 1px, transparent 1px)', 
               backgroundSize: '40px 40px' 
             }} 
        />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] border border-indigo-500/30 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] border border-indigo-500/20 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Map Container - Centered */}
      <div 
        className="relative" 
        style={{ width: MAP_SIZE, height: MAP_SIZE }}
      >
        {/* User (Center) */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="relative">
             <div className="w-4 h-4 bg-indigo-500 rounded-full border-2 border-white shadow-[0_0_15px_rgba(99,102,241,0.6)] animate-pulse" />
             <div className="absolute -inset-4 bg-indigo-500/20 rounded-full animate-ping" />
          </div>
        </div>

        {/* Requests */}
        {visibleRequests.map(req => {
          // Convert km offset to pixels. 
          // Note: In map coords, +y is usually North (up). In CSS top/left, +y is down.
          // So we flip Y.
          const top = CENTER - (req.y * SCALE);
          const left = CENTER + (req.x * SCALE);

          const isHovered = hoveredId === req.id;

          return (
            <div
              key={req.id}
              className="absolute z-10 group cursor-pointer"
              style={{ top, left, transform: 'translate(-50%, -50%)' }}
              onMouseEnter={() => setHoveredId(req.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelectRequest(req)}
            >
              <div className={`transition-all duration-300 ${isHovered ? 'scale-125' : 'scale-100'}`}>
                <MapPin 
                  className={`h-6 w-6 drop-shadow-md ${
                    req.category === Category.ESSENTIALS ? 'text-red-400 fill-red-400/20' :
                    req.category === Category.EDUCATION ? 'text-blue-400 fill-blue-400/20' :
                    'text-teal-400 fill-teal-400/20'
                  }`} 
                />
              </div>

              {/* Tooltip */}
              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white rounded-lg shadow-xl p-3 text-left pointer-events-none transition-all duration-200 origin-bottom ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-2 h-2 bg-white rotate-45" />
                 <img src={req.enrichedData?.imageUrl} className="w-full h-24 object-cover rounded-md mb-2 bg-slate-100" alt="" />
                 <p className="font-bold text-slate-900 text-xs line-clamp-1">{req.title}</p>
                 <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{req.reason}</p>
                 <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{req.category}</span>
                    <span className="text-[10px] text-slate-400">{Math.round(Math.sqrt(req.x*req.x + req.y*req.y))}km</span>
                 </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend Overlay */}
      <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur border border-slate-700 p-3 rounded-lg text-xs text-slate-300">
        <div className="font-semibold text-white mb-2 flex items-center gap-2">
           <Navigation className="h-3 w-3" /> Radar View ({VIEW_RADIUS_KM}km)
        </div>
        <div className="flex items-center gap-2 mb-1">
           <div className="w-2 h-2 rounded-full bg-indigo-500 border border-white"></div> You
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