import React, { useState, useRef } from 'react';
import { RequestItem, RequestStatus, User, DeliveryPreference } from '../types';
import { Button } from './Button';
import { X, MapPin, MessageCircle, Send, Users, CheckCircle, Navigation, Truck, Handshake, Globe, Loader2, StopCircle, Mic, Volume2, Trash2, ExternalLink, Play } from 'lucide-react';
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
  candidates: User[];
  onAddComment?: (requestId: string, text: string) => void;
  onDelete?: (request: RequestItem) => void;
}

export const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({ 
  request, requester, isOpen, onClose, onFulfill, currentUser, candidates, onAddComment, onDelete
}) => {
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);
  const [isRecordingComment, setIsRecordingComment] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isMyRequest = currentUser && request.requesterId === currentUser.id;

  if (!isOpen) return null;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const distanceInfo = currentUser?.coordinates && request.coordinates ? formatDistance(calculateDistance(
        currentUser.coordinates.lat, 
        currentUser.coordinates.lng,
        request.coordinates.lat, 
        request.coordinates.lng
  )) : null;

  const isCandidate = currentUser && request.candidates?.includes(currentUser.id);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (newComment.trim() && onAddComment) {
      setIsPostingComment(true);
      try {
        const safety = await validateContent(newComment);
        if (!safety.safe) {
            alert("Comment flagged as unsafe.");
            setIsPostingComment(false);
            return;
        }
        onAddComment(request.id, newComment);
        setNewComment('');
      } catch (err) { console.error(err); } finally { setIsPostingComment(false); }
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
              source.onended = () => { setIsPlayingAudio(false); setAudioSource(null); };
          }
      } catch (err) { console.error(err); } finally { setIsLoadingAudio(false); }
  };

  const startRecording = async () => {
    if (!currentUser) return;
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
    } catch (err) { alert("Mic blocked."); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current && isRecordingComment) { mediaRecorderRef.current.stop(); setIsRecordingComment(false); } };
  const handleDelete = () => { if (confirm("Are you sure you want to delete this request?")) { onDelete && onDelete(request); onClose(); } };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Hero Header */}
        <div className="relative h-56 shrink-0">
             <div className="absolute inset-0 bg-slate-900/30 z-10"></div>
             <img 
                src={request.enrichedData?.imageUrl || `https://picsum.photos/seed/${request.id}/800/400`} 
                alt={request.title} 
                className="w-full h-full object-cover"
            />
            
            <button onClick={onClose} className="absolute top-4 right-4 z-20 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md transition-colors"><X className="w-5 h-5"/></button>

            <div className="absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-slate-900/90 to-transparent pt-20">
                <div className="flex flex-wrap gap-2 mb-2">
                    <span className="bg-cyan-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm uppercase">{request.category}</span>
                    <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg border border-white/20 flex items-center gap-1">
                        {request.deliveryPreference === DeliveryPreference.SHIPPING ? <Truck className="h-3 w-3" /> : <Handshake className="h-3 w-3" />}
                        {request.deliveryPreference || 'Any'}
                    </span>
                    {distanceInfo && <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg border border-white/20 flex items-center gap-1"><Navigation className="h-3 w-3" /> {distanceInfo}</span>}
                </div>
                <h1 className="text-3xl font-black text-white leading-tight">{request.title}</h1>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
            <div className="p-6">
                {/* User Info */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <img src={requester.avatarUrl} className="w-12 h-12 rounded-full border-2 border-white shadow-md" alt="" />
                        <div>
                            <div className="font-bold text-slate-800 text-lg">{requester.displayName}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-2">
                                <span>@{requester.handle}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {requester.location}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
                        {timeAgo(request.createdAt)}
                    </div>
                </div>

                {/* Content */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-400 to-blue-500"></div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">The Request</h3>
                    <p className="text-slate-700 leading-relaxed text-sm">{request.reason}</p>
                    
                    <button 
                        onClick={handlePlayAudio}
                        className="mt-4 flex items-center gap-2 text-xs font-bold text-cyan-600 hover:bg-cyan-50 px-3 py-2 rounded-lg transition-colors w-fit"
                    >
                        {isLoadingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : isPlayingAudio ? <StopCircle className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {isLoadingAudio ? 'Loading Audio...' : isPlayingAudio ? 'Stop Reading' : 'Listen to Request'}
                    </button>
                </div>

                {request.productUrl && (
                    <div className="mb-6">
                        <LinkPreview url={request.productUrl} />
                    </div>
                )}

                {/* Candidates */}
                {candidates.length > 0 && (
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mb-6">
                        <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2 text-xs uppercase">
                            <Users className="h-4 w-4 text-blue-500" /> Active Offers ({candidates.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {candidates.map(c => (
                                <div key={c.id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-blue-100 shadow-sm">
                                    <img src={c.avatarUrl} className="w-5 h-5 rounded-full" alt="" />
                                    <span className="text-xs font-bold text-slate-700">{c.displayName}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Comments */}
                <div className="mt-8">
                    <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-sm">
                        Comments <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full">{request.comments.length}</span>
                    </h4>
                    
                    <div className="space-y-4 mb-6">
                        {request.comments.length > 0 ? (
                            request.comments.map(comment => (
                                <div key={comment.id} className="flex gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${comment.userId === requester.id ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-100 text-slate-500'}`}>
                                        <span className="text-xs font-bold">{comment.userId === requester.id ? 'OP' : 'U'}</span>
                                    </div>
                                    <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex-1">
                                        <p className="text-sm text-slate-700">{comment.text}</p>
                                        <p className="text-[10px] text-slate-400 mt-1">{timeAgo(comment.createdAt)}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 bg-slate-100/50 rounded-2xl border border-dashed border-slate-200">
                                <p className="text-slate-400 text-sm">No comments yet. Be the first!</p>
                            </div>
                        )}
                    </div>

                    {onAddComment && (
                        <div className="sticky bottom-0 bg-white p-2 border border-slate-200 rounded-2xl shadow-sm flex items-center gap-2">
                             <input 
                                type="text" 
                                value={newComment}
                                onChange={(e) => { setNewComment(e.target.value); }}
                                placeholder={currentUser ? "Add a comment..." : "Login to comment"}
                                className="flex-1 bg-transparent border-none outline-none text-sm px-2"
                                disabled={isPostingComment || isRecordingComment || !currentUser}
                            />
                            {isRecordingComment ? (
                                <button type="button" onClick={stopRecording} className="p-2 bg-red-50 text-red-500 rounded-full animate-pulse"><StopCircle className="w-4 h-4" /></button>
                            ) : (
                                <button type="button" onClick={startRecording} disabled={!currentUser} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full hover:text-cyan-600 transition-colors"><Mic className="w-4 h-4" /></button>
                            )}
                            <button 
                                onClick={handleCommentSubmit}
                                disabled={(!newComment.trim() && !isRecordingComment) || isPostingComment || !currentUser}
                                className="p-2 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 disabled:opacity-50 transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-5px_20px_rgba(0,0,0,0.02)] z-20">
             {request.status === RequestStatus.FULFILLED || request.status === RequestStatus.RECEIVED ? (
                 <div className="w-full bg-green-50 text-green-700 py-3 rounded-xl border border-green-200 text-sm font-bold flex items-center justify-center gap-2">
                     <CheckCircle className="h-5 w-5" /> 
                     {request.status === RequestStatus.RECEIVED ? 'Item Received' : 'Item Fulfilled'}
                 </div>
             ) : isMyRequest ? (
                <Button onClick={handleDelete} size="lg" variant="danger" className="w-full rounded-xl">
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Request
                </Button>
             ) : (
                <Button onClick={onFulfill} size="lg" variant="primary" className="w-full rounded-xl shadow-lg shadow-cyan-500/25">
                    {isCandidate ? 'Finalize Fulfillment' : 'I Can Help with This!'}
                </Button>
             )}
        </div>
      </div>
    </div>
  );
};