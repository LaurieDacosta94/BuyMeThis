
import React, { useState, useEffect } from 'react';
import { RequestItem, RequestStatus, User, Fulfillment } from '../types';
import { Button } from './Button';
import { Lock, Copy, CheckCircle, ExternalLink, X, Truck, Image as ImageIcon, Search, Sparkles, MapPin, Globe, ShieldAlert, Heart, Smile, Zap, Loader2, HandHelping, UploadCloud, Camera } from 'lucide-react';
import { findBuyingOptions, findLocalStores, BuyingOption, generateGiftMessage, getSafetyTips, verifyReceipt } from '../services/geminiService';

interface FulfillmentModalProps {
  request: RequestItem;
  isOpen: boolean;
  onClose: () => void;
  onCommit: (requestId: string) => void;
  onConfirmPurchase: (requestId: string, orderId: string, receiptImage?: string, giftMessage?: string, verificationStatus?: 'verified' | 'warning') => void;
  onUpdateTracking: (requestId: string, trackingNumber: string) => void;
  currentUser: User;
}

export const FulfillmentModal: React.FC<FulfillmentModalProps> = ({ 
  request, isOpen, onClose, onCommit, onConfirmPurchase, onUpdateTracking, currentUser
}) => {
  // Check if current user has already fulfilled this
  const myFulfillment = request.fulfillments?.find(f => f.fulfillerId === currentUser.id);
  const myStatus = myFulfillment?.status;
  
  const [inputVal, setInputVal] = useState(myFulfillment?.trackingNumber || '');
  const [receiptImage, setReceiptImage] = useState<string | null>(myFulfillment?.proofOfPurchaseImage || null);
  const [showAssistant, setShowAssistant] = useState(false);
  const [searchMode, setSearchMode] = useState<'online' | 'local'>('online');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ text: string, options: BuyingOption[] } | null>(null);
  const [safetyTips, setSafetyTips] = useState<string[]>([]);
  const [giftMessage, setGiftMessage] = useState(myFulfillment?.giftMessage || '');
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [isVerifyingReceipt, setIsVerifyingReceipt] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ status: 'verified' | 'warning', reasoning: string } | null>(null);

  const isCandidate = request.candidates?.includes(currentUser.id);
  // Is this user the one who is finalizing it?
  const isFulfiller = request.fulfillerId === currentUser.id || !!myFulfillment; 
  const isCompletedByMe = myStatus === RequestStatus.FULFILLED;

  useEffect(() => {
    if (isOpen) getSafetyTips(request.title, request.location, request.shippingAddress).then(setSafetyTips);
  }, [isOpen, request.title, request.location, request.shippingAddress]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setReceiptImage(base64);
        setIsVerifyingReceipt(true);
        setVerificationResult(null);
        try {
            const result = await verifyReceipt(base64, request.title);
            setVerificationResult({ status: result.status, reasoning: result.reasoning });
        } catch (e) {
            setVerificationResult({ status: 'warning', reasoning: "Verification failed." });
        } finally { setIsVerifyingReceipt(false); }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setSearchResult(null);
    try {
        if (searchMode === 'online') {
            const result = await findBuyingOptions(request.title);
            setSearchResult(result);
        } else {
            if (currentUser.coordinates) {
                const result = await findLocalStores(request.title, currentUser.coordinates.lat, currentUser.coordinates.lng);
                setSearchResult(result);
            } else {
                setSearchResult({ text: "Location required.", options: [] });
            }
        }
    } catch (e) { setSearchResult({ text: "Failed.", options: [] }); } finally { setIsSearching(false); }
  };

  const handleGenerateMessage = async (tone: 'warm' | 'funny' | 'inspiring') => {
      setIsGeneratingMessage(true);
      try {
          const msg = await generateGiftMessage(request.title, "Friend", tone);
          setGiftMessage(msg);
      } finally { setIsGeneratingMessage(false); }
  };

  const handleOfferHelp = () => onCommit(request.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white/95 rounded-3xl shadow-2xl border border-white/50 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Anime Watermark */}
        <div className="anime-watermark opacity-20"></div>

        {/* Header */}
        <div className="relative bg-gradient-to-r from-cyan-500 to-blue-500 p-6 pb-8 text-white">
           <div className="absolute top-4 right-4">
               <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X className="w-5 h-5 text-white" /></button>
           </div>
           <h2 className="text-2xl font-black tracking-tight">{isCompletedByMe ? 'Update Tracking' : (isCandidate || isFulfiller) ? 'Fulfillment Protocol' : 'Accept Mission'}</h2>
           <p className="text-cyan-100 text-sm font-medium mt-1">Make someone's day brighter!</p>
           
           <div className="absolute -bottom-6 left-6 right-6 bg-white rounded-2xl p-4 shadow-lg border border-cyan-50 flex gap-4 items-center">
                <img src={request.enrichedData?.imageUrl || 'https://picsum.photos/200'} alt={request.title} className="w-12 h-12 rounded-xl object-cover border border-slate-100" />
                <div>
                   <h3 className="font-bold text-slate-800 text-sm">{request.title}</h3>
                   <div className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {request.location}</div>
                </div>
           </div>
        </div>

        <div className="pt-10 px-6 pb-6 relative z-10 overflow-y-auto max-h-[70vh] custom-scrollbar">
          
          {safetyTips.length > 0 && (
             <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase mb-1">
                    <ShieldAlert className="h-4 w-4" /> Safety First
                </div>
                <ul className="text-xs text-amber-800 space-y-1 list-disc pl-4">
                    {safetyTips.map((tip, i) => <li key={i}>{tip}</li>)}
                </ul>
             </div>
          )}

          {!isCandidate && !isFulfiller ? (
            <div className="text-center space-y-6 py-4">
               <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
                  <HandHelping className="w-8 h-8 text-blue-500" />
               </div>
               <div>
                   <p className="text-slate-600 font-medium mb-4">By accepting this request, you're promising to help purchase and send this item. Are you ready to be a hero?</p>
                   <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2 text-left mb-6">
                       <Lock className="w-4 h-4 shrink-0" /> Shipping address will be revealed after you accept.
                   </div>
               </div>
               <Button onClick={handleOfferHelp} className="w-full shadow-lg shadow-cyan-500/30 rounded-full py-4 text-base" size="lg">I'll Do It!</Button>
            </div>
          ) : (
            <div className="space-y-6">
               {!isFulfiller && (
                  <div className="bg-green-50 text-green-700 px-4 py-2 rounded-xl text-center text-sm font-bold border border-green-100 flex items-center justify-center gap-2">
                      <CheckCircle className="h-4 w-4" /> You're on the list! Waiting for requester...
                  </div>
               )}

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Shipping Destination</label>
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-400">Private</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-sm font-mono text-slate-700 relative group">
                  <p>{request.shippingAddress}</p>
                  <button onClick={() => navigator.clipboard.writeText(request.shippingAddress)} className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100"><Copy className="h-4 w-4" /></button>
                </div>
              </div>

              {/* AI Assistant */}
              <div className="border border-indigo-100 bg-indigo-50/50 rounded-2xl overflow-hidden">
                <button onClick={() => setShowAssistant(!showAssistant)} className="w-full px-4 py-3 flex items-center justify-between text-indigo-900 font-bold text-sm hover:bg-indigo-100 transition-colors">
                    <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-indigo-500" /> AI Assistant</span>
                    <span className="text-xs text-indigo-400 font-normal">{showAssistant ? 'Hide' : 'Show'}</span>
                </button>
                
                {showAssistant && (
                    <div className="p-4 border-t border-indigo-100 bg-white">
                        <div className="flex gap-2 mb-3 bg-slate-100 p-1 rounded-xl">
                            <button onClick={() => {setSearchMode('online'); setSearchResult(null)}} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${searchMode === 'online' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Online Stores</button>
                            <button onClick={() => {setSearchMode('local'); setSearchResult(null)}} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${searchMode === 'local' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Local Map</button>
                        </div>
                        
                        {!searchResult ? (
                            <Button size="sm" variant="secondary" onClick={handleSearch} isLoading={isSearching} className="w-full rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50" disabled={searchMode === 'local' && !currentUser.coordinates}>
                                <Search className="h-3 w-3 mr-2" /> Find Buying Options
                            </Button>
                        ) : (
                            <div className="animate-in fade-in">
                                <p className="text-xs font-bold text-slate-700 mb-2">Results:</p>
                                <div className="space-y-2">
                                    {searchResult.options.map((opt, idx) => (
                                        <a key={idx} href={opt.uri} target="_blank" rel="noopener noreferrer" className="block p-2 bg-slate-50 rounded-lg hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 transition-colors group">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">{opt.title}</span>
                                                <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-indigo-400" />
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-5">
                {isCompletedByMe ? (
                   <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Update Tracking ID</label>
                     <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 outline-none text-sm font-mono" value={inputVal} onChange={(e) => setInputVal(e.target.value)} placeholder="Tracking #" />
                     <Button onClick={() => onUpdateTracking(request.id, inputVal)} disabled={!inputVal} className="w-full mt-3 rounded-xl" variant="primary">Save Changes</Button>
                   </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Order Confirmation / Tracking #</label>
                      <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 outline-none text-sm font-mono" value={inputVal} onChange={(e) => setInputVal(e.target.value)} placeholder="Required" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Gift Message</label>
                        <div className="relative">
                            <textarea className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 outline-none text-sm min-h-[80px]" placeholder="Add a personal note..." value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} />
                            <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                                <button onClick={() => handleGenerateMessage('warm')} disabled={isGeneratingMessage} className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-xs font-bold hover:bg-pink-100 whitespace-nowrap">🌸 Warm</button>
                                <button onClick={() => handleGenerateMessage('funny')} disabled={isGeneratingMessage} className="px-3 py-1 bg-yellow-50 text-yellow-600 rounded-full text-xs font-bold hover:bg-yellow-100 whitespace-nowrap">😂 Funny</button>
                                <button onClick={() => handleGenerateMessage('inspiring')} disabled={isGeneratingMessage} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-100 whitespace-nowrap">✨ Inspiring</button>
                            </div>
                        </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Proof of Purchase</label>
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center bg-slate-50 hover:bg-white hover:border-cyan-400 transition-colors cursor-pointer relative">
                        {receiptImage ? (
                          <div className="relative">
                            <img src={receiptImage} alt="Receipt" className="mx-auto max-h-40 rounded-lg shadow-sm" />
                            <button onClick={() => { setReceiptImage(null); setVerificationResult(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600"><X className="h-3 w-3" /></button>
                            
                            {isVerifyingReceipt ? (
                                <div className="mt-2 text-xs text-blue-600 flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Verifying...</div>
                            ) : verificationResult && (
                                <div className={`mt-2 text-xs font-bold px-2 py-1 rounded-full inline-flex items-center gap-1 ${verificationResult.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {verificationResult.status === 'verified' ? <CheckCircle className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                                    {verificationResult.reasoning}
                                </div>
                            )}
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                             <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-400">
                                 <UploadCloud className="w-5 h-5" />
                             </div>
                             <span className="text-xs font-bold text-slate-600">Click to upload receipt</span>
                             <p className="text-[10px] text-slate-400 mt-1">Images verified by AI</p>
                             <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                          </label>
                        )}
                      </div>
                    </div>

                    <Button onClick={() => onConfirmPurchase(request.id, inputVal, receiptImage || undefined, giftMessage, verificationResult?.status)} disabled={!inputVal || isVerifyingReceipt} className="w-full rounded-full shadow-lg shadow-green-500/20 py-3" variant="primary">
                        Confirm Fulfillment
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
