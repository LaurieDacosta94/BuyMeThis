import React, { useState, useEffect } from 'react';
import { RequestItem, RequestStatus, User } from '../types';
import { Button } from './Button';
import { Lock, Copy, CheckCircle, ExternalLink, X, Truck, Image as ImageIcon, Search, Sparkles, MapPin, Globe, ShieldAlert, Heart, Smile, Zap, Loader2, HandHelping } from 'lucide-react';
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
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-700 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-slate-300 z-10">
          <X className="h-5 w-5" />
        </button>

        <div className="bg-slate-900 p-6 text-white shrink-0 border-b border-slate-700">
          <h3 className="text-lg font-bold uppercase tracking-widest flex items-center gap-2">
            <HandHelping className="h-5 w-5 text-blue-500" />
            {isFulfilled ? 'Update Tracking' : (isCandidate || isFulfiller) ? 'Fulfillment Protocol' : 'Initiate Help'}
          </h3>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {safetyTips.length > 0 && (
             <div className="mb-6 bg-amber-50 border border-amber-200 p-3 text-amber-900 text-xs font-mono">
                <div className="flex items-center gap-2 font-bold mb-1 uppercase">
                    <ShieldAlert className="h-4 w-4" /> Safety Protocol
                </div>
                <ul className="list-disc pl-5 space-y-1">
                    {safetyTips.map((tip, i) => <li key={i}>{tip}</li>)}
                </ul>
             </div>
          )}

          <div className="flex gap-4 mb-6 border border-slate-200 p-4 bg-slate-50">
            <img src={request.enrichedData?.imageUrl || 'https://picsum.photos/200'} alt={request.title} className="w-16 h-16 object-cover bg-white border border-slate-300 shrink-0" />
            <div>
              <h4 className="font-bold text-slate-900 text-sm">{request.title}</h4>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{request.reason}</p>
            </div>
          </div>

          {!isCandidate && !isFulfiller ? (
            <div className="space-y-4">
               <div className="bg-slate-50 border border-slate-200 p-4 text-slate-700 text-xs">
                <p className="font-bold mb-1 flex items-center gap-2 uppercase">
                  <Lock className="h-3 w-3" /> Address Encrypted
                </p>
                Commit to help to reveal shipping details.
              </div>
              <Button onClick={handleOfferHelp} className="w-full font-bold uppercase tracking-widest" size="lg">I Can Help</Button>
            </div>
          ) : (
            <div className="space-y-6">
               {!isFulfiller && (
                  <div className="bg-green-50 border border-green-200 p-3 text-green-800 text-xs font-bold uppercase flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" /> Commitment Active
                  </div>
               )}

              <div className="bg-white border border-slate-200 p-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Shipping Destination</label>
                <div className="font-mono text-sm bg-slate-50 p-3 border border-slate-200 text-slate-800 relative group">
                  <pre className="whitespace-pre-wrap font-sans">{request.shippingAddress}</pre>
                  <button onClick={() => navigator.clipboard.writeText(request.shippingAddress)} className="absolute top-2 right-2 p-1 hover:bg-slate-200 text-slate-400 hover:text-blue-600"><Copy className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="border border-slate-200">
                <button onClick={() => setShowAssistant(!showAssistant)} className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between text-slate-700 text-sm font-bold hover:bg-slate-100 transition-colors uppercase">
                    <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-600" /> Procurement Assistant</span>
                </button>
                {showAssistant && (
                    <div className="p-4 bg-white border-t border-slate-200">
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => {setSearchMode('online'); setSearchResult(null)}} className={`flex-1 py-2 text-xs font-bold uppercase border ${searchMode === 'online' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}>Online</button>
                            <button onClick={() => {setSearchMode('local'); setSearchResult(null)}} className={`flex-1 py-2 text-xs font-bold uppercase border ${searchMode === 'local' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}>Local</button>
                        </div>
                        {!searchResult ? (
                            <Button size="sm" variant="outline" onClick={handleSearch} isLoading={isSearching} className="w-full uppercase" disabled={searchMode === 'local' && !currentUser.coordinates}>
                                <Search className="h-3 w-3 mr-2" /> Search
                            </Button>
                        ) : (
                            <div>
                                <p className="text-xs text-slate-700 mb-3 font-mono">{searchResult.text}</p>
                                {searchResult.options.map((opt, idx) => (
                                    <a key={idx} href={opt.uri} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-600 hover:underline mb-1 truncate">
                                        <ExternalLink className="h-3 w-3 inline mr-1" /> {opt.title}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-4">
                {isFulfilled ? (
                   <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tracking ID</label>
                     <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-none focus:border-blue-500 outline-none font-mono text-sm mb-3" value={inputVal} onChange={(e) => setInputVal(e.target.value)} />
                     <Button onClick={() => onUpdateTracking(request.id, inputVal)} disabled={!inputVal} className="w-full uppercase" variant="primary">Update Tracking</Button>
                   </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Order ID / Confirmation</label>
                      <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-none focus:border-blue-500 outline-none font-mono text-sm" value={inputVal} onChange={(e) => setInputVal(e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Gift Message</label>
                        <div className="relative">
                            <textarea className="w-full px-3 py-2 border border-slate-300 rounded-none focus:border-blue-500 outline-none h-20 text-sm" placeholder="Optional message..." value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} />
                             <div className="flex gap-2 mt-2">
                                <button onClick={() => handleGenerateMessage('warm')} disabled={isGeneratingMessage} className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-1 hover:bg-slate-200 uppercase font-bold">Warm</button>
                                <button onClick={() => handleGenerateMessage('funny')} disabled={isGeneratingMessage} className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-1 hover:bg-slate-200 uppercase font-bold">Funny</button>
                            </div>
                        </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Proof of Purchase</label>
                      <div className="mt-1 border-2 border-slate-300 border-dashed hover:bg-slate-50 transition-colors relative p-4 text-center">
                        {receiptImage ? (
                          <div className="relative">
                            <img src={receiptImage} alt="Receipt" className="mx-auto h-32 object-contain border border-slate-200" />
                            <button onClick={() => { setReceiptImage(null); setVerificationResult(null); }} className="absolute top-0 right-0 bg-red-600 text-white p-1"><X className="h-3 w-3" /></button>
                            {isVerifyingReceipt ? <div className="mt-2 text-xs text-blue-600 font-mono animate-pulse">Verifying...</div> : verificationResult && (
                                <div className={`mt-2 text-xs font-bold uppercase ${verificationResult.status === 'verified' ? 'text-green-600' : 'text-amber-600'}`}>
                                    {verificationResult.status}: {verificationResult.reasoning}
                                </div>
                            )}
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                             <ImageIcon className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                             <span className="text-xs text-blue-600 font-bold uppercase">Upload Image</span>
                             <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                          </label>
                        )}
                      </div>
                    </div>

                    <Button onClick={() => onConfirmPurchase(request.id, inputVal, receiptImage || undefined, giftMessage, verificationResult?.status)} disabled={!inputVal || isVerifyingReceipt} className="w-full uppercase" variant="secondary">Confirm Purchase</Button>
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