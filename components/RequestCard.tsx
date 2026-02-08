
import React, { useState, useRef } from 'react';
import { RequestItem, RequestStatus, User } from '../types';
import { validateContent, generateRequestSpeech, transcribeAudio } from '../services/geminiService';
import { MapPin, Volume2, Loader2, StopCircle, Mic, Users, Trash2, MessageCircle, Send, Heart, Play, Pause, ExternalLink, CornerDownRight } from 'lucide-react';
import { Button } from './Button';
import { calculateDistance, formatDistance } from '../utils/geo';
import { playPcmAudio } from '../utils/audio';

interface RequestCardProps {
  request: RequestItem;
  requester: User;
  usersMap: Record<string, User>; // Added usersMap to look up comment authors
  onFulfill: (request: RequestItem) => void;
  onMarkReceived?: (request: RequestItem) => void;
  onViewProfile?: (userId: string) => void;
  onAddComment?: (requestId: string, text: string) => void;
  currentUser: User | null;
  onRequireAuth: () => void;
  onOpenDetails?: (request: RequestItem) => void;
  onDelete?: (request: RequestItem) => void;
  showDelete?: boolean;
  onReactivate?: (request: RequestItem) => void;
}

export const RequestCard: React.FC<RequestCardProps> = ({ 
  request, requester, usersMap, onFulfill, onMarkReceived, onViewProfile, onAddComment, currentUser, onRequireAuth, onOpenDetails, onDelete, showDelete, onReactivate
}) => {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  
  // TTS State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);

  // Voice Comment State
  const [isRecordingComment, setIsRecordingComment] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isMyRequest = currentUser && request.requesterId === currentUser.id;
  // Check if I have an active fulfillment record or am the main fulfiller (legacy)
  const myFulfillment = currentUser && request.fulfillments?.find(f => f.fulfillerId === currentUser.id);
  const isMyCommitment = currentUser && (request.fulfillerId === currentUser.id || !!myFulfillment);
  
  const amICandidate = currentUser && request.candidates?.includes(currentUser.id);
  
  const isReceived = request.status === RequestStatus.RECEIVED;
  // "Fulfilled" globally or if I have personally fulfilled it
  const isFulfilled = request.status === RequestStatus.FULFILLED || myFulfillment?.status === RequestStatus.FULFILLED;
  
  const isInactive = request.status === RequestStatus.OPEN && (Date.now() - new Date(request.createdAt).getTime() > 30 * 24 * 60 * 60 * 1000);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const distanceInfo = React.useMemo(() => {
    if (currentUser?.coordinates && request.coordinates) {
      const dist = calculateDistance(
        currentUser.coordinates.lat, 
        currentUser.coordinates.lng,
        request.coordinates.lat, 
        request.coordinates.lng
      );
      return formatDistance(dist);
    }
    return null;
  }, [currentUser?.coordinates, request.coordinates]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) { onRequireAuth(); return; }

    if (newComment.trim() && onAddComment) {
      setIsPostingComment(true);
      try {
        const safety = await validateContent(newComment);
        if (!safety.safe) {
            alert(safety.reason || "Flagged as unsafe.");
            setIsPostingComment(false);
            return;
        }
        onAddComment(request.id, newComment);
        setNewComment('');
      } catch (err) { console.error(err); } finally { setIsPostingComment(false); }
    }
  };

  const handlePlayAudio = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isPlayingAudio && audioSource) {
          audioSource.stop();
          setIsPlayingAudio(false);
          setAudioSource(null);
          return;
      }
      setIsLoadingAudio(true);
      try {
          const textToRead = `${request.title}. ${request.reason}`;
          const audioBase64 = await generateRequestSpeech(textToRead);
          if (audioBase64) {
              const source = await playPcmAudio(audioBase64);
              setAudioSource(source);
              setIsPlayingAudio(true);
              source.onended = () => { setIsPlayingAudio(false); setAudioSource(null); };
          }
      } catch (err) { console.error(err); } finally { setIsLoadingAudio(false); }
  };

  const startRecording = async () => {
    if (!currentUser) { onRequireAuth(); return; }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
            stream.getTracks().forEach(track => track.stop());
            setIsPostingComment(true);
            try {
                 const reader = new FileReader();
                 reader.readAsDataURL(audioBlob);
                 reader.onloadend = async () => {
                     const base64Audio = reader.result as string;
                     const text = await transcribeAudio(base64Audio);
                     if (text) setNewComment(prev => prev + (prev ? ' ' : '') + text);
                     setIsPostingComment(false);
                 };
            } catch (err) { setIsPostingComment(false); }
        };
        mediaRecorderRef.current.start();
        setIsRecordingComment(true);
    } catch (err) { alert("Mic required"); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current && isRecordingComment) { mediaRecorderRef.current.stop(); setIsRecordingComment(false); } };
  const handleDelete = (e: React.MouseEvent) => { e.stopPropagation(); if (confirm("Delete?") && onDelete) onDelete(request); };

  return (
    <div 
        onClick={(e) => {
             // Prevent card click when clicking interactive elements
             if ((e.target as HTMLElement).closest('button, input, a')) return;
             onOpenDetails && onOpenDetails(request);
        }}
        className={`group bg-white rounded-3xl shadow-glow border border-white/50 overflow-hidden hover:shadow-glow-hover transition-all duration-300 relative flex flex-col h-full ${isInactive ? 'opacity-80 grayscale-[0.5]' : ''}`}
    >
      {/* Image Header */}
      <div className="relative h-48 overflow-hidden">
        <div className="absolute inset-0 bg-slate-200" />
        <img 
          src={request.enrichedData?.imageUrl || `https://picsum.photos/seed/${request.id}/400/200`} 
          alt={request.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
        
        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
            <div className="bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-cyan-700 shadow-sm flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {request.location.split(',')[0]}
            </div>
            {distanceInfo && (
                <div className="bg-blue-500/90 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-white shadow-sm">
                    {distanceInfo}
                </div>
            )}
        </div>
        
        {/* Category Badge */}
        <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-white shadow-sm uppercase tracking-wide">
            {request.category}
        </div>

        {/* Status Overlay */}
        {isReceived ? (
             <div className="absolute inset-0 flex items-center justify-center bg-green-500/80 backdrop-blur-[2px]">
                 <div className="bg-white text-green-600 px-4 py-1.5 rounded-full font-bold shadow-lg transform -rotate-3 text-sm">
                    Completed
                 </div>
             </div>
        ) : request.status === RequestStatus.FULFILLED ? (
             <div className="absolute inset-0 flex items-center justify-center bg-blue-500/80 backdrop-blur-[2px]">
                 <div className="bg-white text-blue-600 px-4 py-1.5 rounded-full font-bold shadow-lg transform -rotate-3 text-sm">
                    Fulfilled
                 </div>
             </div>
        ) : isInactive && (
             <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 backdrop-blur-[2px]">
                 <div className="text-center">
                    <span className="text-white font-bold block mb-2">Inactive</span>
                    {isMyRequest && (
                        <button onClick={(e) => { e.stopPropagation(); onReactivate && onReactivate(request); }} className="px-3 py-1 bg-cyan-500 text-white rounded-full text-xs font-bold hover:bg-cyan-400">
                            Reactivate
                        </button>
                    )}
                 </div>
             </div>
        )}
      </div>

      {/* Content Body */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
             <div className="flex items-center gap-2" onClick={(e) => {e.stopPropagation(); onViewProfile && onViewProfile(requester.id)}}>
                 <img src={requester.avatarUrl} alt={requester.displayName} className="w-8 h-8 rounded-full border-2 border-white shadow-sm object-cover" />
                 <div>
                     <p className="text-xs font-bold text-slate-800 leading-tight">{requester.displayName}</p>
                     <p className="text-[10px] text-slate-400 font-medium">@{requester.handle}</p>
                 </div>
             </div>
             <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">{timeAgo(request.createdAt)}</span>
        </div>

        <h3 className="font-bold text-slate-900 text-base leading-tight mb-2 line-clamp-1 group-hover:text-cyan-600 transition-colors">
            {request.title}
        </h3>
        
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-4 flex-1">
            {request.reason}
        </p>

        {request.productUrl && (
             <a href={request.productUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-600 hover:text-cyan-700 mb-4 bg-cyan-50 p-2 rounded-xl w-fit transition-colors">
                 <ExternalLink className="w-3 h-3" /> Product Link
             </a>
        )}

        <div className="flex items-center justify-between mb-4 border-t border-slate-100 pt-3">
             <div className="flex gap-2">
                 <button 
                    onClick={handlePlayAudio}
                    className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-cyan-100 hover:text-cyan-600 flex items-center justify-center transition-colors"
                 >
                    {isLoadingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : isPlayingAudio ? <StopCircle className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                 </button>
                 <button 
                    onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }}
                    className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-pink-100 hover:text-pink-500 flex items-center justify-center transition-colors"
                 >
                    <MessageCircle className="w-4 h-4" />
                 </button>
             </div>

             {request.candidates && request.candidates.length > 0 && !isFulfilled && (
                 <div className="flex items-center text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                     <Users className="w-3 h-3 mr-1" /> {request.candidates.length} Offers
                 </div>
             )}
             
             {showDelete && (
                 <button onClick={handleDelete} className="text-slate-300 hover:text-red-500 p-1">
                     <Trash2 className="w-4 h-4" />
                 </button>
             )}
        </div>

        {/* Comments Section */}
        {showComments && (
            <div className="bg-slate-50 rounded-2xl p-3 mb-3 animate-in fade-in slide-in-from-top-2" onClick={e => e.stopPropagation()}>
                <div className="space-y-2 mb-2 max-h-24 overflow-y-auto custom-scrollbar">
                    {request.comments.length > 0 ? request.comments.map(c => {
                        const commenter = usersMap[c.userId];
                        const name = commenter ? commenter.displayName : 'Unknown';
                        return (
                          <div key={c.id} className="text-[10px] flex gap-2">
                              <span className="font-bold text-slate-700 shrink-0">{c.userId === requester.id ? 'OP' : name}</span>
                              <span className="text-slate-500">{c.text}</span>
                          </div>
                        );
                    }) : <p className="text-[10px] text-slate-400 italic text-center">No messages yet.</p>}
                </div>
                <form onSubmit={handleCommentSubmit} className="relative">
                    <input 
                        className="w-full bg-white border border-slate-200 rounded-full px-3 py-1.5 text-xs pr-16 focus:border-cyan-400 outline-none"
                        placeholder="Write something..."
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                    />
                    <div className="absolute right-1 top-1 flex gap-1">
                         {isRecordingComment ? (
                             <button type="button" onClick={stopRecording} className="p-0.5 text-red-500 animate-pulse"><StopCircle className="w-4 h-4" /></button>
                         ) : (
                             <button type="button" onClick={startRecording} className="p-0.5 text-slate-400 hover:text-cyan-600"><Mic className="w-4 h-4" /></button>
                         )}
                         <button type="submit" disabled={!newComment} className="p-0.5 text-cyan-600 hover:text-cyan-700 disabled:opacity-30"><Send className="w-4 h-4" /></button>
                    </div>
                </form>
            </div>
        )}

        {/* Action Button */}
        <div>
            {isMyRequest ? (
               isFulfilled ? (
                   <Button size="sm" onClick={(e) => { e.stopPropagation(); onMarkReceived && onMarkReceived(request); }} className="w-full rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold shadow-lg shadow-green-500/20">
                       Confirm Receipt
                   </Button>
               ) : isReceived ? (
                   <div className="w-full text-center py-2 text-xs font-bold text-slate-400 bg-slate-50 rounded-xl border border-slate-100">Request Complete</div>
               ) : (
                   <div className="w-full text-center py-2 text-xs font-bold text-slate-400 bg-slate-50 rounded-xl border border-slate-100">Waiting for Heroes</div>
               )
            ) : isMyCommitment ? (
                myFulfillment?.status === RequestStatus.FULFILLED ? (
                     <Button size="sm" variant="outline" onClick={(e) => {e.stopPropagation(); onFulfill(request)}} className="w-full rounded-xl border-green-200 text-green-600 bg-green-50">You Fulfilled This</Button>
                ) : (
                     <Button size="sm" variant="secondary" onClick={(e) => {e.stopPropagation(); onFulfill(request)}} className="w-full rounded-xl">Finalize</Button>
                )
            ) : amICandidate ? (
                <Button size="sm" variant="secondary" onClick={(e) => {e.stopPropagation(); onFulfill(request)}} className="w-full rounded-xl border-blue-200 text-blue-600 bg-blue-50">Pending...</Button>
            ) : (
                <Button size="sm" variant="primary" onClick={(e) => {e.stopPropagation(); onFulfill(request)}} className="w-full rounded-xl shadow-lg shadow-cyan-500/20">
                    I Can Help!
                </Button>
            )}
        </div>
      </div>
    </div>
  );
};
