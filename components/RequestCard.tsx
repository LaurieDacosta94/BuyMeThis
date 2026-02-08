import React, { useState, useRef } from 'react';
import { RequestItem, RequestStatus, User } from '../types';
import { validateContent, generateRequestSpeech, transcribeAudio } from '../services/geminiService';
import { MapPin, Clock, ArrowRight, PackageCheck, Truck, Quote, FileCheck, Navigation, MessageCircle, Send, AlertTriangle, Heart, Volume2, Loader2, StopCircle, Mic, ShieldCheck, Users, Trash2, RefreshCw, AlertOctagon } from 'lucide-react';
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
  const [showReceipt, setShowReceipt] = useState(false);
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
    if (hours < 24) return `${hours}H AGO`;
    return `${Math.floor(hours / 24)}D AGO`;
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
            setCommentError(safety.reason || "Flagged inappropriate.");
            setIsPostingComment(false);
            return;
        }

        onAddComment(request.id, newComment);
        setNewComment('');
      } catch (err) {
          setCommentError("Failed to post.");
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
                setCommentError("Audio failed.");
                setIsPostingComment(false);
            }
        };

        mediaRecorder.start();
        setIsRecordingComment(true);
    } catch (err) {
        setCommentError("No mic access.");
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
        className={`group bg-white border border-slate-200 hover:border-blue-500 transition-colors duration-200 cursor-pointer flex flex-col h-full relative ${isInactive ? 'opacity-75 grayscale' : ''}`}
    >
      <div className="relative h-48 overflow-hidden bg-slate-100 border-b border-slate-200">
        <img 
          src={request.enrichedData?.imageUrl || `https://picsum.photos/seed/${request.id}/400/200`} 
          alt={request.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-start pointer-events-none">
           <div className="bg-slate-900/90 text-white px-2 py-1 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
             <MapPin className="h-3 w-3" />
             {request.location}
           </div>
           
           <div className="flex gap-2">
               {distanceInfo && (
                <div className="bg-blue-600/90 text-white px-2 py-1 text-[10px] uppercase font-bold tracking-wider">
                   {distanceInfo}
                 </div>
                )}
                <div className="bg-white/90 text-slate-900 px-2 py-1 text-[10px] uppercase font-bold tracking-wider border border-slate-900">
                    {request.category}
                </div>
           </div>
        </div>

        {/* Status Overlays */}
        {isReceived ? (
          <div className="absolute inset-0 bg-green-900/70 flex items-center justify-center">
            <span className="border-2 border-white text-white px-4 py-2 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <PackageCheck className="h-5 w-5" /> Received
            </span>
          </div>
        ) : isFulfilled ? (
          <div className="absolute inset-0 bg-blue-900/70 flex items-center justify-center">
            <span className="border-2 border-white text-white px-4 py-2 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
               {isVerifiedPurchase ? <ShieldCheck className="h-5 w-5" /> : null} 
               {isVerifiedPurchase ? 'Verified' : 'Fulfilled'}
            </span>
          </div>
        ) : isInactive ? (
            <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                <div className="text-center pointer-events-auto">
                    <span className="text-white text-sm font-mono uppercase tracking-widest mb-2 block">Inactive</span>
                    {isMyRequest && (
                         <button onClick={(e) => {e.stopPropagation(); onReactivate && onReactivate(request)}} className="bg-blue-600 text-white px-3 py-1 text-xs uppercase font-bold hover:bg-blue-500">
                             Reactivate
                         </button>
                    )}
                </div>
            </div>
        ) : null}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div 
            className="flex items-center gap-3 group/user cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onViewProfile && onViewProfile(requester.id); }}
          >
            <img src={requester.avatarUrl} alt={requester.displayName} className="h-8 w-8 bg-slate-200 object-cover rounded-none" />
            <div>
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wide group-hover/user:text-blue-600">{requester.displayName}</p>
              <p className="text-[10px] text-slate-500 font-mono">@{requester.handle}</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {timeAgo(request.createdAt)}
          </span>
        </div>

        <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug">{request.title}</h3>
        <p className="text-slate-600 text-xs leading-relaxed mb-4 flex-1 line-clamp-3 font-medium">
          {request.reason}
        </p>

        {request.productUrl && (
            <div className="mb-4" onClick={(e) => e.stopPropagation()}>
                <LinkPreview url={request.productUrl} />
            </div>
        )}

        {request.candidates && request.candidates.length > 0 && !isFulfilled && !isReceived && (
            <div className="mb-3 flex items-center gap-2 text-xs text-blue-700 bg-blue-50 p-2 border border-blue-100">
                <Users className="h-3 w-3" />
                <span className="font-bold">{request.candidates.length}</span> offers pending
            </div>
        )}
        
        <div className="flex justify-between items-center mb-4">
             <button 
                onClick={handlePlayAudio}
                className="text-xs font-bold flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors uppercase"
                disabled={isLoadingAudio}
            >
                {isLoadingAudio ? <Loader2 className="h-3 w-3 animate-spin" /> : isPlayingAudio ? <StopCircle className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                {isLoadingAudio ? 'Loading...' : isPlayingAudio ? 'Stop' : 'Listen'}
            </button>

            {showDelete && !isFulfilled && !isReceived && (
                <button 
                    onClick={handleDelete}
                    className="text-slate-400 hover:text-red-600"
                    title="Delete Request"
                >
                    <Trash2 className="h-3 w-3" />
                </button>
            )}
        </div>

        {/* Interaction Bar */}
        <div className="border-t border-slate-100 pt-3 mt-auto">
          
          <div className="mb-3">
             <button 
               onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }}
               className="w-full text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center justify-center gap-2 py-1 transition-colors uppercase"
             >
               <MessageCircle className="h-3 w-3" />
               {request.comments.length > 0 ? `${request.comments.length} Comments` : 'Discussion'}
             </button>
          </div>

          {showComments && (
            <div className="bg-slate-50 border-y border-slate-200 -mx-4 px-4 py-3 mb-3 text-xs" onClick={e => e.stopPropagation()}>
              <div className="space-y-2 mb-3 max-h-32 overflow-y-auto custom-scrollbar">
                  {request.comments.map(c => (
                      <div key={c.id} className="flex gap-2">
                          <span className="font-bold text-slate-900">{c.userId === requester.id ? 'OP' : 'User'}:</span>
                          <span className="text-slate-600">{c.text}</span>
                      </div>
                  ))}
                  {request.comments.length === 0 && <span className="text-slate-400 italic">No comments.</span>}
              </div>
              
              <form onSubmit={handleCommentSubmit} className="flex gap-2">
                <input 
                  type="text" 
                  value={newComment}
                  onChange={(e) => { setNewComment(e.target.value); setCommentError(null); }}
                  placeholder="Type..."
                  className="flex-1 bg-white border border-slate-300 px-2 py-1 rounded-none outline-none focus:border-blue-500"
                  disabled={isPostingComment || isRecordingComment}
                />
                 {isRecordingComment ? (
                     <button type="button" onClick={stopRecording} className="text-red-600 animate-pulse"><StopCircle className="h-4 w-4" /></button>
                   ) : (
                     <button type="button" onClick={startRecording} className="text-slate-400 hover:text-blue-600"><Mic className="h-4 w-4" /></button>
                   )}
                <button type="submit" disabled={!newComment} className="text-blue-600 font-bold disabled:text-slate-300">SEND</button>
              </form>
              {commentError && <div className="text-red-600 mt-1">{commentError}</div>}
            </div>
          )}

          {/* Action Area */}
          <div className="pt-1">
             {isMyRequest ? (
               isFulfilled ? (
                 <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); onMarkReceived && onMarkReceived(request); }} className="w-full bg-green-600 hover:bg-green-700">
                   Confirm Receipt
                 </Button>
               ) : isReceived ? (
                  <div className="w-full bg-slate-100 text-slate-500 font-bold py-2 text-center text-xs border border-slate-200 uppercase">
                    Received
                  </div>
               ) : (
                  <div className="w-full bg-slate-50 text-slate-400 font-bold py-2 text-center text-xs border border-slate-200 uppercase tracking-widest">
                    Your Request
                  </div>
               )
             ) : isMyCommitment ? (
               isFulfilled ? (
                  <Button size="sm" variant="outline" onClick={handleActionClick} className="w-full">
                    Update Tracking
                  </Button>
               ) : (
                  <Button size="sm" variant="secondary" onClick={handleActionClick} className="w-full">
                     Finalize Purchase <ArrowRight className="ml-2 h-3 w-3" />
                   </Button>
               )
             ) : (
               isReceived || isFulfilled ? (
                 <div className="w-full bg-slate-50 text-slate-300 font-bold py-2 text-center text-xs border border-slate-100 uppercase">
                    Closed
                 </div>
               ) : amICandidate ? (
                 <Button size="sm" variant="secondary" onClick={handleActionClick} className="w-full">
                    Confirm Help
                 </Button>
               ) : isInactive ? (
                 <div className="w-full bg-slate-100 text-slate-400 font-bold py-2 text-center text-xs border border-slate-200 uppercase">
                    Inactive
                 </div>
               ) : (
                 <Button size="sm" variant="primary" onClick={handleActionClick} className="w-full">
                   Fulfill Request <ArrowRight className="ml-2 h-3 w-3" />
                 </Button>
               )
             )}
          </div>
        </div>
      </div>
    </div>
  );
};