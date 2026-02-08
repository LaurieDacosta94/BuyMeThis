import React, { useMemo, useEffect, useState } from 'react';
import { User, RequestItem, RequestStatus } from '../types';
import { Trophy, Gift, Award, Crown, Sparkles, TrendingUp, Medal } from 'lucide-react';
import { generateUserImpactDescription } from '../services/geminiService';

interface LeaderboardProps {
    users: User[];
    requests: RequestItem[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ users, requests }) => {
    const [impactStory, setImpactStory] = useState<string | null>(null);

    const sortedUsers = useMemo(() => {
        return users.map(user => {
            const giftedCount = requests.filter(r => r.fulfillerId === user.id && (r.status === RequestStatus.FULFILLED || r.status === RequestStatus.RECEIVED)).length;
            return {
                ...user,
                giftedCount
            };
        })
        .sort((a, b) => b.trustScore - a.trustScore || b.giftedCount - a.giftedCount);
    }, [users, requests]);

    const top3 = sortedUsers.slice(0, 3);
    const rest = sortedUsers.slice(3);

    useEffect(() => {
        const fetchImpact = async () => {
            if (top3.length > 0) {
                const winner = top3[0];
                const story = await generateUserImpactDescription(winner.displayName, winner.giftedCount, winner.bio);
                setImpactStory(story);
            }
        };
        fetchImpact();
    }, [top3[0]?.id]);

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            
            {/* Header Section */}
            <div className="text-center mb-10">
                <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">Community Hall of Fame</h1>
                <p className="text-slate-500 max-w-lg mx-auto">Celebrating the heroes who make our community kinder, one gift at a time.</p>
                
                {impactStory && (
                    <div className="mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-full px-4 py-1.5 animate-in zoom-in duration-700">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium text-amber-800 italic">"{impactStory}"</span>
                    </div>
                )}
            </div>

            {/* Podium Section */}
            {top3.length > 0 && (
                <div className="flex justify-center items-end gap-2 sm:gap-6 mb-12 h-64 px-4">
                    {/* 2nd Place */}
                    {top3[1] && (
                        <div className="flex flex-col items-center w-1/3 sm:w-32 animate-in slide-in-from-bottom-8 duration-700 delay-100">
                             <div className="relative mb-3">
                                <img src={top3[1].avatarUrl} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-slate-300 shadow-md object-cover" alt="" />
                                <div className="absolute -bottom-2 -right-2 bg-slate-300 text-slate-700 w-7 h-7 flex items-center justify-center rounded-full font-bold text-sm shadow-sm">2</div>
                             </div>
                             <div className="text-center mb-2">
                                 <p className="font-bold text-slate-800 text-sm sm:text-base truncate w-full">{top3[1].displayName}</p>
                                 <p className="text-xs text-slate-500">{top3[1].giftedCount} Gifts</p>
                             </div>
                             <div className="w-full bg-gradient-to-t from-slate-300 to-slate-100 h-24 rounded-t-lg shadow-sm border-x border-t border-slate-200 opacity-90"></div>
                        </div>
                    )}

                    {/* 1st Place */}
                    {top3[0] && (
                        <div className="flex flex-col items-center w-1/3 sm:w-40 z-10 animate-in slide-in-from-bottom-12 duration-700">
                            <div className="relative mb-3">
                                <Crown className="absolute -top-8 left-1/2 transform -translate-x-1/2 h-8 w-8 text-yellow-500 fill-yellow-200 animate-bounce" />
                                <img src={top3[0].avatarUrl} className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-yellow-400 shadow-lg object-cover" alt="" />
                                <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 w-8 h-8 flex items-center justify-center rounded-full font-bold text-base shadow-sm">1</div>
                            </div>
                            <div className="text-center mb-2">
                                <p className="font-bold text-slate-900 text-base sm:text-lg truncate w-full">{top3[0].displayName}</p>
                                <p className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full inline-block mt-0.5">{top3[0].giftedCount} Gifts</p>
                            </div>
                            <div className="w-full bg-gradient-to-t from-yellow-400 to-yellow-100 h-32 rounded-t-lg shadow-md border-x border-t border-yellow-300"></div>
                        </div>
                    )}

                    {/* 3rd Place */}
                    {top3[2] && (
                        <div className="flex flex-col items-center w-1/3 sm:w-32 animate-in slide-in-from-bottom-4 duration-700 delay-200">
                             <div className="relative mb-3">
                                <img src={top3[2].avatarUrl} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-orange-300 shadow-md object-cover" alt="" />
                                <div className="absolute -bottom-2 -right-2 bg-orange-300 text-orange-800 w-7 h-7 flex items-center justify-center rounded-full font-bold text-sm shadow-sm">3</div>
                             </div>
                             <div className="text-center mb-2">
                                 <p className="font-bold text-slate-800 text-sm sm:text-base truncate w-full">{top3[2].displayName}</p>
                                 <p className="text-xs text-slate-500">{top3[2].giftedCount} Gifts</p>
                             </div>
                             <div className="w-full bg-gradient-to-t from-orange-300 to-orange-100 h-16 rounded-t-lg shadow-sm border-x border-t border-orange-200 opacity-90"></div>
                        </div>
                    )}
                </div>
            )}

            {/* List Section */}
            {rest.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider flex">
                        <div className="w-12 text-center">Rank</div>
                        <div className="flex-1">Community Member</div>
                        <div className="w-24 text-right">Contribution</div>
                    </div>
                    {rest.map((user, index) => (
                        <div key={user.id} className="flex items-center p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 group">
                            <div className="w-12 text-center font-bold text-slate-400">
                                {index + 4}
                            </div>
                            
                            <div className="flex-1 flex items-center gap-4">
                                <img src={user.avatarUrl} alt={user.displayName} className="w-10 h-10 rounded-full bg-slate-200 object-cover border border-slate-100 group-hover:scale-110 transition-transform" />
                                <div>
                                    <h3 className="font-semibold text-slate-900">{user.displayName}</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <TrendingUp className="h-3 w-3 text-teal-500" /> {user.trustScore}% Trust
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="w-24 text-right">
                                <div className="font-bold text-indigo-600 flex items-center justify-end gap-1">
                                    {user.giftedCount} <Gift className="h-3 w-3" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {rest.length === 0 && top3.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    <Trophy className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p>No community data available yet.</p>
                </div>
            )}
        </div>
    );
};