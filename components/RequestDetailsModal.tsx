import React, { useState } from 'react';
import { RequestItem, RequestStatus, User } from '../types';
import { Button } from './Button';
import { X, MapPin, Clock, MessageCircle, Send, Heart, Users, CheckCircle, Navigation, ShieldCheck } from 'lucide-react';
import { calculateDistance, formatDistance } from '../utils/geo';

interface RequestDetailsModalProps {
  request: RequestItem;
  requester: User;
  isOpen: boolean;
  onClose: () => void;
  onFulfill: () => void;
  currentUser: User | null;
  candidates: User[]; // Array of full user objects
}

export const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({ 
  request, requester, isOpen, onClose, onFulfill, currentUser, candidates
}) => {
  if (!isOpen) return null;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const distanceInfo = currentUser?.coordinates && request.coordinates ? formatDistance(calculateDistance(
        currentUser.coordinates.lat, 
        currentUser.coordinates.lng,
        request.coordinates.lat, 
        request.coordinates.lng
  )) : null;

  const isCandidate = currentUser && request.candidates?.includes(currentUser.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 backdrop-blur-md transition-colors">
          <X className="h-5 w-5" />
        </button>

        <div className="relative h-64 shrink-0 bg-slate-100">
             <img 
               src={request.enrichedData?.imageUrl || `https://picsum.photos/seed/${request.id}/800/400`} 
               alt={request.title} 
               className="w-full h-full object-cover"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
             
             <div className="absolute bottom-6 left-6 right-6 text-white">
                 <div className="flex items-center gap-2 mb-2">
                     <span className="bg-indigo-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm">{request.category}</span>
                     {distanceInfo && <span className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Navigation className="h-3 w-3" /> {distanceInfo}</span>}
                 </div>
                 <h2 className="text-3xl font-bold leading-tight">{request.title}</h2>
             </div>
        </div>

        <div className="p-8 overflow-y-auto">
             <div className="flex items-start justify-between mb-8">
                 <div className="flex items-center gap-4">
                     <img src={requester.avatarUrl} className="w-14 h-14 rounded-full border-4 border-slate-50 shadow-sm" alt="" />
                     <div>
                         <p className="font-bold text-lg text-slate-900">{requester.displayName}</p>
                         <div className="flex items-center gap-2 text-sm text-slate-500">
                             <span>@{requester.handle}</span>
                             <span>•</span>
                             <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {requester.location}</span>
                         </div>
                     </div>
                 </div>
                 <div className="text-right">
                     <p className="text-sm font-bold text-slate-900 flex items-center gap-1 justify-end"><Clock className="h-4 w-4 text-slate-400" /> {timeAgo(request.createdAt)}</p>
                 </div>
             </div>

             <div className="prose prose-slate max-w-none mb-8">
                 <h3 className="text-lg font-bold text-slate-900 mb-2">Why this is needed</h3>
                 <p className="text-slate-600 leading-relaxed text-lg">{request.reason}</p>
             </div>

             {/* Candidates List */}
             {candidates.length > 0 && (
                 <div className="bg-indigo-50 rounded-2xl p-6 mb-8 border border-indigo-100">
                     <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                         <Users className="h-5 w-5" /> People offering to help ({candidates.length})
                     </h4>
                     <div className="flex flex-wrap gap-4">
                         {candidates.map(c => (
                             <div key={c.id} className="flex items-center gap-2 bg-white px-3 py-2 rounded-full shadow-sm border border-indigo-100">
                                 <img src={c.avatarUrl} className="w-8 h-8 rounded-full" alt="" />
                                 <span className="text-sm font-medium text-slate-700">{c.displayName}</span>
                                 {c.id === currentUser?.id && <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded ml-1 font-bold">You</span>}
                             </div>
                         ))}
                     </div>
                 </div>
             )}

             <div className="flex flex-col gap-3 sticky bottom-0 bg-white pt-4 border-t border-slate-100 mt-auto">
                 {request.status === RequestStatus.FULFILLED || request.status === RequestStatus.RECEIVED ? (
                     <div className="w-full bg-green-50 text-green-700 font-bold py-4 rounded-xl text-center flex items-center justify-center gap-2 text-lg border border-green-200">
                         <CheckCircle className="h-6 w-6" /> 
                         {request.status === RequestStatus.RECEIVED ? 'Item Received' : 'Item Purchased'}
                     </div>
                 ) : (
                    <Button onClick={onFulfill} size="lg" className="w-full font-bold shadow-xl shadow-indigo-600/20 py-4 text-lg">
                        {isCandidate ? 'Complete Fulfillment' : 'I Can Help with This'}
                    </Button>
                 )}
             </div>
        </div>
      </div>
    </div>
  );
};