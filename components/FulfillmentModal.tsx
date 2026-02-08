import React, { useState, useEffect } from 'react';
import { RequestItem, RequestStatus, User } from '../types';
import { Button } from './Button';
import { Lock, Copy, CheckCircle, ExternalLink, X, Truck, Image as ImageIcon, Search, Sparkles, MapPin, Globe, ShieldAlert, Heart, Smile, Zap, Loader2, HandHelping, Terminal } from 'lucide-react';
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
  const [inputVal, setInputVal] = useState(request.trackingNumber || '');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [showAssistant, setShowAssistant] = useState(false);
  const [searchMode, setSearchMode] = useState<'online' | 'local'>('online');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ text: string, options: BuyingOption[] } | null>(null);
  const [safetyTips, setSafetyTips] = useState<string[]>([]);
  const [giftMessage, setGiftMessage] = useState('');
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [isVerifyingReceipt, setIsVerifyingReceipt] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ status: 'verified' | 'warning', reasoning: string } | null>(null);

  const isCandidate = request.candidates?.includes(currentUser.id);
  const isFulfiller = request.fulfillerId === currentUser.id;
  const isFulfilled = request.status === RequestStatus.FULFILLED;

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
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-lg shadow-hard border-2 border-slate-900 flex flex-col max-h-[90vh]">
        
        {/* System Header */}
        <div className="bg-slate-900 p-2 text-white shrink-0 border-b-2 border-slate-900 flex justify-between items-center select-none">
          <div className="flex items-center gap-2">
             <div className="w-3 h-3 bg-blue-500 border border-black"></div>
             <h3 className="text-xs font-bold font-mono uppercase tracking-widest flex items-center gap-2">
                <Terminal className="h-3 w-3" />
                {isFulfilled ? 'TRACKING_UPDATE' : (isCandidate || isFulfiller) ? 'PROTOCOL_EXECUTION' : 'INITIATE_HANDSHAKE'}
             </h3>
          </div>
          <button onClick={onClose} className="hover:text-red-400"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50">
          {safetyTips.length > 0 && (
             <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-3 text-amber-900 text-xs font-mono shadow-sm">
                <div className="flex items-center gap-2 font-bold mb-1 uppercase">
                    <ShieldAlert className="h-4 w-4" /> Hazard_Warning
                </div>
                <ul className="list-disc pl-5 space-y-1 opacity-80">
                    {safetyTips.map((tip, i) => <li key={i}>{tip}</li>)}
                </ul>
             </div>
          )}

          <div className="flex gap-4 mb-6 border-2 border-slate-200 p-4 bg-white">
            <img src={request.enrichedData?.imageUrl || 'https://picsum.photos/200'} alt={request.title} className="w-16 h-16 object-cover border-2 border-slate-900 shrink-0" />
            <div>
              <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">{request.title}</h4>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2 font-mono">{request.reason}</p>
            </div>
          </div>

          {!isCandidate && !isFulfiller ? (
            <div className="space-y-4">
               <div className="bg-slate-200 border border-slate-300 p-4 text-slate-700 text-xs font-mono">
                <p className="font-bold mb-1 flex items-center gap-2 uppercase">
                  <Lock className="h-3 w-3" /> Data_Encrypted
                </p>
                Access to shipping coordinates restricted until commitment verified.
              </div>
              <Button onClick={handleOfferHelp} className="w-full font-bold uppercase tracking-widest font-mono bg-blue-600 hover:bg-blue-500 shadow-hard-sm" size="lg">Accept_Mission</Button>
            </div>
          ) : (
            <div className="space-y-6">
               {!isFulfiller && (
                  <div className="bg-green-100 border border-green-500 p-2 text-green-900 text-xs font-bold uppercase flex items-center justify-center gap-2 font-mono">
                      <CheckCircle className="h-4 w-4" /> Status: PENDING_ACTION
                  </div>
               )}

              <div className="bg-white border-2 border-slate-900 p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-slate-900 text-white text-[9px] px-2 font-mono uppercase">Target_Location</div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2 font-mono mt-2">Shipping_Vector</label>
                <div className="font-mono text-sm bg-slate-100 p-3 border border-slate-300 text-slate-800 relative group">
                  <pre className="whitespace-pre-wrap font-sans">{request.shippingAddress}</pre>
                  <button onClick={() => navigator.clipboard.writeText(request.shippingAddress)} className="absolute top-2 right-2 p-1 bg-white border border-slate-300 hover:bg-blue-50 text-slate-500 hover:text-blue-600"><Copy className="h-3 w-3" /></button>
                </div>
              </div>

              <div className="border-2 border-slate-200 bg-white">
                <button onClick={() => setShowAssistant(!showAssistant)} className="w-full px-4 py-3 bg-white flex items-center justify-between text-slate-900 text-xs font-bold hover:bg-slate-50 transition-colors uppercase font-mono border-b border-slate-100">
                    <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-600" /> AI_Procurement_Assist</span>
                </button>
                {showAssistant && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200">
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => {setSearchMode('online'); setSearchResult(null)}} className={`flex-1 py-1 text-[10px] font-bold uppercase border-2 font-mono ${searchMode === 'online' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-300'}`}>NET</button>
                            <button onClick={() => {setSearchMode('local'); setSearchResult(null)}} className={`flex-1 py-1 text-[10px] font-bold uppercase border-2 font-mono ${searchMode === 'local' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-300'}`}>LOCAL</button>
                        </div>
                        {!searchResult ? (
                            <Button size="sm" variant="outline" onClick={handleSearch} isLoading={isSearching} className="w-full uppercase font-mono text-xs border-slate-400" disabled={searchMode === 'local' && !currentUser.coordinates}>
                                <Search className="h-3 w-3 mr-2" /> SCAN_MARKET
                            </Button>
                        ) : (
                            <div>
                                <p className="text-xs text-slate-900 mb-3 font-mono font-bold">Suggestions:</p>
                                {searchResult.options.map((opt, idx) => (
                                    <a key={idx} href={opt.uri} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-700 hover:underline mb-2 truncate font-mono bg-white border border-slate-200 p-2">
                                        <ExternalLink className="h-3 w-3 inline mr-1" /> {opt.title}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                )}
              </div>

              <div className="border-t-2 border-slate-200 pt-4 space-y-4">
                {isFulfilled ? (
                   <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-2 font-mono">Tracking_ID</label>
                     <input type="text" className="w-full px-3 py-2 border-2 border-slate-300 focus:border-blue-600 outline-none font-mono text-sm mb-3 bg-white" value={inputVal} onChange={(e) => setInputVal(e.target.value)} />
                     <Button onClick={() => onUpdateTracking(request.id, inputVal)} disabled={!inputVal} className="w-full uppercase font-mono font-bold" variant="primary">Update_Data</Button>
                   </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2 font-mono">Confirmation_Code / Order_ID</label>
                      <input type="text" className="w-full px-3 py-2 border-2 border-slate-300 focus:border-blue-600 outline-none font-mono text-sm bg-white" value={inputVal} onChange={(e) => setInputVal(e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 font-mono">Attached_Message</label>
                        <div className="relative">
                            <textarea className="w-full px-3 py-2 border-2 border-slate-300 focus:border-blue-600 outline-none h-20 text-sm bg-white font-mono" placeholder="Optional..." value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} />
                             <div className="flex gap-2 mt-2">
                                <button onClick={() => handleGenerateMessage('warm')} disabled={isGeneratingMessage} className="text-[9px] bg-white border border-slate-300 px-2 py-1 hover:bg-slate-100 uppercase font-bold font-mono">Tone:Warm</button>
                                <button onClick={() => handleGenerateMessage('funny')} disabled={isGeneratingMessage} className="text-[9px] bg-white border border-slate-300 px-2 py-1 hover:bg-slate-100 uppercase font-bold font-mono">Tone:Funny</button>
                            </div>
                        </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2 font-mono">Visual_Proof</label>
                      <div className="mt-1 border-2 border-slate-300 border-dashed hover:bg-white hover:border-slate-500 transition-colors relative p-4 text-center bg-slate-50">
                        {receiptImage ? (
                          <div className="relative">
                            <img src={receiptImage} alt="Receipt" className="mx-auto h-32 object-contain border border-slate-300 bg-white" />
                            <button onClick={() => { setReceiptImage(null); setVerificationResult(null); }} className="absolute top-0 right-0 bg-red-600 text-white p-1 hover:bg-red-700"><X className="h-3 w-3" /></button>
                            {isVerifyingReceipt ? <div className="mt-2 text-xs text-blue-600 font-mono animate-pulse">ANALYZING_IMAGE...</div> : verificationResult && (
                                <div className={`mt-2 text-xs font-bold uppercase font-mono ${verificationResult.status === 'verified' ? 'text-green-600' : 'text-amber-600'}`}>
                                    [{verificationResult.status}]: {verificationResult.reasoning}
                                </div>
                            )}
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                             <ImageIcon className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                             <span className="text-xs text-blue-600 font-bold uppercase font-mono hover:underline">UPLOAD_IMAGE</span>
                             <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                          </label>
                        )}
                      </div>
                    </div>

                    <Button onClick={() => onConfirmPurchase(request.id, inputVal, receiptImage || undefined, giftMessage, verificationResult?.status)} disabled={!inputVal || isVerifyingReceipt} className="w-full uppercase font-bold font-mono shadow-hard-sm" variant="secondary">EXECUTE_FULFILLMENT</Button>
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