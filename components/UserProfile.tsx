import React, { useMemo } from 'react';
import { User, RequestItem, RequestStatus } from '../types';
import { ShieldCheck, MapPin, Briefcase, Heart, Package, Gift, TrendingUp, Quote, Edit2 } from 'lucide-react';
import { Button } from './Button';
import { Badge } from './Badge';

interface UserProfileProps {
  user: User;
  requests: RequestItem[]; // Needed to calculate stats dynamically
  isCurrentUser?: boolean;
  onEditProfile?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, requests, isCurrentUser, onEditProfile }) => {
  
  // Dynamic Calculations
  const stats = useMemo(() => {
    const myRequests = requests.filter(r => r.requesterId === user.id);
    const myFulfillments = requests.filter(r => r.fulfillerId === user.id && (r.status === RequestStatus.FULFILLED || r.status === RequestStatus.RECEIVED));
    const verifiedReceived = myRequests.filter(r => r.status === RequestStatus.RECEIVED);
    
    // Simple Trust Score Algorithm
    // Base: 50
    // +10 per fulfillment
    // +5 per verified receipt
    // Cap at 100
    let score = 50 + (myFulfillments.length * 10) + (verifiedReceived.length * 5);
    if (score > 100) score = 100;

    return {
      totalRequests: myRequests.length,
      totalGifted: myFulfillments.length,
      trustScore: score,
      thanksReceived: requests
        .filter(r => r.fulfillerId === user.id && r.thankYouMessage)
        .map(r => ({
           id: r.id,
           message: r.thankYouMessage,
           from: r.requesterId // In real app, would map to name
        }))
    };
  }, [user.id, requests]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
      </div>
      
      <div className="px-6 pb-6">
        <div className="relative flex flex-col sm:flex-row justify-between items-end sm:items-end -mt-12 mb-6 gap-4">
          <div className="flex items-end">
            <img 
              src={user.avatarUrl} 
              alt={user.displayName} 
              className="h-24 w-24 rounded-full border-4 border-white bg-white object-cover shadow-md z-10"
            />
          </div>
          
          <div className="flex-1 w-full sm:w-auto flex justify-between items-end pl-0 sm:pl-4">
             <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  {user.displayName}
                  {isCurrentUser && (
                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-md font-medium border border-slate-200">
                      You
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                   <p className="text-slate-500 text-sm font-medium">@{user.handle}</p>
                   {/* Badges Row */}
                   {user.badges.length > 0 && (
                     <div className="flex gap-1 ml-2">
                       {user.badges.map(badge => (
                         <Badge key={badge.id} badge={badge} size="sm" />
                       ))}
                     </div>
                   )}
                </div>
             </div>

             <div className="flex flex-col items-end gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border shadow-sm ${
                    stats.trustScore >= 90 ? 'bg-teal-50 text-teal-700 border-teal-200' : 
                    stats.trustScore >= 70 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                    'bg-slate-50 text-slate-700 border-slate-200'
                }`}>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{stats.trustScore}% Trust Score</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {user.location}
                  </div>
                  {isCurrentUser && (
                    <button 
                      onClick={onEditProfile}
                      className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded transition-colors"
                    >
                      <Edit2 className="h-3 w-3" /> Edit Profile
                    </button>
                  )}
                </div>
             </div>
          </div>
        </div>
        
        <p className="text-slate-700 mb-8 leading-relaxed max-w-3xl">
          {user.bio}
        </p>

        {/* Community Impact Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 flex items-center gap-4">
             <div className="p-3 bg-white rounded-lg shadow-sm text-indigo-600">
               <Gift className="h-6 w-6" />
             </div>
             <div>
               <div className="text-2xl font-bold text-slate-900">{stats.totalGifted}</div>
               <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Items Gifted</div>
             </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center gap-4">
             <div className="p-3 bg-white rounded-lg shadow-sm text-slate-600">
               <Package className="h-6 w-6" />
             </div>
             <div>
               <div className="text-2xl font-bold text-slate-900">{stats.totalRequests}</div>
               <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Requests Posted</div>
             </div>
          </div>

          <div className="bg-pink-50 rounded-xl p-4 border border-pink-100 flex items-center gap-4">
             <div className="p-3 bg-white rounded-lg shadow-sm text-pink-500">
               <TrendingUp className="h-6 w-6" />
             </div>
             <div>
               <div className="text-2xl font-bold text-slate-900">{stats.thanksReceived.length}</div>
               <div className="text-xs font-semibold text-pink-600 uppercase tracking-wide">Thanks Received</div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-6">
             {/* Context Modules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-indigo-600 font-semibold text-sm uppercase tracking-wide">
                  <Briefcase className="w-4 h-4" />
                  Current Projects
                </div>
                <ul className="space-y-3">
                  {user.projects.length > 0 ? user.projects.map((project, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="block mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                      {project}
                    </li>
                  )) : (
                     <li className="text-sm text-slate-400 italic">No active projects listed.</li>
                  )}
                </ul>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-pink-600 font-semibold text-sm uppercase tracking-wide">
                  <Heart className="w-4 h-4" />
                  Hobbies & Interests
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.hobbies.length > 0 ? user.hobbies.map((hobby, idx) => (
                    <span key={idx} className="bg-slate-50 text-slate-700 text-xs px-2.5 py-1.5 rounded-md border border-slate-200">
                      {hobby}
                    </span>
                  )) : (
                    <span className="text-sm text-slate-400 italic">No hobbies listed.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Recent Thanks */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-b from-slate-50 to-white p-5 rounded-xl border border-slate-200 h-full">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                 Recent Thanks
              </h3>
              
              <div className="space-y-4">
                {stats.thanksReceived.length > 0 ? (
                  stats.thanksReceived.slice(0, 3).map((note, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm relative">
                      <Quote className="h-3 w-3 text-pink-300 absolute top-2 left-2 transform -scale-x-100" />
                      <p className="text-xs text-slate-600 italic pl-4 mb-2">"{note.message}"</p>
                      <div className="text-[10px] text-slate-400 text-right font-medium uppercase tracking-wider">
                         - Verified Recipient
                      </div>
                    </div>
                  ))
                ) : (
                   <div className="text-center py-8 text-slate-400 text-sm italic">
                     No thank you notes yet.
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};