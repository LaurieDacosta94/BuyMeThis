import React, { useMemo } from 'react';
import { User, RequestItem, RequestStatus } from '../types';
import { ShieldCheck, MapPin, Briefcase, Heart, Package, Gift, TrendingUp, Quote, Edit2, Camera } from 'lucide-react';
import { Badge } from './Badge';

interface UserProfileProps {
  user: User;
  requests: RequestItem[];
  isCurrentUser?: boolean;
  onEditProfile?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, requests, isCurrentUser, onEditProfile }) => {
  const stats = useMemo(() => {
    const myRequests = requests.filter(r => r.requesterId === user.id);
    const myFulfillments = requests.filter(r => r.fulfillerId === user.id && (r.status === RequestStatus.FULFILLED || r.status === RequestStatus.RECEIVED));
    const verifiedReceived = myRequests.filter(r => r.status === RequestStatus.RECEIVED);
    let score = 50 + (myFulfillments.length * 10) + (verifiedReceived.length * 5);
    if (score > 100) score = 100;

    return {
      totalRequests: myRequests.length,
      totalGifted: myFulfillments.length,
      trustScore: score,
      thanksReceived: requests.filter(r => r.fulfillerId === user.id && r.thankYouMessage).map(r => ({ id: r.id, message: r.thankYouMessage, from: r.requesterId }))
    };
  }, [user.id, requests]);

  const bannerImage = user.bannerUrl || `https://picsum.photos/seed/${user.id}_banner/1200/400`;

  return (
    <div className="bg-white border border-slate-200 mb-8 animate-in fade-in">
      
      {/* Banner */}
      <div className="h-48 relative group overflow-hidden bg-slate-900">
        <img src={bannerImage} alt="Profile Banner" className="w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-tech-grid opacity-30"></div>
        {isCurrentUser && (
            <button onClick={onEditProfile} className="absolute top-4 right-4 bg-black/50 hover:bg-black text-white p-2 transition-colors opacity-0 group-hover:opacity-100 rounded-none border border-white/20">
                <Camera className="h-4 w-4" />
            </button>
        )}
      </div>
      
      <div className="px-6 pb-6 relative">
        <div className="flex flex-col md:flex-row gap-6 -mt-16 mb-6 relative z-10 items-center md:items-end">
            {/* Square Avatar */}
            <div className="relative group">
                <img src={user.avatarUrl} alt={user.displayName} className="h-32 w-32 md:h-40 md:w-40 bg-white object-cover border-4 border-white shadow-sm rounded-none" />
                {isCurrentUser && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={onEditProfile}>
                        <Edit2 className="h-6 w-6 text-white" />
                    </div>
                )}
            </div>
            
            <div className="flex-1 pb-2 w-full md:w-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-center md:text-left">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 flex items-center justify-center md:justify-start gap-3">
                            {user.displayName}
                            {isCurrentUser && <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 font-bold uppercase">You</span>}
                        </h2>
                        <div className="flex items-center justify-center md:justify-start gap-2 mt-1 text-slate-500">
                            <p className="font-mono text-sm">@{user.handle}</p>
                            {user.badges.length > 0 && (
                                <div className="flex gap-1 ml-2">
                                    {user.badges.map(badge => <Badge key={badge.id} badge={badge} size="sm" />)}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-2 w-full md:w-auto">
                        {isCurrentUser && (
                            <button onClick={onEditProfile} className="text-xs bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 font-bold uppercase tracking-wide">
                                Edit Profile
                            </button>
                        )}
                        <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 border border-blue-100 text-blue-800 text-sm font-bold">
                            <ShieldCheck className="w-4 h-4" /> {stats.trustScore}% Verified
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 font-mono uppercase">
                            <MapPin className="w-3 h-3" /> {user.location}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <p className="max-w-3xl mb-8 text-slate-700 leading-relaxed font-medium border-l-4 border-slate-200 pl-4 mx-auto md:mx-0 text-center md:text-left">{user.bio || "No bio yet."}</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-slate-200 mb-8 bg-slate-50">
          <div className="p-6 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col items-center justify-center text-center hover:bg-white transition-colors">
             <div className="text-3xl font-bold text-slate-900 mb-1">{stats.totalGifted}</div>
             <div className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Gift className="h-3 w-3" /> Given</div>
          </div>
          <div className="p-6 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col items-center justify-center text-center hover:bg-white transition-colors">
             <div className="text-3xl font-bold text-slate-900 mb-1">{stats.totalRequests}</div>
             <div className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Package className="h-3 w-3" /> Requested</div>
          </div>
          <div className="p-6 flex flex-col items-center justify-center text-center hover:bg-white transition-colors">
             <div className="text-3xl font-bold text-slate-900 mb-1">{stats.thanksReceived.length}</div>
             <div className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><TrendingUp className="h-3 w-3" /> Karma</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-4 text-slate-900 font-bold text-sm uppercase tracking-wide border-b border-slate-100 pb-2">
                  <Briefcase className="w-4 h-4" /> Current Projects
                </div>
                <ul className="space-y-2">
                  {user.projects.length > 0 ? user.projects.map((project, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-3 font-mono">
                      <span className="text-slate-300">0{idx+1}</span> {project}
                    </li>
                  )) : <li className="text-sm text-slate-400 italic">None listed.</li>}
                </ul>
            </div>

            <div className="border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-4 text-slate-900 font-bold text-sm uppercase tracking-wide border-b border-slate-100 pb-2">
                  <Heart className="w-4 h-4" /> Interests
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.hobbies.length > 0 ? user.hobbies.map((hobby, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-700 text-xs px-3 py-1 font-medium border border-slate-200 uppercase">
                      {hobby}
                    </span>
                  )) : <span className="text-sm text-slate-400 italic">None listed.</span>}
                </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-slate-50 border border-slate-200 p-5 h-full">
              <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wide border-b border-slate-200 pb-2">Recent Feedback</h3>
              <div className="space-y-3">
                {stats.thanksReceived.length > 0 ? (
                  stats.thanksReceived.slice(0, 3).map((note, idx) => (
                    <div key={idx} className="bg-white p-3 border border-slate-200 text-sm">
                      <p className="text-slate-600 italic mb-2">"{note.message}"</p>
                      <div className="text-[10px] text-slate-400 text-right uppercase font-bold">- Verified User</div>
                    </div>
                  ))
                ) : <div className="text-center py-4 text-slate-400 text-xs italic">No notes yet.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};