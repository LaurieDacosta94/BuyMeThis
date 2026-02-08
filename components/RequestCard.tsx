import React, { useState, useRef } from 'react';
import { RequestItem, RequestStatus, User } from '../types';
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
  currentUser: User | null;
  onRequireAuth: () => void;
}

export const RequestCard: React.FC<RequestCardProps> = ({ 
  request, requester, onFulfill, onMarkReceived, onViewProfile, onAddComment, currentUser, onRequireAuth
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

  const handleActionClick = () => {
      if (!currentUser) {
          onRequireAuth();
          return;
      }
      onFulfill(request);
  };

  return (
    <div className={`group bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col hover:-translate-y-1 h-full`}>
      <div className="relative h-56 overflow-hidden bg-slate-100">
        <img 
          src={request.enrichedData?.imageUrl || `https://picsum.photos/seed/${request.id}/400/200`} 
          alt={request.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
        
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
           <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-sm">
             <MapPin className="h-3 w-3 text-indigo-500" />
             {request.location}
           </div>
           
           <span className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-indigo-600 shadow-sm">
             {request.category}
           </span>
        </div>

        {distanceInfo && (
            <div className="absolute bottom-4 left-4 bg-indigo-600/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-1.5 shadow-sm">
               <Navigation className="h-3 w-3" />
               {distanceInfo}
             </div>
        )}

        {/* Status Badges */}
        {isReceived ? (
          <div className="absolute inset-0 bg-green-900/60 flex items-center justify-center backdrop-blur-[2px]">
            <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold shadow-lg transform -rotate-6 border-2 border-green-200 flex items-center gap-2">
              <PackageCheck className="h-5 w-5" /> RECEIVED
            </span>
          </div>
        ) : isFulfilled ? (
          <div className="absolute inset-0 bg-teal-900/40 flex items-center justify-center backdrop-blur-[2px]">
            <span className="bg-teal-100 text-teal-800 px-4 py-2 rounded-full text-sm font-bold shadow-lg transform -rotate-6 border-2 border-teal-200 flex items-center gap-2">
               {isVerifiedPurchase ? <ShieldCheck className="h-5 w-5 text-teal-600" /> : null} 
               {isVerifiedPurchase ? 'VERIFIED PURCHASE' : 'PURCHASED'}
            </span>
          </div>
        ) : null}
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div 
            className="flex items-center gap-3 group/user cursor-pointer"
            onClick={() => onViewProfile && onViewProfile(requester.id)}
            title="View Profile"
          >
            <img src={requester.avatarUrl} alt={requester.displayName} className="h-10 w-10 rounded-full bg-slate-200 object-cover ring-2 ring-transparent group-hover/user:ring-indigo-100 transition-all" />
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight group-hover/user:text-indigo-600 transition-colors">{requester.displayName}</p>
              <p className="text-xs text-slate-500 font-medium">@{requester.handle}</p>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-full">
            <Clock className="h-3 w-3" />
            {timeAgo(request.createdAt)}
          </span>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2 leading-tight">{request.title}</h3>
        <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1 line-clamp-3">
          {request.reason}
        </p>
        
        {/* Listen Button */}
        <div className="mb-6">
            <button 
                onClick={handlePlayAudio}
                className={`text-xs font-bold flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${isPlayingAudio ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                disabled={isLoadingAudio}
            >
                {isLoadingAudio ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isPlayingAudio ? <StopCircle className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                {isLoadingAudio ? 'Loading...' : isPlayingAudio ? 'Stop Listening' : 'Listen to Story'}
            </button>
        </div>

        {/* Receipt Toggle */}
        {(isFulfilled || isReceived) && request.proofOfPurchaseImage && isMyRequest && (
          <div className="mb-4">
             <button 
               onClick={() => setShowReceipt(!showReceipt)}
               className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 mb-2 bg-indigo-50 px-3 py-2 rounded-lg"
             >
               <FileCheck className="h-3.5 w-3.5" />
               {showReceipt ? 'Hide Receipt' : 'View Proof of Purchase'}
             </button>
             
             {showReceipt && (
               <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                 <img 
                   src={request.proofOfPurchaseImage} 
                   alt="Proof of Purchase" 
                   className="w-full h-auto rounded-lg shadow-sm border border-slate-100" 
                 />
                 {isVerifiedPurchase && (
                     <div className="mt-2 bg-green-50 border border-green-200 rounded p-2 flex items-center gap-2 text-[10px] text-green-700 font-bold">
                         <ShieldCheck className="h-3.5 w-3.5" /> AI Verified: Valid Proof
                     </div>
                 )}
               </div>
             )}
          </div>
        )}

        {/* Gift Message Display */}
        {(isFulfilled || isReceived) && request.giftMessage && (
           <div className="mt-2 mb-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 relative">
             <Heart className="h-5 w-5 text-indigo-300 absolute top-3 left-3 fill-current" />
             <p className="text-[10px] text-indigo-400 uppercase font-bold text-center mb-1 tracking-wider">Gift Message</p>
             <p className="text-sm text-indigo-900 italic text-center px-4 font-serif">"{request.giftMessage}"</p>
           </div>
        )}

        {/* Thank You Note Display */}
        {isReceived && request.thankYouMessage && (
           <div className="mt-2 mb-4 bg-pink-50/50 p-4 rounded-2xl border border-pink-100/50 relative">
             <Quote className="h-5 w-5 text-pink-300 absolute top-3 left-3 transform -scale-x-100 fill-current" />
             <p className="text-[10px] text-pink-400 uppercase font-bold text-center mb-1 tracking-wider">Thank You Note</p>
             <p className="text-sm text-pink-900 italic text-center px-4 font-serif">"{request.thankYouMessage}"</p>
           </div>
        )}

        {/* Interaction Bar */}
        <div className="border-t border-slate-100 pt-4 mt-auto">
          
          {/* Comments Section Toggle */}
          <div className="mb-4">
             <button 
               onClick={() => setShowComments(!showComments)}
               className={`w-full text-xs font-bold flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${request.comments.length > 0 || showComments ? 'text-slate-700 bg-slate-50 hover:bg-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
             >
               <MessageCircle className="h-4 w-4" />
               {request.comments.length > 0 ? `${request.comments.length} Comments` : 'Ask a Question'}
             </button>
          </div>

          {showComments && (
            <div className="bg-slate-50/80 rounded-xl p-4 mb-4 animate-in fade-in slide-in-from-top-2 border border-slate-100">
              {request.comments.length > 0 ? (
                <div className="space-y-4 mb-4 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {request.comments.map(comment => (
                    <div key={comment.id} className="flex gap-3 items-start">
                       <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${comment.userId === requester.id ? 'bg-indigo-400' : 'bg-slate-300'}`}></div>
                       <div>
                         <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-xs font-bold ${comment.userId === requester.id ? 'text-indigo-700' : 'text-slate-700'}`}>
                              {currentUser && comment.userId === currentUser.id ? 'You' : (comment.userId === requester.id ? 'Requester' : 'User')}
                            </span>
                            <span className="text-[10px] text-slate-400">{timeAgo(comment.createdAt)}</span>
                         </div>
                         <p className="text-xs text-slate-600 leading-relaxed">{comment.text}</p>
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 mb-2">
                    <MessageCircle className="h-6 w-6 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 italic">No questions yet.</p>
                </div>
              )}
              
              {/* Comment Input */}
              <form onSubmit={handleCommentSubmit} className="relative">
                <input 
                  type="text" 
                  value={newComment}
                  onChange={(e) => { setNewComment(e.target.value); setCommentError(null); }}
                  placeholder={currentUser ? "Type a question..." : "Log in to comment"}
                  className={`w-full pl-4 pr-20 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${commentError ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}
                  disabled={isPostingComment || isRecordingComment}
                  onFocus={() => !currentUser && onRequireAuth()}
                />
                <div className="absolute right-1.5 top-1.5 flex gap-1">
                   {isRecordingComment ? (
                     <button type="button" onClick={stopRecording} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg animate-pulse">
                        <StopCircle className="h-4 w-4" />
                     </button>
                   ) : (
                     <button type="button" onClick={startRecording} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Record Voice Note">
                        <Mic className="h-4 w-4" />
                     </button>
                   )}
                   <button 
                    type="submit"
                    disabled={(!newComment.trim() && !isRecordingComment) || isPostingComment}
                    className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-colors shadow-sm"
                  >
                    {isPostingComment ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </form>
              {commentError && (
                  <div className="text-[10px] text-red-600 mt-2 flex items-center gap-1 font-medium bg-red-50 px-2 py-1 rounded">
                      <AlertTriangle className="h-3 w-3" /> {commentError}
                  </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between min-h-[44px]">
             {/* Requester View */}
             {isMyRequest ? (
               isFulfilled ? (
                 <Button 
                   size="sm" 
                   variant="primary" 
                   onClick={() => onMarkReceived && onMarkReceived(request)}
                   className="w-full bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20 rounded-xl py-2.5"
                 >
                   <PackageCheck className="mr-2 h-4 w-4" /> Mark Received
                 </Button>
               ) : isReceived ? (
                  <div className="w-full bg-green-50 text-green-700 font-bold py-2.5 rounded-xl text-center flex items-center justify-center text-sm border border-green-200">
                    <PackageCheck className="h-4 w-4 mr-2" /> Item Received
                  </div>
               ) : (
                  <div className="w-full bg-slate-100 text-slate-500 font-medium py-2.5 rounded-xl text-center text-sm border border-slate-200">
                    Request Open
                  </div>
               )
             ) : isMyCommitment ? (
               /* Fulfiller View */
               isFulfilled ? (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleActionClick}
                    className="w-full rounded-xl py-2.5"
                  >
                    <Truck className="mr-2 h-4 w-4" /> Update Tracking
                  </Button>
               ) : isReceived ? (
                  <div className="w-full bg-pink-50 text-pink-600 font-bold py-2.5 rounded-xl text-center flex items-center justify-center gap-2 text-sm border border-pink-200">
                     Mission Accomplished <span className="text-lg">🎉</span>
                  </div>
               ) : (
                  <Button 
                     size="sm" 
                     variant="secondary"
                     onClick={handleActionClick}
                     className="w-full rounded-xl py-2.5 shadow-lg shadow-teal-600/20"
                   >
                     Confirm Purchase <ArrowRight className="ml-2 h-4 w-4" />
                   </Button>
               )
             ) : (
               /* Public / Guest View */
               isReceived || isFulfilled ? (
                 <div className="w-full bg-slate-50 text-slate-400 font-bold py-2.5 rounded-xl text-center text-sm border border-slate-200">
                    Already fulfilled
                 </div>
               ) : isPending ? (
                 <div className="w-full bg-amber-50 text-amber-600 font-bold py-2.5 rounded-xl text-center text-sm border border-amber-200">
                    Being fulfilled...
                 </div>
               ) : (
                 <Button 
                   size="sm" 
                   variant="primary"
                   onClick={handleActionClick}
                   className="w-full rounded-xl py-2.5 font-bold shadow-lg shadow-indigo-600/20"
                 >
                   Fulfill Request <ArrowRight className="ml-2 h-4 w-4" />
                 </Button>
               )
             )}
          </div>
        </div>
      </div>
    </div>
  );
};