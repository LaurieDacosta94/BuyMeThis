import React, { useState, useRef } from 'react';
import { RequestItem, RequestStatus, User, DeliveryPreference } from '../types';
import { Button } from './Button';
import { X, MapPin, Clock, MessageCircle, Send, Heart, Users, CheckCircle, Navigation, ShieldCheck, Truck, Handshake, Globe, AlertTriangle, Loader2, StopCircle, Mic, Volume2, Trash2 } from 'lucide-react';
import { calculateDistance, formatDistance } from '../utils/geo';
import { validateContent, generateRequestSpeech, transcribeAudio } from '../services/geminiService';
import { playPcmAudio } from '../utils/audio';
import { LinkPreview } from './LinkPreview';

interface RequestDetailsModalProps {
  request: RequestItem;
  requester: User;
  isOpen: boolean;
  onClose: () => void;
  onFulfill: () => void;
  currentUser: User | null;
  candidates: User[]; // Array of full user objects
  onAddComment?: (requestId: string, text: string) => void;
  onDelete?: (request: RequestItem) => void;
}

export const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({ 
  request, requester, isOpen, onClose, onFulfill, currentUser, candidates, onAddComment, onDelete
}) => {
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

  if (!isOpen) return null;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const distanceInfo = currentUser?.coordinates && request.coordinates ? formatDistance(calculateDistance(
        currentUser.coordinates.lat, 
        currentUser.coordinates.lng,
        request.coordinates.lat, 
        request.coordinates.lng
  )) : null;

  const isCandidate = currentUser && request.candidates?.includes(currentUser.id);

  // --- Handlers reused from RequestCard ---

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return; // Auth should be handled by caller before opening if required, or simple check here

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
    if (!currentUser) return;
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

  const handleDelete = () => {
      if (confirm("Are you sure you want to delete this request?") && onDelete) {
          onDelete(request);
          onClose();
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 backdrop-blur-md transition-colors">
          <X className="h-5 w-5" />
        </button>

        <div className="relative h-64 shrink-0 bg-slate-100">
             <img 
               src={request.enrichedData?.imageUrl || `https://picsum.photos/seed/${request.id}/800/400`} 
               alt={request.title} 
               className="w-full h-full object-cover"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
             
             <div className="absolute bottom-6 left-6 right-6 text-white">
                 <div className="flex items-center gap-2 mb-2 flex-wrap">
                     <span className="bg-indigo-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm">{request.category}</span>
                     <span className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                        {request.deliveryPreference === DeliveryPreference.SHIPPING ? <Truck className="h-3 w-3" /> : request.deliveryPreference === DeliveryPreference.IN_PERSON ? <Handshake className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                        {request.deliveryPreference || 'Any Method'}
                     </span>
                     {distanceInfo && <span className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Navigation className="h-3 w-3" /> {distanceInfo}</span>}
                 </div>
                 <h2 className="text-3xl font-bold leading-tight">{request.title}</h2>
             </div>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar">
             <div className="flex items-start justify-between mb-8">
                 <div className="flex items-center gap-4">
                     <img src={requester.avatarUrl} className="w-14 h-14 rounded-full border-4 border-slate-50 shadow-sm" alt="" />
                     <div>
                         <p className="font-bold text-lg text-slate-900">{requester.displayName}</p>
                         <div className="flex items-center gap-2 text-sm text-slate-500">
                             <span>@{requester.handle}</span>
                             <span>•</span>
                             <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {requester.location}</span>
                         </div>
                     </div>
                 </div>
                 <div className="text-right">
                     <p className="text-sm font-bold text-slate-900 flex items-center gap-1 justify-end"><Clock className="h-4 w-4 text-slate-400" /> {timeAgo(request.createdAt)}</p>
                 </div>
             </div>

             <div className="prose prose-slate max-w-none mb-6">
                 <h3 className="text-lg font-bold text-slate-900 mb-2">Why this is needed</h3>
                 <p className="text-slate-600 leading-relaxed text-lg">{request.reason}</p>
             </div>

             {request.productUrl && (
                <div className="mb-8">
                    <LinkPreview url={request.productUrl} />
                </div>
             )}

             {/* Audio Player */}
             <div className="mb-8">
                <button 
                    onClick={handlePlayAudio}
                    className={`text-sm font-bold flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${isPlayingAudio ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                    disabled={isLoadingAudio}
                >
                    {isLoadingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : isPlayingAudio ? <StopCircle className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    {isLoadingAudio ? 'Loading Audio...' : isPlayingAudio ? 'Stop Listening' : 'Listen to Story'}
                </button>
             </div>

             {/* Candidates List */}
             {candidates.length > 0 && (
                 <div className="bg-indigo-50 rounded-2xl p-6 mb-8 border border-indigo-100">
                     <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                         <Users className="h-5 w-5" /> People offering to help ({candidates.length})
                     </h4>
                     <div className="flex flex-wrap gap-4">
                         {candidates.map(c => (
                             <div key={c.id} className="flex items-center gap-2 bg-white px-3 py-2 rounded-full shadow-sm border border-indigo-100">
                                 <img src={c.avatarUrl} className="w-8 h-8 rounded-full" alt="" />
                                 <span className="text-sm font-medium text-slate-700">{c.displayName}</span>
                                 {c.id === currentUser?.id && <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded ml-1 font-bold">You</span>}
                             </div>
                         ))}
                     </div>
                 </div>
             )}

             {/* Comments Section */}
             <div className="border-t border-slate-200 pt-6 mb-8">
                 <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                     <MessageCircle className="h-5 w-5 text-slate-400" /> Discussion ({request.comments.length})
                 </h4>
                 
                 <div className="space-y-4 mb-6">
                    {request.comments.length > 0 ? (
                        request.comments.map(comment => (
                            <div key={comment.id} className="flex gap-3 items-start bg-slate-50 p-3 rounded-xl">
                                <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${comment.userId === requester.id ? 'bg-indigo-400' : 'bg-slate-300'}`}></div>
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={`text-xs font-bold ${comment.userId === requester.id ? 'text-indigo-700' : 'text-slate-700'}`}>
                                            {comment.userId === requester.id ? 'Requester' : 'User'}
                                        </span>
                                        <span className="text-[10px] text-slate-400">{timeAgo(comment.createdAt)}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed">{comment.text}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-slate-400 italic text-sm">No comments yet. Ask a question about this request.</p>
                    )}
                 </div>

                 {/* Comment Input */}
                 {onAddComment && (
                     <form onSubmit={handleCommentSubmit} className="relative">
                        <input 
                        type="text" 
                        value={newComment}
                        onChange={(e) => { setNewComment(e.target.value); setCommentError(null); }}
                        placeholder={currentUser ? "Ask a question..." : "Log in to comment"}
                        className={`w-full pl-4 pr-20 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${commentError ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}
                        disabled={isPostingComment || isRecordingComment || !currentUser}
                        />
                        <div className="absolute right-1.5 top-1.5 flex gap-1">
                        {isRecordingComment ? (
                            <button type="button" onClick={stopRecording} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg animate-pulse">
                                <StopCircle className="h-5 w-5" />
                            </button>
                        ) : (
                            <button type="button" onClick={startRecording} disabled={!currentUser} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50">
                                <Mic className="h-5 w-5" />
                            </button>
                        )}
                        <button 
                            type="submit"
                            disabled={(!newComment.trim() && !isRecordingComment) || isPostingComment || !currentUser}
                            className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-colors shadow-sm"
                        >
                            {isPostingComment ? (
                            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                            <Send className="h-5 w-5" />
                            )}
                        </button>
                        </div>
                    </form>
                 )}
                 {commentError && (
                    <div className="text-xs text-red-600 mt-2 flex items-center gap-1 font-medium bg-red-50 px-2 py-1 rounded">
                        <AlertTriangle className="h-3 w-3" /> {commentError}
                    </div>
                )}
             </div>

             <div className="flex flex-col gap-3 sticky bottom-0 bg-white pt-4 border-t border-slate-100 mt-auto">
                 {request.status === RequestStatus.FULFILLED || request.status === RequestStatus.RECEIVED ? (
                     <div className="w-full bg-green-50 text-green-700 font-bold py-4 rounded-xl text-center flex items-center justify-center gap-2 text-lg border border-green-200">
                         <CheckCircle className="h-6 w-6" /> 
                         {request.status === RequestStatus.RECEIVED ? 'Item Received' : 'Item Purchased'}
                     </div>
                 ) : isMyRequest ? (
                    <Button onClick={handleDelete} size="lg" variant="danger" className="w-full font-bold shadow-xl shadow-red-600/20 py-4 text-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">
                        <Trash2 className="h-5 w-5 mr-2" /> Delete Request
                    </Button>
                 ) : (
                    <Button onClick={onFulfill} size="lg" className="w-full font-bold shadow-xl shadow-indigo-600/20 py-4 text-lg">
                        {isCandidate ? 'Complete Fulfillment' : 'I Can Help with This'}
                    </Button>
                 )}
             </div>
        </div>
      </div>
    </div>
  );
};