import React, { useState, useEffect } from 'react';
import { RequestItem, RequestStatus, User } from '../types';
import { Button } from './Button';
import { Lock, Copy, CheckCircle, ExternalLink, X, Truck, Image as ImageIcon, Search, Sparkles, MapPin, Globe, ShieldAlert, Heart, Smile, Zap, Loader2 } from 'lucide-react';
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
  
  // Shopping Assistant State
  const [showAssistant, setShowAssistant] = useState(false);
  const [searchMode, setSearchMode] = useState<'online' | 'local'>('online');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ text: string, options: BuyingOption[] } | null>(null);

  // Safety & Social State
  const [safetyTips, setSafetyTips] = useState<string[]>([]);
  const [giftMessage, setGiftMessage] = useState('');
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  
  // Receipt Verification State
  const [isVerifyingReceipt, setIsVerifyingReceipt] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ status: 'verified' | 'warning', reasoning: string } | null>(null);

  useEffect(() => {
    if (isOpen && request.status === RequestStatus.PENDING) {
        // Load safety tips when entering fulfillment mode
        getSafetyTips(request.title, request.location, request.shippingAddress).then(setSafetyTips);
    }
  }, [isOpen, request.status, request.title, request.location, request.shippingAddress]);

  if (!isOpen) return null;

  const isPending = request.status === RequestStatus.PENDING;
  const isFulfilled = request.status === RequestStatus.FULFILLED;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setReceiptImage(base64);
        
        // Auto-Verify
        setIsVerifyingReceipt(true);
        setVerificationResult(null);
        try {
            const result = await verifyReceipt(base64, request.title);
            setVerificationResult({
                status: result.status,
                reasoning: result.reasoning
            });
        } catch (e) {
            setVerificationResult({ status: 'warning', reasoning: "Could not complete verification." });
        } finally {
            setIsVerifyingReceipt(false);
        }
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
                setSearchResult({
                    text: "You need to enable location in your profile to find local stores.",
                    options: []
                });
            }
        }
    } catch (e) {
        setSearchResult({ text: "Search failed. Please try again.", options: [] });
    } finally {
        setIsSearching(false);
    }
  };

  const switchMode = (mode: 'online' | 'local') => {
      setSearchMode(mode);
      setSearchResult(null);
  };

  const handleGenerateMessage = async (tone: 'warm' | 'funny' | 'inspiring') => {
      setIsGeneratingMessage(true);
      try {
          // Note: In a real app we'd fetch the requester's name properly
          const msg = await generateGiftMessage(request.title, "Friend", tone);
          setGiftMessage(msg);
      } finally {
          setIsGeneratingMessage(false);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-indigo-200 z-10">
          <X className="h-5 w-5" />
        </button>

        <div className="bg-indigo-600 p-6 text-white shrink-0">
          <h3 className="text-xl font-bold">
            {isFulfilled ? 'Update Tracking' : 'Fulfill this Request'}
          </h3>
          <p className="text-indigo-100 text-sm mt-1">
            {isFulfilled ? 'Help the requester track their gift.' : 'Make a difference for someone today.'}
          </p>
        </div>

        <div className="p-6 overflow-y-auto">
          {/* Safety Tips Alert */}
          {safetyTips.length > 0 && isPending && (
             <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900 text-sm animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2 font-semibold mb-1 text-amber-700">
                    <ShieldAlert className="h-4 w-4" /> AI Safety Advisor
                </div>
                <ul className="list-disc pl-5 space-y-1">
                    {safetyTips.map((tip, i) => <li key={i}>{tip}</li>)}
                </ul>
             </div>
          )}

          <div className="flex gap-4 mb-6">
            <img 
              src={request.enrichedData?.imageUrl || 'https://picsum.photos/200'} 
              alt={request.title} 
              className="w-20 h-20 object-cover rounded-lg bg-slate-100 shrink-0"
            />
            <div>
              <h4 className="font-semibold text-slate-900">{request.title}</h4>
              <p className="text-sm text-slate-500 mt-1 line-clamp-2">{request.reason}</p>
            </div>
          </div>

          {!isPending && !isFulfilled ? (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-700 text-sm">
                <p className="font-medium mb-1 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Address is Hidden
                </p>
                To see the shipping address and avoid duplicate purchases, you must commit to this request.
              </div>
              
              <Button onClick={() => onCommit(request.id)} className="w-full">
                I'll Buy This
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Address Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Shipping Address</label>
                <div className="mt-2 font-mono text-sm bg-white p-3 rounded border border-slate-200 text-slate-800 relative group">
                  <pre className="whitespace-pre-wrap font-sans">{request.shippingAddress}</pre>
                  <button 
                    onClick={() => navigator.clipboard.writeText(request.shippingAddress)}
                    className="absolute top-2 right-2 p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600"
                    title="Copy Address"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Shopping Assistant */}
              <div className="border border-indigo-100 rounded-xl overflow-hidden">
                <button 
                    onClick={() => setShowAssistant(!showAssistant)}
                    className="w-full px-4 py-3 bg-indigo-50 flex items-center justify-between text-indigo-800 text-sm font-medium hover:bg-indigo-100 transition-colors"
                >
                    <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI Shopping Assistant</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showAssistant ? 'rotate-180' : ''}`} />
                </button>
                
                {showAssistant && (
                    <div className="p-4 bg-white">
                        <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-lg">
                            <button 
                                onClick={() => switchMode('online')}
                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${searchMode === 'online' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Globe className="h-3 w-3" /> Find Online
                            </button>
                            <button 
                                onClick={() => switchMode('local')}
                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${searchMode === 'local' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <MapPin className="h-3 w-3" /> Find Nearby
                            </button>
                        </div>

                        {!searchResult ? (
                            <div className="text-center py-2">
                                <p className="text-sm text-slate-600 mb-3">
                                    {searchMode === 'online' ? "Find top retailers and prices." : "Find stores near you that carry this item."}
                                </p>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={handleSearch} 
                                    isLoading={isSearching}
                                    className="w-full"
                                    disabled={searchMode === 'local' && !currentUser.coordinates}
                                >
                                    <Search className="h-3 w-3 mr-2" /> 
                                    {searchMode === 'local' && !currentUser.coordinates ? 'Location Required' : 'Search Now'}
                                </Button>
                            </div>
                        ) : (
                            <div className="animate-in fade-in">
                                <p className="text-sm text-slate-700 mb-3">{searchResult.text}</p>
                                {searchResult.options.length > 0 && (
                                    <ul className="space-y-2">
                                        {searchResult.options.map((opt, idx) => (
                                            <li key={idx} className="text-sm">
                                                <a href={opt.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-600 hover:underline">
                                                    <ExternalLink className="h-3 w-3" /> {opt.title}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-center">
                                    <button onClick={() => setSearchResult(null)} className="text-xs text-slate-400 hover:text-slate-600">Clear Results</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
              </div>

              {/* Retailer Link */}
              <div className="flex gap-3">
                <a 
                  href={request.productUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                >
                  Go to Original Link <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </div>

              {/* Confirmation / Tracking Input */}
              <div className="border-t border-slate-100 pt-4 space-y-4">
                {isFulfilled ? (
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-2">Update Tracking Number</label>
                     <input 
                       type="text" 
                       placeholder="e.g. USPS 9400..."
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 mb-3"
                       value={inputVal}
                       onChange={(e) => setInputVal(e.target.value)}
                     />
                     <Button 
                       onClick={() => onUpdateTracking(request.id, inputVal)} 
                       disabled={!inputVal}
                       className="w-full"
                       variant="primary"
                     >
                       Update Tracking <Truck className="ml-2 h-4 w-4" />
                     </Button>
                   </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Order ID / Confirmation</label>
                      <input 
                        type="text" 
                        placeholder="Paste Order ID here..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                      />
                    </div>

                    {/* Gift Message Section */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Add a Gift Message (Optional)</label>
                        <div className="relative">
                            <textarea
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-20 text-sm"
                                placeholder="Write a note or use AI to generate one..."
                                value={giftMessage}
                                onChange={(e) => setGiftMessage(e.target.value)}
                            />
                             <div className="flex gap-2 mt-2">
                                <button onClick={() => handleGenerateMessage('warm')} disabled={isGeneratingMessage} className="text-xs flex items-center gap-1 bg-pink-50 text-pink-600 px-2 py-1 rounded hover:bg-pink-100 transition-colors">
                                    <Heart className="h-3 w-3" /> Warm
                                </button>
                                <button onClick={() => handleGenerateMessage('funny')} disabled={isGeneratingMessage} className="text-xs flex items-center gap-1 bg-yellow-50 text-yellow-600 px-2 py-1 rounded hover:bg-yellow-100 transition-colors">
                                    <Smile className="h-3 w-3" /> Funny
                                </button>
                                <button onClick={() => handleGenerateMessage('inspiring')} disabled={isGeneratingMessage} className="text-xs flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 transition-colors">
                                    <Zap className="h-3 w-3" /> Inspiring
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Upload Receipt (Optional)</label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:bg-slate-50 transition-colors relative">
                        {receiptImage ? (
                          <div className="text-center relative w-full">
                            <img src={receiptImage} alt="Receipt Preview" className="mx-auto h-32 object-contain" />
                            <button 
                              onClick={() => { setReceiptImage(null); setVerificationResult(null); }}
                              className="absolute top-0 right-0 -mr-2 -mt-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                            >
                              <X className="h-4 w-4" />
                            </button>
                            
                            {/* Verification Result */}
                            {isVerifyingReceipt ? (
                                <div className="mt-2 flex items-center justify-center gap-2 text-xs text-indigo-600 font-medium animate-pulse">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Verifying Receipt with AI...
                                </div>
                            ) : verificationResult ? (
                                <div className={`mt-2 text-xs font-bold px-2 py-1 rounded-md inline-block ${verificationResult.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {verificationResult.status === 'verified' ? (
                                        <div className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Verified: {verificationResult.reasoning}</div>
                                    ) : (
                                        <div className="flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Warning: {verificationResult.reasoning}</div>
                                    )}
                                </div>
                            ) : null}

                          </div>
                        ) : (
                          <div className="space-y-1 text-center">
                            <ImageIcon className="mx-auto h-12 w-12 text-slate-400" />
                            <div className="flex text-sm text-slate-600 justify-center">
                              <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                                <span>Upload a file</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button 
                      onClick={() => onConfirmPurchase(request.id, inputVal, receiptImage || undefined, giftMessage, verificationResult?.status)} 
                      disabled={!inputVal || isVerifyingReceipt}
                      className="w-full"
                      variant="secondary"
                    >
                      Confirm Purchase <CheckCircle className="ml-2 h-4 w-4" />
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

function ChevronDown({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6"/></svg>
    )
}