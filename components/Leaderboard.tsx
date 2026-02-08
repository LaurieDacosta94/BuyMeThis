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
            return { ...user, giftedCount };
        }).sort((a, b) => b.trustScore - a.trustScore || b.giftedCount - a.giftedCount);
    }, [users, requests]);

    const top3 = sortedUsers.slice(0, 3);
    const rest = sortedUsers.slice(3);

    useEffect(() => {
        if (top3.length > 0) generateUserImpactDescription(top3[0].displayName, top3[0].giftedCount, top3[0].bio).then(setImpactStory);
    }, [top3[0]?.id]);

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="text-center mb-10 border-b border-slate-200 pb-8">
                <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-widest mb-2">Hall of Fame</h1>
                <p className="text-slate-500 font-mono text-sm">Top contributing operatives.</p>
                {impactStory && <div className="mt-4 bg-slate-100 inline-block px-4 py-2 border border-slate-200 text-xs font-mono text-slate-600">"{impactStory}"</div>}
            </div>

            {/* Top 3 Grid - No Podium Curves */}
            {top3.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mb-12">
                    {top3[1] && (
                        <div className="bg-white border border-slate-200 p-4 text-center mt-8">
                             <div className="text-2xl font-bold text-slate-300 mb-2">02</div>
                             <img src={top3[1].avatarUrl} className="w-16 h-16 mx-auto mb-2 border border-slate-200" alt="" />
                             <div className="font-bold text-slate-800 text-sm truncate">{top3[1].displayName}</div>
                             <div className="text-xs text-slate-500 font-mono">{top3[1].giftedCount} GIVEN</div>
                        </div>
                    )}
                    {top3[0] && (
                        <div className="bg-slate-900 border border-slate-900 p-4 text-center relative shadow-lg">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-black px-3 py-1 text-xs font-bold uppercase">Champion</div>
                            <img src={top3[0].avatarUrl} className="w-20 h-20 mx-auto mb-3 border-2 border-yellow-500" alt="" />
                            <div className="font-bold text-white text-lg truncate">{top3[0].displayName}</div>
                            <div className="text-xs text-yellow-500 font-mono font-bold">{top3[0].giftedCount} GIVEN</div>
                        </div>
                    )}
                    {top3[2] && (
                        <div className="bg-white border border-slate-200 p-4 text-center mt-12">
                             <div className="text-2xl font-bold text-slate-300 mb-2">03</div>
                             <img src={top3[2].avatarUrl} className="w-16 h-16 mx-auto mb-2 border border-slate-200" alt="" />
                             <div className="font-bold text-slate-800 text-sm truncate">{top3[2].displayName}</div>
                             <div className="text-xs text-slate-500 font-mono">{top3[2].giftedCount} GIVEN</div>
                        </div>
                    )}
                </div>
            )}

            {/* List Table */}
            <div className="bg-white border border-slate-200">
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <div className="w-12 text-center">#</div>
                    <div className="flex-1">Operative</div>
                    <div className="w-24 text-right">Score</div>
                </div>
                {rest.map((user, index) => (
                    <div key={user.id} className="flex items-center px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <div className="w-12 text-center font-mono text-slate-400 font-bold">{index + 4}</div>
                        <div className="flex-1 flex items-center gap-3">
                            <img src={user.avatarUrl} className="w-8 h-8 border border-slate-200 bg-slate-100" alt="" />
                            <div>
                                <div className="font-bold text-slate-900 text-sm">{user.displayName}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{user.trustScore}% Trust</div>
                            </div>
                        </div>
                        <div className="w-24 text-right font-bold text-blue-600 font-mono">{user.giftedCount}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};