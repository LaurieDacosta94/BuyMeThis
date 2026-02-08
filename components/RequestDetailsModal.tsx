import React, { useState, useRef } from 'react';
import { RequestItem, RequestStatus, User, DeliveryPreference } from '../types';
import { Button } from './Button';
import { X, MapPin, Clock, MessageCircle, Send, Heart, Users, CheckCircle, Navigation, ShieldCheck, Truck, Handshake, Globe, AlertTriangle, Loader2, StopCircle, Mic, Volume2, Trash2, Terminal } from 'lucide-react';
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
  const [commentError, setCommentError] = useState<string | null>(null);
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
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return '00:00:00';
    if (hours < 24) return `${hours}H`;
    return `${Math.floor(hours / 24)}D`;
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
          setCommentError("Failed.");
      } finally { setIsPostingComment(false); }
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
            } catch (err) { setCommentError("Error."); setIsPostingComment(false); }
        };
        mediaRecorderRef.current.start();
        setIsRecordingComment(true);
    } catch (err) { setCommentError("Mic blocked."); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current && isRecordingComment) { mediaRecorderRef.current.stop(); setIsRecordingComment(false); } };
  const handleDelete = () => { if (confirm("Delete?") && onDelete) { onDelete(request); onClose(); } };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-2xl border-2 border-slate-900 shadow-hard flex flex-col max-h-[90vh]">
        
        {/* System Bar */}
        <div className="bg-slate-900 text-white px-3 py-2 flex justify-between items-center select-none border-b-2 border-slate-900 shrink-0">
           <div className="flex items-center gap-2">
             <div className="flex gap-1">
                <div className="w-3 h-3 bg-red-500 border border-black"></div>
                <div className="w-3 h-3 bg-yellow-400 border border-black"></div>
             </div>
             <span className="font-mono text-xs font-bold uppercase tracking-widest text-slate-300">DATA_VIEWER // {request.id.slice(-6)}</span>
           </div>
           <button onClick={onClose} className="hover:text-red-400 transition-colors"><X className="h-4 w-4"/></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="relative h-48 bg-slate-200 border-b-2 border-slate-900">
                <img 
                src={request.enrichedData?.imageUrl || `https://picsum.photos/seed/${request.id}/800/400`} 
                alt={request.title} 
                className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80"></div>
                
                <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="flex items-center gap-2 mb-2 flex-wrap font-mono text-[10px] uppercase">
                        <span className="bg-blue-600 px-2 py-0.5 border border-white/20">{request.category}</span>
                        <span className="bg-slate-800 px-2 py-0.5 border border-white/20 flex items-center gap-1">
                            {request.deliveryPreference === DeliveryPreference.SHIPPING ? <Truck className="h-3 w-3" /> : <Handshake className="h-3 w-3" />}
                            {request.deliveryPreference || 'ANY'}
                        </span>
                        {distanceInfo && <span className="bg-slate-800 px-2 py-0.5 border border-white/20 flex items-center gap-1"><Navigation className="h-3 w-3" /> {distanceInfo}</span>}
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tight">{request.title}</h2>
                </div>
            </div>

            <div className="p-6">
                <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-slate-100 border-dashed">
                    <div className="flex items-center gap-3">
                        <img src={requester.avatarUrl} className="w-12 h-12 border-2 border-slate-900 bg-white" alt="" />
                        <div>
                            <p className="font-bold text-base text-slate-900 uppercase">{requester.displayName}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                                <span>ID: {requester.handle}</span>
                                <span>//</span>
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {requester.location}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right font-mono text-xs text-slate-400">
                        {timeAgo(request.createdAt)}
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">Mission_Objective</h3>
                    <p className="text-slate-800 leading-relaxed text-sm font-medium border-l-4 border-blue-500 pl-4 bg-slate-50 py-2">
                        {request.reason}
                    </p>
                </div>

                {request.productUrl && (
                    <div className="mb-6 border border-slate-300 p-2 bg-slate-50">
                        <div className="text-[10px] text-slate-400 uppercase font-mono mb-1">External_Resource</div>
                        <LinkPreview url={request.productUrl} />
                    </div>
                )}

                <div className="mb-6">
                    <button 
                        onClick={handlePlayAudio}
                        className={`w-full text-xs font-bold flex items-center justify-center gap-2 px-4 py-3 border-2 transition-all font-mono uppercase ${isPlayingAudio ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-900 border-slate-900 hover:bg-slate-50'}`}
                        disabled={isLoadingAudio}
                    >
                        {isLoadingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : isPlayingAudio ? <StopCircle className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        {isLoadingAudio ? 'BUFFERING_AUDIO...' : isPlayingAudio ? 'STOP_PLAYBACK' : 'INITIATE_TTS_PLAYBACK'}
                    </button>
                </div>

                {candidates.length > 0 && (
                    <div className="bg-blue-50 p-4 mb-6 border border-blue-200">
                        <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2 text-xs uppercase font-mono">
                            <Users className="h-4 w-4" /> Active_Units ({candidates.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {candidates.map(c => (
                                <div key={c.id} className="flex items-center gap-2 bg-white px-2 py-1 border border-blue-200 shadow-sm">
                                    <img src={c.avatarUrl} className="w-6 h-6 border border-slate-200" alt="" />
                                    <span className="text-xs font-bold text-slate-700">{c.displayName}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="border-t-2 border-slate-900 pt-6">
                    <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-xs uppercase font-mono">
                        <Terminal className="h-4 w-4" /> Comm_Logs ({request.comments.length})
                    </h4>
                    
                    <div className="space-y-3 mb-4">
                        {request.comments.length > 0 ? (
                            request.comments.map(comment => (
                                <div key={comment.id} className="flex gap-3 items-start bg-slate-50 p-3 border border-slate-200">
                                    <div className={`w-1 self-stretch ${comment.userId === requester.id ? 'bg-blue-600' : 'bg-slate-400'}`}></div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-[10px] font-bold font-mono uppercase ${comment.userId === requester.id ? 'text-blue-700' : 'text-slate-700'}`}>
                                                {comment.userId === requester.id ? 'OP_COMMAND' : 'UNIT_ID'}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono">{timeAgo(comment.createdAt)}</span>
                                        </div>
                                        <p className="text-xs text-slate-800 font-medium">{comment.text}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-400 italic text-xs font-mono border border-dashed border-slate-300 p-2 text-center">NO_DATA_FOUND</p>
                        )}
                    </div>

                    {onAddComment && (
                        <form onSubmit={handleCommentSubmit} className="relative flex gap-2">
                            <div className="relative flex-1">
                                <input 
                                type="text" 
                                value={newComment}
                                onChange={(e) => { setNewComment(e.target.value); setCommentError(null); }}
                                placeholder={currentUser ? "Enter transmission..." : "Login required"}
                                className={`w-full pl-3 pr-10 py-2 text-xs border-2 font-mono outline-none transition-all ${commentError ? 'border-red-500 bg-red-50' : 'border-slate-300 focus:border-slate-900'}`}
                                disabled={isPostingComment || isRecordingComment || !currentUser}
                                />
                                {isRecordingComment ? (
                                    <button type="button" onClick={stopRecording} className="absolute right-2 top-1.5 text-red-600 animate-pulse"><StopCircle className="h-4 w-4" /></button>
                                ) : (
                                    <button type="button" onClick={startRecording} disabled={!currentUser} className="absolute right-2 top-1.5 text-slate-400 hover:text-blue-600"><Mic className="h-4 w-4" /></button>
                                )}
                            </div>
                            <button 
                                type="submit"
                                disabled={(!newComment.trim() && !isRecordingComment) || isPostingComment || !currentUser}
                                className="px-4 bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50 font-mono text-xs font-bold"
                            >
                                SEND
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
        
        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 border-t-2 border-slate-900">
             {request.status === RequestStatus.FULFILLED || request.status === RequestStatus.RECEIVED ? (
                 <div className="w-full bg-green-100 text-green-800 font-black py-3 text-center border-2 border-green-600 uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                     <CheckCircle className="h-5 w-5" /> 
                     {request.status === RequestStatus.RECEIVED ? 'MISSION_COMPLETE' : 'ASSET_DEPLOYED'}
                 </div>
             ) : isMyRequest ? (
                <Button onClick={handleDelete} size="lg" variant="danger" className="w-full font-mono font-bold uppercase tracking-widest">
                    <Trash2 className="h-4 w-4 mr-2" /> TERMINATE_REQUEST
                </Button>
             ) : (
                <Button onClick={onFulfill} size="lg" variant="primary" className="w-full font-mono font-bold uppercase tracking-widest shadow-hard-sm hover:shadow-hard transform hover:-translate-y-0.5 transition-transform bg-blue-600 hover:bg-blue-500">
                    {isCandidate ? 'FINALIZE_PROTOCOL' : 'ENGAGE_PROTOCOL'}
                </Button>
             )}
        </div>
      </div>
    </div>
  );
};