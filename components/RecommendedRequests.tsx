import React, { useEffect, useState } from 'react';
import { User, RequestItem } from '../types';
import { getSmartRecommendations } from '../services/geminiService';
import { Sparkles, ArrowRight } from 'lucide-react';

interface RecommendedRequestsProps {
    currentUser: User;
    requests: RequestItem[];
    onSelectRequest: (req: RequestItem) => void;
}

export const RecommendedRequests: React.FC<RecommendedRequestsProps> = ({ currentUser, requests, onSelectRequest }) => {
    const [recommendedIds, setRecommendedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchRecommendations = async () => {
            setLoading(true);
            const openRequests = requests.filter(r => r.status === 'OPEN' && r.requesterId !== currentUser.id);
            
            if (openRequests.length === 0) {
                setLoading(false);
                return;
            }

            // Map to simplified object for AI to save tokens
            const simplified = openRequests.map(r => ({
                id: r.id,
                title: r.title,
                reason: r.reason,
                category: r.category
            }));

            const ids = await getSmartRecommendations(currentUser.bio, currentUser.hobbies, simplified);
            setRecommendedIds(ids);
            setLoading(false);
        };
        
        // Only run if we have requests
        if (requests.length > 0) {
            fetchRecommendations();
        }
    }, [currentUser.id, requests.length]); // Dependency on requests.length prevents infinite loops but updates on new posts

    if (loading) return null; // Or a skeleton loader
    if (recommendedIds.length === 0) return null;

    const recommendedItems = requests.filter(r => recommendedIds.includes(r.id));
    if (recommendedItems.length === 0) return null;

    return (
        <div className="bg-gradient-to-r from-violet-100 to-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 animate-in fade-in">
            <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-violet-600" />
                <h3 className="text-sm font-bold text-violet-900">Picked for You</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {recommendedItems.map(req => (
                    <div 
                        key={req.id} 
                        onClick={() => onSelectRequest(req)}
                        className="bg-white p-3 rounded-lg shadow-sm border border-violet-100 cursor-pointer hover:shadow-md transition-all flex items-center justify-between group"
                    >
                        <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-sm truncate">{req.title}</p>
                            <p className="text-xs text-slate-500 line-clamp-1">{req.reason}</p>
                            <span className="text-[10px] text-violet-500 font-medium bg-violet-50 px-1 rounded mt-1 inline-block">
                                {req.category}
                            </span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-violet-300 group-hover:text-violet-600 flex-shrink-0 ml-2" />
                    </div>
                ))}
            </div>
        </div>
    );
};