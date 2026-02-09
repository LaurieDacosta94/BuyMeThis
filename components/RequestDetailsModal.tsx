
import React, { useState, useRef } from 'react';
import { RequestItem, RequestStatus, User, DeliveryPreference, Fulfillment, Category } from '../types';
import { Button } from './Button';
import { X, MapPin, MessageCircle, Send, Users, CheckCircle, Navigation, Truck, Handshake, Globe, Loader2, StopCircle, Mic, Volume2, Trash2, ExternalLink, Play, ArrowLeft, Package, Clock, ShieldCheck, ShieldAlert, Heart, Lock, AlertTriangle, Layers, ShoppingCart } from 'lucide-react';
import { calculateDistance, formatDistance } from '../utils/geo';
import { validateContent, generateRequestSpeech, transcribeAudio } from '../services/geminiService';
import { playPcmAudio } from '../utils/audio';
import { LinkPreview } from './LinkPreview';

interface RequestDetailsModalProps {
  request: RequestItem;
  requester: User;
  usersMap: Record<string, User>; 
  isOpen: boolean;
  onClose: () => void;
  onFulfill: () => void;
  currentUser: User | null;
  candidates: User[];
  onAddComment?: (requestId: string, text: string) => void;
  onDelete?: (request: RequestItem) => void;
  onViewProfile?: (userId: string) => void;
}

