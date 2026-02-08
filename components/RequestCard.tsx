import React, { useState, useRef } from 'react';
import { RequestItem, RequestStatus, User, Comment } from '../types';
import { validateContent, generateRequestSpeech, transcribeAudio } from '../services/geminiService';
import { MapPin, Clock, ArrowRight, PackageCheck, Truck, Quote, FileCheck, Navigation, MessageCircle, Send, AlertTriangle, Heart, Volume2, Loader2, StopCircle, Mic, ShieldCheck } from 'lucide-react';
import { Button } from './Button';
import { calculateDistance, formatDistance } from '../utils/geo';
import { playPcmAudio } from '../utils/audio';

interface RequestCardProps {
  request: RequestItem;
  requester: User;
  onFulfill: (request: RequestItem) => void;
  onMarkReceived?: (request: RequestItem) => void;
  onViewProfile?: (userId: string) => void;
  onAddComment?: (requestId: string, text: string) => void;
  currentUser: User;
}

export const RequestCard: React.FC<RequestCardProps> = ({ 
  request, requester, onFulfill, onMarkReceived, onViewProfile, onAddComment, currentUser 
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

  const isMyRequest = request.requesterId === currentUser.id;
  const isMyCommitment = request.fulfillerId === currentUser.id;
  
  const isReceived = request.status === RequestStatus.RECEIVED;
  const isFulfilled = request.status === RequestStatus.FULFILLED;
  const isPending = request.status === RequestStatus.PENDING;
  
  const isVerifiedPurchase = request.receiptVerificationStatus === 'verified';

  // Calculate generic time ago
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Calculate distance if both user and request have coords
  const distanceInfo = React.useMemo(() => {
    if (currentUser.coordinates && request.coordinates) {
      const dist = calculateDistance(
        currentUser.coordinates.lat, 
        currentUser.coordinates.lng,
        request.coordinates.lat, 
        request.coordinates.lng
      );
      return formatDistance(dist);
    }
    return null;
  }, [currentUser.coordinates, request.coordinates]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim() && onAddComment) {
      setIsPostingComment(true);
      setCommentError(null);
      
      try {
        const safety = await validateContent(newComment);
        if (!safety.safe) {
            setCommentError(safety.reason || "This comment was flagged as inappropriate.");
            setIsPostingComment(false);
            return;
        }

        onAddComment(request.id, newComment);
        setNewComment('');
      } catch (err) {
          setCommentError("Failed to post comment.");
      } finally {
        setIsPostingComment(false);
      }
    }
  };

  const handlePlayAudio = async () => {
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
      } catch (err) {
          console.error(err);
      } finally {
          setIsLoadingAudio(false);
      }
  };

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
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
                     if (text) {
                        setNewComment(prev => prev + (prev ? ' ' : '') + text);
                     }
                     setIsPostingComment(false);
                 };
            } catch (err) {
                setCommentError("Failed to transcribe audio.");
                setIsPostingComment(false);
            }
        };

        mediaRecorder.start();
        setIsRecordingComment(true);
    } catch (err) {
        setCommentError("Could not access microphone.");
    }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecordingComment) {
          mediaRecorderRef.current.stop();
          setIsRecordingComment(false);
      }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col ${isReceived ? 'opacity-90' : ''}`}>
      <div className="relative h-48 overflow-hidden bg-slate-100 group">
        <img 
          src={request.enrichedData?.imageUrl || `https://picsum.photos/seed/${request.id}/400/200`} 
          alt={request.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
           <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-semibold text-slate-700 flex items-center gap-1 shadow-sm">
             <MapPin className="h-3 w-3 text-indigo-500" />
             {request.location}
           </div>
           {distanceInfo && (
             <div className="bg-indigo-900/80 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-semibold text-white flex items-center gap-1 shadow-sm">
               <Navigation className="h-3 w-3" />
               {distanceInfo}
             </div>
           )}
        </div>
        
        <div className="absolute top-3 right-3">
          <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-slate-600 shadow-sm border border-slate-200">
            {request.category}
          </span>
        </div>

        {/* Status Badges */}
        {isReceived ? (
          <div className="absolute inset-0 bg-green-900/60 flex items-center justify-center backdrop-blur-[2px]">
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold shadow-lg transform -rotate-6 border-2 border-green-200 flex items-center gap-1">
              <PackageCheck className="h-4 w-4" /> RECEIVED
            </span>
          </div>
        ) : isFulfilled ? (
          <div className="absolute inset-0 bg-teal-900/40 flex items-center justify-center backdrop-blur-[2px]">
            <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-bold shadow-lg transform -rotate-6 border-2 border-teal-200 flex items-center gap-1">
               {isVerifiedPurchase ? <ShieldCheck className="h-4 w-4 text-teal-600" /> : null} 
               {isVerifiedPurchase ? 'VERIFIED PURCHASE' : 'PURCHASED'}
            </span>
          </div>
        ) : null}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div 
            className="flex items-center gap-2 group/user cursor-pointer"
            onClick={() => onViewProfile && onViewProfile(requester.id)}
            title="View Profile"
          >
            <img src={requester.avatarUrl} alt={requester.displayName} className="h-8 w-8 rounded-full bg-slate-200 object-cover ring-2 ring-transparent group-hover/user:ring-indigo-100 transition-all" />
            <div>
              <p className="text-sm font-medium text-slate-900 leading-tight group-hover/user:text-indigo-600 transition-colors">{requester.displayName}</p>
              <p className="text-xs text-slate-500">@{requester.handle}</p>
            </div>
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(request.createdAt)}
          </span>
        </div>

        <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1">{request.title}</h3>
        <p className="text-slate-600 text-sm line-clamp-3 mb-4 flex-1">
          {request.reason}
        </p>
        
        {/* Listen Button */}
        <div className="mb-4">
            <button 
                onClick={handlePlayAudio}
                className={`text-xs flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${isPlayingAudio ? 'bg-indigo-100 text-indigo-700 animate-pulse' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                disabled={isLoadingAudio}
            >
                {isLoadingAudio ? <Loader2 className="h-3 w-3 animate-spin" /> : isPlayingAudio ? <StopCircle className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                {isLoadingAudio ? 'Loading Audio...' : isPlayingAudio ? 'Stop Listening' : 'Listen to Story'}
            </button>
        </div>

        {/* Receipt Toggle */}
        {(isFulfilled || isReceived) && request.proofOfPurchaseImage && isMyRequest && (
          <div className="mb-4">
             <button 
               onClick={() => setShowReceipt(!showReceipt)}
               className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-2"
             >
               <FileCheck className="h-3 w-3" />
               {showReceipt ? 'Hide Receipt' : 'View Proof of Purchase'}
             </button>
             
             {showReceipt && (
               <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                 <img 
                   src={request.proofOfPurchaseImage} 
                   alt="Proof of Purchase" 
                   className="w-full h-auto rounded-md shadow-sm border border-slate-100" 
                 />
                 {isVerifiedPurchase && (
                     <div className="mt-2 bg-green-50 border border-green-200 rounded p-1.5 flex items-center gap-2 text-[10px] text-green-700 font-medium">
                         <ShieldCheck className="h-3 w-3" /> Verified by AI as valid proof of purchase.
                     </div>
                 )}
                 <div className="text-[10px] text-slate-400 text-center mt-1">Uploaded by Fulfiller</div>
               </div>
             )}
          </div>
        )}

        {/* Gift Message Display (From Donor) */}
        {(isFulfilled || isReceived) && request.giftMessage && (
           <div className="mt-4 mb-2 bg-indigo-50 p-3 rounded-lg border border-indigo-100 relative">
             <Heart className="h-4 w-4 text-indigo-300 absolute top-2 left-2 fill-current" />
             <p className="text-xs text-indigo-600 uppercase font-bold text-center mb-1">Gift Message</p>
             <p className="text-sm text-indigo-800 italic text-center px-4">"{request.giftMessage}"</p>
           </div>
        )}

        {/* Thank You Note Display */}
        {isReceived && request.thankYouMessage && (
           <div className="mt-4 mb-2 bg-pink-50 p-3 rounded-lg border border-pink-100 relative">
             <Quote className="h-4 w-4 text-pink-300 absolute top-2 left-2 transform -scale-x-100" />
             <p className="text-sm text-pink-800 italic text-center px-4 font-medium">"{request.thankYouMessage}"</p>
           </div>
        )}

        {/* Interaction Bar */}
        <div className="border-t border-slate-100 pt-3 mt-auto">
          <div className="flex justify-between items-center mb-3">
             <button 
               onClick={() => setShowComments(!showComments)}
               className={`text-xs font-medium flex items-center gap-1 transition-colors ${request.comments.length > 0 || showComments ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`}
             >
               <MessageCircle className="h-4 w-4" />
               {request.comments.length > 0 ? `${request.comments.length} Comments` : 'Ask a Question'}
             </button>
          </div>

          {showComments && (
            <div className="bg-slate-50 rounded-lg p-3 mb-3 animate-in fade-in slide-in-from-top-2">
              {request.comments.length > 0 ? (
                <div className="space-y-3 mb-3 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {request.comments.map(comment => (
                    <div key={comment.id} className="flex gap-2 items-start">
                       <div className={`w-1 h-full rounded-full flex-shrink-0 ${comment.userId === requester.id ? 'bg-indigo-400' : 'bg-slate-300'}`}></div>
                       <div>
                         <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${comment.userId === requester.id ? 'text-indigo-700' : 'text-slate-700'}`}>
                              {comment.userId === currentUser.id ? 'You' : (comment.userId === requester.id ? 'Requester' : 'User')}
                            </span>
                            <span className="text-[10px] text-slate-400">{timeAgo(comment.createdAt)}</span>
                         </div>
                         <p className="text-xs text-slate-600">{comment.text}</p>
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic text-center mb-3">No questions yet. Be the first!</p>
              )}
              
              <form onSubmit={handleCommentSubmit} className="relative">
                <input 
                  type="text" 
                  value={newComment}
                  onChange={(e) => { setNewComment(e.target.value); setCommentError(null); }}
                  placeholder="Type a question..."
                  className={`w-full pl-3 pr-16 py-2 text-sm border rounded-md focus:outline-none focus:border-indigo-500 ${commentError ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  disabled={isPostingComment || isRecordingComment}
                />
                <div className="absolute right-1 top-1 flex gap-1">
                   {isRecordingComment ? (
                     <button type="button" onClick={stopRecording} className="p-1.5 text-red-600 hover:bg-red-50 rounded animate-pulse">
                        <StopCircle className="h-4 w-4" />
                     </button>
                   ) : (
                     <button type="button" onClick={startRecording} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Record Voice Note">
                        <Mic className="h-4 w-4" />
                     </button>
                   )}
                   <button 
                    type="submit"
                    disabled={(!newComment.trim() && !isRecordingComment) || isPostingComment}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-50"
                  >
                    {isPostingComment ? (
                      <div className="h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </form>
              {commentError && (
                  <div className="text-[10px] text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> {commentError}
                  </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between min-h-[42px]">
             {/* Requester View */}
             {isMyRequest ? (
               isFulfilled ? (
                 <Button 
                   size="sm" 
                   variant="primary" 
                   onClick={() => onMarkReceived && onMarkReceived(request)}
                   className="w-full bg-green-600 hover:bg-green-700 focus:ring-green-500"
                 >
                   <PackageCheck className="mr-2 h-3 w-3" /> Mark Received
                 </Button>
               ) : isReceived ? (
                  <span className="text-sm text-green-600 font-medium flex items-center w-full justify-center">
                    <PackageCheck className="h-4 w-4 mr-1" /> Item Received
                  </span>
               ) : (
                  <span className="text-sm text-slate-500 italic w-full text-center">Open Request</span>
               )
             ) : isMyCommitment ? (
               /* Fulfiller View */
               isFulfilled ? (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onFulfill(request)}
                    className="w-full"
                  >
                    <Truck className="mr-2 h-3 w-3" /> Update Tracking
                  </Button>
               ) : isReceived ? (
                  <span className="text-sm text-pink-600 font-medium w-full text-center flex items-center justify-center gap-1">
                     Mission Accomplished <span className="text-lg">🎉</span>
                  </span>
               ) : (
                  <Button 
                     size="sm" 
                     variant="secondary"
                     onClick={() => onFulfill(request)}
                     className="w-full"
                   >
                     Confirm Purchase <ArrowRight className="ml-2 h-3 w-3" />
                   </Button>
               )
             ) : (
               /* Public View */
               isReceived || isFulfilled ? (
                 <span className="text-sm text-teal-600 font-medium w-full text-center">Already fulfilled!</span>
               ) : isPending ? (
                 <span className="text-sm text-amber-600 font-medium w-full text-center">Being fulfilled...</span>
               ) : (
                 <Button 
                   size="sm" 
                   variant="primary"
                   onClick={() => onFulfill(request)}
                   className="w-full"
                 >
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