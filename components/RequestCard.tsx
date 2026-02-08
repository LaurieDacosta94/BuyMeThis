import React, { useState, useRef } from 'react';
import { RequestItem, RequestStatus, User } from '../types';
import { validateContent, generateRequestSpeech, transcribeAudio } from '../services/geminiService';
import { MapPin, Clock, ArrowRight, PackageCheck, Truck, Quote, FileCheck, Navigation, MessageCircle, Send, AlertTriangle, Heart, Volume2, Loader2, StopCircle, Mic, ShieldCheck, Users, Trash2, RefreshCw, AlertOctagon, Terminal } from 'lucide-react';
import { Button } from './Button';
import { calculateDistance, formatDistance } from '../utils/geo';
import { playPcmAudio } from '../utils/audio';
import { LinkPreview } from './LinkPreview';

interface RequestCardProps {
  request: RequestItem;
  requester: User;
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
  request, requester, onFulfill, onMarkReceived, onViewProfile, onAddComment, currentUser, onRequireAuth, onOpenDetails, onDelete, showDelete, onReactivate
}) => {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  
  // TTS State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);

  // Voice Comment State
  const [isRecordingComment, setIsRecordingComment] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isMyRequest = currentUser && request.requesterId === currentUser.id;
  const isMyCommitment = currentUser && request.fulfillerId === currentUser.id;
  const amICandidate = currentUser && request.candidates?.includes(currentUser.id);
  
  const isReceived = request.status === RequestStatus.RECEIVED;
  const isFulfilled = request.status === RequestStatus.FULFILLED;
  
  const isVerifiedPurchase = request.receiptVerificationStatus === 'verified';
  const isInactive = request.status === RequestStatus.OPEN && (Date.now() - new Date(request.createdAt).getTime() > 30 * 24 * 60 * 60 * 1000);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'NOW';
    if (hours < 24) return `${hours}H`;
    return `${Math.floor(hours / 24)}D`;
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
    if (!currentUser) {
        onRequireAuth();
        return;
    }

    if (newComment.trim() && onAddComment) {
      setIsPostingComment(true);
      setCommentError(null);
      
      try {
        const safety = await validateContent(newComment);
        if (!safety.safe) {
            setCommentError(safety.reason || "Flagged.");
            setIsPostingComment(false);
            return;
        }

        onAddComment(request.id, newComment);
        setNewComment('');
      } catch (err) {
          setCommentError("Error.");
      } finally {
        setIsPostingComment(false);
      }
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
              source.onended = () => {
                  setIsPlayingAudio(false);
                  setAudioSource(null);
              };
          }
      } catch (err) { console.error(err); } finally { setIsLoadingAudio(false); }
  };

  const startRecording = async () => {
    if (!currentUser) {
        onRequireAuth();
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
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
            } catch (err) {
                setCommentError("Audio error.");
                setIsPostingComment(false);
            }
        };

        mediaRecorder.start();
        setIsRecordingComment(true);
    } catch (err) {
        setCommentError("No mic.");
    }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecordingComment) {
          mediaRecorderRef.current.stop();
          setIsRecordingComment(false);
      }
  };

  const handleActionClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!currentUser) { onRequireAuth(); return; }
      onFulfill(request);
  };

  const handleCardClick = (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('textarea') || (e.target as HTMLElement).closest('a')) {
          return;
      }
      if (onOpenDetails) onOpenDetails(request);
  };

  const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm("Delete this request?") && onDelete) onDelete(request);
  };

  return (
    <div 
        onClick={handleCardClick}
        className={`group bg-white border-2 border-slate-900 shadow-hard-sm hover:shadow-hard transition-all duration-200 cursor-pointer flex flex-col h-full relative ${isInactive ? 'opacity-75 grayscale' : ''}`}
    >
      {/* Anime Corner Accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white z-20"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white z-20"></div>

      <div className="relative h-40 overflow-hidden bg-slate-100 border-b-2 border-slate-900">
        <img 
          src={request.enrichedData?.imageUrl || `https://picsum.photos/seed/${request.id}/400/200`} 
          alt={request.title} 
          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
        />
        
        <div className="absolute top-0 left-0 right-0 p-2 flex justify-between items-start pointer-events-none">
           <div className="bg-slate-900 text-white px-2 py-0.5 text-[9px] font-mono font-bold tracking-widest border border-white">
             LOC: {request.location.toUpperCase().substring(0, 15)}
           </div>
           
           <div className="flex flex-col items-end gap-1">
               {distanceInfo && (
                <div className="bg-blue-600 text-white px-2 py-0.5 text-[9px] font-mono font-bold">
                   DST: {distanceInfo.toUpperCase()}
                 </div>
                )}
                <div className="bg-white text-slate-900 px-2 py-0.5 text-[9px] font-mono font-bold border border-slate-900">
                    CAT: {request.category.toUpperCase()}
                </div>
           </div>
        </div>

        {/* Status Overlays */}
        {isReceived ? (
          <div className="absolute inset-0 bg-green-900/90 flex items-center justify-center">
            <span className="border-2 border-white text-white px-4 py-2 text-lg font-mono font-bold uppercase tracking-widest -rotate-12">
              COMPLETED
            </span>
          </div>
        ) : isFulfilled ? (
          <div className="absolute inset-0 bg-blue-900/90 flex items-center justify-center">
            <span className="border-2 border-white text-white px-4 py-2 text-lg font-mono font-bold uppercase tracking-widest -rotate-12">
               {isVerifiedPurchase ? 'VERIFIED' : 'FULFILLED'}
            </span>
          </div>
        ) : isInactive ? (
            <div className="absolute inset-0 bg-slate-900/90 flex items-center justify-center">
                <div className="text-center pointer-events-auto">
                    <span className="text-white font-mono uppercase tracking-widest mb-2 block border-2 border-white px-2">INACTIVE</span>
                    {isMyRequest && (
                         <button onClick={(e) => {e.stopPropagation(); onReactivate && onReactivate(request)}} className="bg-blue-600 text-white px-3 py-1 text-xs uppercase font-bold hover:bg-blue-500 mt-2">
                             Reboot
                         </button>
                    )}
                </div>
            </div>
        ) : null}
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-2 pb-2 border-b border-dashed border-slate-300">
          <div 
            className="flex items-center gap-2 group/user cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onViewProfile && onViewProfile(requester.id); }}
          >
            <div className="relative">
                <img src={requester.avatarUrl} alt={requester.displayName} className="h-6 w-6 bg-slate-200 object-cover border border-slate-900" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 border border-white"></div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wide group-hover/user:text-blue-600">{requester.displayName}</p>
              <p className="text-[9px] text-slate-500 font-mono">ID: {requester.handle}</p>
            </div>
          </div>
          <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1 border border-slate-200">
            T-{timeAgo(request.createdAt)}
          </span>
        </div>

        <h3 className="text-sm font-black text-slate-900 mb-1 leading-snug uppercase tracking-tight">{request.title}</h3>
        <p className="text-slate-600 text-[11px] leading-relaxed mb-3 flex-1 line-clamp-3 font-medium border-l-2 border-blue-200 pl-2">
          {request.reason}
        </p>

        {request.productUrl && (
            <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1 text-[10px] text-blue-600 font-mono hover:underline">
                    <Terminal className="h-3 w-3" /> External_Link_Detected
                </div>
            </div>
        )}

        <div className="flex justify-between items-center mb-3">
             <button 
                onClick={handlePlayAudio}
                className="text-[10px] font-bold flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors uppercase font-mono bg-slate-100 px-2 py-1 border border-slate-200"
                disabled={isLoadingAudio}
            >
                {isLoadingAudio ? <Loader2 className="h-3 w-3 animate-spin" /> : isPlayingAudio ? <StopCircle className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                {isLoadingAudio ? 'LOAD' : isPlayingAudio ? 'STOP' : 'TTS.PLAY'}
            </button>
            
            {request.candidates && request.candidates.length > 0 && !isFulfilled && !isReceived && (
                <div className="flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50 px-2 py-1 border border-blue-200 font-mono">
                    <Users className="h-3 w-3" />
                    <span className="font-bold">{request.candidates.length}</span> OFFERS
                </div>
            )}

            {showDelete && !isFulfilled && !isReceived && (
                <button onClick={handleDelete} className="text-slate-400 hover:text-red-600">
                    <Trash2 className="h-3 w-3" />
                </button>
            )}
        </div>

        {/* Interaction Bar */}
        <div className="mt-auto">
          <div className="mb-2">
             <button 
               onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }}
               className="w-full text-[10px] font-bold text-slate-500 hover:text-slate-900 flex items-center justify-center gap-1 py-1 border-y border-slate-100 uppercase tracking-wider"
             >
               <MessageCircle className="h-3 w-3" />
               LOGS ({request.comments.length})
             </button>
          </div>

          {showComments && (
            <div className="bg-slate-50 border-y-2 border-slate-900 -mx-3 px-3 py-3 mb-3 text-xs" onClick={e => e.stopPropagation()}>
              <div className="space-y-2 mb-3 max-h-32 overflow-y-auto custom-scrollbar font-mono text-[10px]">
                  {request.comments.map(c => (
                      <div key={c.id} className="flex gap-2">
                          <span className="font-bold text-blue-600">[{c.userId === requester.id ? 'OP' : 'USR'}]</span>
                          <span className="text-slate-600">{c.text}</span>
                      </div>
                  ))}
                  {request.comments.length === 0 && <span className="text-slate-400 italic">// No data.</span>}
              </div>
              
              <form onSubmit={handleCommentSubmit} className="flex gap-1">
                <input 
                  type="text" 
                  value={newComment}
                  onChange={(e) => { setNewComment(e.target.value); setCommentError(null); }}
                  placeholder="Input..."
                  className="flex-1 bg-white border border-slate-400 px-2 py-1 text-[10px] font-mono focus:border-blue-600 outline-none"
                  disabled={isPostingComment || isRecordingComment}
                />
                 {isRecordingComment ? (
                     <button type="button" onClick={stopRecording} className="text-red-600 animate-pulse border border-red-600 px-1"><StopCircle className="h-3 w-3" /></button>
                   ) : (
                     <button type="button" onClick={startRecording} className="text-slate-600 border border-slate-400 hover:text-blue-600 px-1"><Mic className="h-3 w-3" /></button>
                   )}
                <button type="submit" disabled={!newComment} className="bg-slate-900 text-white text-[10px] px-2 font-mono hover:bg-slate-700 disabled:bg-slate-400">></button>
              </form>
            </div>
          )}

          {/* Action Area */}
          <div className="pt-0">
             {isMyRequest ? (
               isFulfilled ? (
                 <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); onMarkReceived && onMarkReceived(request); }} className="w-full bg-green-600 hover:bg-green-700 font-mono text-xs">
                   CONFIRM_RECEIPT
                 </Button>
               ) : isReceived ? (
                  <div className="w-full bg-slate-200 text-slate-500 font-bold py-2 text-center text-[10px] border border-slate-300 uppercase font-mono">
                    STATUS: RECEIVED
                  </div>
               ) : (
                  <div className="w-full bg-white text-slate-400 font-bold py-2 text-center text-[10px] border border-slate-300 uppercase tracking-widest font-mono">
                    OWNER_MODE
                  </div>
               )
             ) : isMyCommitment ? (
               isFulfilled ? (
                  <Button size="sm" variant="outline" onClick={handleActionClick} className="w-full font-mono text-xs">
                    UPDATE_TRACKING
                  </Button>
               ) : (
                  <Button size="sm" variant="secondary" onClick={handleActionClick} className="w-full font-mono text-xs">
                     FINALIZE_OP <ArrowRight className="ml-2 h-3 w-3" />
                   </Button>
               )
             ) : (
               isReceived || isFulfilled ? (
                 <div className="w-full bg-slate-100 text-slate-300 font-bold py-2 text-center text-[10px] border border-slate-200 uppercase font-mono">
                    ARCHIVED
                 </div>
               ) : amICandidate ? (
                 <Button size="sm" variant="secondary" onClick={handleActionClick} className="w-full font-mono text-xs">
                    CONFIRM_HELP
                 </Button>
               ) : isInactive ? (
                 <div className="w-full bg-slate-100 text-slate-400 font-bold py-2 text-center text-[10px] border border-slate-200 uppercase font-mono">
                    SUSPENDED
                 </div>
               ) : (
                 <Button size="sm" variant="primary" onClick={handleActionClick} className="w-full font-mono text-xs">
                   INITIATE_HELP <ArrowRight className="ml-2 h-3 w-3" />
                 </Button>
               )
             )}
          </div>
        </div>
      </div>
    </div>
  );
};