export const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({ 
  request, requester, usersMap, isOpen, onClose, onFulfill, currentUser, candidates, onAddComment, onDelete, onViewProfile
}) => {
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);
  const [isRecordingComment, setIsRecordingComment] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Fulfillment Details View State
  const [viewingFulfillmentUser, setViewingFulfillmentUser] = useState<User | null>(null);

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

  const getFulfillmentDetails = (userId: string) => {
      return request.fulfillments?.find(f => f.fulfillerId === userId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Render Fulfillment Details View if selected */}
        {viewingFulfillmentUser ? (
            <div className="flex flex-col h-full bg-slate-50">
                <div className="bg-white p-4 border-b border-slate-200 flex items-center gap-3 shadow-sm sticky top-0 z-10">
                    <button onClick={() => setViewingFulfillmentUser(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="font-bold text-lg text-slate-800">Fulfillment Status</h2>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="flex items-center gap-4 mb-6">
                        <img src={viewingFulfillmentUser.avatarUrl} className="w-16 h-16 rounded-full border-2 border-white shadow-md bg-white" alt="" />
                        <div>
                            <div className="font-bold text-xl text-slate-900">{viewingFulfillmentUser.displayName}</div>
                            <div className="text-sm text-slate-500">@{viewingFulfillmentUser.handle}</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
                         {(() => {
                             const details = getFulfillmentDetails(viewingFulfillmentUser.id);
                             if (!details) {
                                 return (
                                     <div className="text-center py-8">
                                         <Clock className="w-10 h-10 text-blue-300 mx-auto mb-3" />
                                         <h3 className="font-bold text-slate-700">Offer Pending</h3>
                                         <p className="text-sm text-slate-500 mt-1">This user has offered to help but hasn't confirmed purchase yet.</p>
                                     </div>
                                 );
                             }
                             
                             const isAuthorized = currentUser && (currentUser.id === request.requesterId || currentUser.id === viewingFulfillmentUser.id);

                             return (
                                 <>
                                    <div className="flex items-center gap-3 p-4 bg-green-50 text-green-700 rounded-xl border border-green-100">
                                        <CheckCircle className="w-6 h-6 flex-shrink-0" />
                                        <div>
                                            <div className="font-bold text-sm uppercase">Item Purchased</div>
                                            <div className="text-xs opacity-80">{new Date(details.createdAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Tracking / Order ID</label>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-sm text-slate-700 flex items-center justify-between">
                                            {isAuthorized ? (
                                                <span>{details.trackingNumber}</span>
                                            ) : (
                                                <span className="italic text-slate-400 flex items-center gap-2"><Lock className="w-3 h-3"/> Hidden (Private)</span>
                                            )}
                                            {isAuthorized && <Package className="w-4 h-4 text-slate-400" />}
                                        </div>
                                    </div>
                                    
                                    {details.proofOfPurchaseImage && (
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Proof of Purchase</label>
                                            <div className="bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative group">
                                                {isAuthorized ? (
                                                     <img src={details.proofOfPurchaseImage} alt="Receipt" className="w-full max-h-60 object-contain" />
                                                ) : (
                                                     <div className="h-32 flex items-center justify-center text-slate-400 text-sm italic bg-slate-50">
                                                         <div className="flex flex-col items-center gap-2">
                                                            <Lock className="w-6 h-6" />
                                                            <span>Receipt is private</span>
                                                         </div>
                                                     </div>
                                                )}
                                                
                                                {details.receiptVerificationStatus && isAuthorized && (
                                                     <div className={`absolute bottom-2 right-2 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm ${details.receiptVerificationStatus === 'verified' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                         {details.receiptVerificationStatus === 'verified' ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                                                         {details.receiptVerificationStatus === 'verified' ? 'Verified Match' : 'Manual Review'}
                                                     </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {details.giftMessage && isAuthorized && (
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Message from Donor</label>
                                            <div className="bg-pink-50 p-4 rounded-xl border border-pink-100 text-pink-800 text-sm italic relative">
                                                <Heart className="w-4 h-4 text-pink-300 absolute top-2 right-2" />
                                                "{details.giftMessage}"
                                            </div>
                                        </div>
                                    )}
                                 </>
                             );
                         })()}
                    </div>
                </div>
            </div>
        ) : (
        <>
        {/* Hero Header */}
        <div className="relative h-56 shrink-0 group">
             <div className="absolute inset-0 bg-slate-900/30 z-10 transition-colors group-hover:bg-slate-900/10"></div>
             
             {request.enrichedData?.imageUrl ? (
                 <img 
                    src={request.enrichedData.imageUrl} 
                    alt={request.title} 
                    className="w-full h-full object-cover"
                />
             ) : (
                 <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Package className="w-16 h-16 text-white/50" />
                 </div>
             )}
            
            <button onClick={onClose} className="absolute top-4 right-4 z-20 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md transition-colors"><X className="w-5 h-5"/></button>

            <div className="absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-slate-900/90 to-transparent pt-20">
                <div className="flex flex-wrap gap-2 mb-2">
                    <span className="bg-cyan-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm uppercase">{request.category}</span>
                </div>
                <h1 className="text-3xl font-black text-white leading-tight">{request.title}</h1>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
            <div className="p-6">
                
                {/* Meta Info Bar */}
                <div className="flex gap-4 mb-6 overflow-x-auto pb-2 scrollbar-none items-center">
                     <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm shrink-0">
                        {request.deliveryPreference === DeliveryPreference.SHIPPING ? <Truck className="w-4 h-4 text-blue-500" /> : <Handshake className="w-4 h-4 text-green-500" />}
                        <div className="flex flex-col">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">Method</span>
                            <span className="text-xs font-bold text-slate-700">{request.deliveryPreference || 'Any'}</span>
                        </div>
                     </div>
                     <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm shrink-0">
                        <Layers className="w-4 h-4 text-purple-500" />
                        <div className="flex flex-col">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">Category</span>
                            <span className="text-xs font-bold text-slate-700">{request.category}</span>
                        </div>
                     </div>
                     {distanceInfo && (
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm shrink-0">
                            <Navigation className="w-4 h-4 text-cyan-500" />
                            <div className="flex flex-col">
                                <span className="text-[9px] text-slate-400 font-bold uppercase">Distance</span>
                                <span className="text-xs font-bold text-slate-700">{distanceInfo}</span>
                            </div>
                        </div>
                     )}
                     
                     {request.productUrl && (
                        <a 
                            href={request.productUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="ml-auto flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700 transition-colors"
                        >
                            <ShoppingCart className="w-3 h-3" /> Visit Store
                        </a>
                     )}
                </div>

                {/* User Info */}
                <div className="flex items-center justify-between mb-6 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                    <div 
                        className="flex items-center gap-3 cursor-pointer p-1 rounded-xl transition-colors"
                        onClick={() => onViewProfile && onViewProfile(requester.id)}
                    >
                        <img src={requester.avatarUrl} className="w-10 h-10 rounded-full border border-slate-100 bg-slate-50 object-cover" alt="" />
                        <div>
                            <div className="font-bold text-slate-800 text-sm leading-tight">{requester.displayName}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                <span>@{requester.handle}</span>
                                <span className="w-0.5 h-0.5 rounded-full bg-slate-300 mx-1"></span>
                                <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {requester.location}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-xs font-bold text-slate-400 flex flex-col items-end">
                        <span>Posted</span>
                        <span className="text-slate-600">{timeAgo(request.createdAt)}</span>
                    </div>
                </div>

                {/* Content */}
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" /> The Story
                    </h3>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-slate-700 leading-relaxed text-sm relative">
                        {request.reason}
                         <button 
                            onClick={handlePlayAudio}
                            className="absolute top-4 right-4 p-2 rounded-full bg-slate-50 hover:bg-cyan-50 text-slate-400 hover:text-cyan-600 transition-colors"
                            title="Listen"
                        >
                            {isLoadingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : isPlayingAudio ? <StopCircle className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Link Preview Section */}
                {request.productUrl && (
                    <div className="mb-6 animate-in fade-in slide-in-from-bottom-2">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <ExternalLink className="w-4 h-4" /> Reference Link
                        </h3>
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
                            {candidates.map(c => {
                                const details = getFulfillmentDetails(c.id);
                                const isFulfilled = !!details;
                                return (
                                <div 
                                    key={c.id} 
                                    className={`flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border shadow-sm cursor-pointer hover:bg-blue-50 transition-all ${isFulfilled ? 'border-green-200 bg-green-50' : 'border-blue-100'}`}
                                    onClick={() => setViewingFulfillmentUser(c)}
                                >
                                    <img src={c.avatarUrl} className="w-5 h-5 rounded-full" alt="" />
                                    <span className={`text-xs font-bold ${isFulfilled ? 'text-green-700' : 'text-slate-700'}`}>{c.displayName}</span>
                                    {isFulfilled && <CheckCircle className="w-3 h-3 text-green-500" />}
                                </div>
                                );
                            })}
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
                            request.comments.map(comment => {
                                const commenter = usersMap[comment.userId];
                                const name = commenter ? commenter.displayName : 'Unknown';
                                return (
                                  <div key={comment.id} className="flex gap-3">
                                      <div 
                                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer ${comment.userId === requester.id ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-100 text-slate-500'}`}
                                        onClick={() => onViewProfile && onViewProfile(comment.userId)}
                                      >
                                          <span className="text-xs font-bold">{comment.userId === requester.id ? 'OP' : name.charAt(0)}</span>
                                      </div>
                                      <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex-1">
                                          <div className="flex justify-between items-center mb-1">
                                            <span 
                                                className="font-bold text-xs text-slate-800 cursor-pointer hover:underline"
                                                onClick={() => onViewProfile && onViewProfile(comment.userId)}
                                            >
                                                {comment.userId === requester.id ? 'Original Poster' : name}
                                            </span>
                                            <span className="text-[10px] text-slate-400">{timeAgo(comment.createdAt)}</span>
                                          </div>
                                          <p className="text-sm text-slate-700">{comment.text}</p>
                                      </div>
                                  </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-8 bg-slate-100/50 rounded-2xl border border-dashed border-slate-200">
                                <p className="text-slate-400 text-sm">No comments yet. Be the first!</p>
                            </div>
                        )}
                    </div>

                    {onAddComment && (
                        <div className="sticky bottom-0 bg-white p-2 border border-slate-200 rounded-2xl shadow-sm flex items-center gap-2 z-10">
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
             {request.status === RequestStatus.RECEIVED ? (
                 <div className="w-full bg-green-50 text-green-700 py-3 rounded-xl border border-green-200 text-sm font-bold flex items-center justify-center gap-2">
                     <CheckCircle className="h-5 w-5" /> Item Received
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
        </>
        )}
      </div>
    </div>
  );
};
