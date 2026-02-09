
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { enrichRequestData, validateContent, analyzeImageForRequest, analyzeAudioForRequest, generateRequestImage, getApproximateAddress } from '../services/geminiService';
import { fetchLinkMetadata } from '../services/linkService';
import { RequestItem, RequestStatus, User, Coordinates, Category, DeliveryPreference } from '../types';
import { Sparkles, Link as LinkIcon, Camera, Mic, Wand2, Crosshair, ArrowRight, ArrowLeft, Image as ImageIcon, MapPin, Loader2, DownloadCloud } from 'lucide-react';

interface CreateRequestProps {
  currentUser: User;
  onSubmit: (request: RequestItem) => void;
  onCancel: () => void;
}

export const CreateRequest: React.FC<CreateRequestProps> = ({ currentUser, onSubmit, onCancel }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    productUrl: '',
    title: '',
    reason: '',
    shippingAddress: '',
    category: Category.OTHER,
    deliveryPreference: DeliveryPreference.ANY
  });
  
  const [coordinates, setCoordinates] = useState<Coordinates | undefined>(currentUser.coordinates);
  const [locationName, setLocationName] = useState(currentUser.location);
  const [isLocating, setIsLocating] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [linkDescription, setLinkDescription] = useState<string>(''); // Store fetched description
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Fetch link metadata (Title, Description, Image)
  const handleLinkFetch = async () => {
      if (!formData.productUrl) return;
      setIsLoading(true);
      try {
          const metadata = await fetchLinkMetadata(formData.productUrl);
          if (metadata) {
              if (metadata.image) setUploadedImage(metadata.image);
              if (metadata.description) setLinkDescription(metadata.description);
              
              setFormData(prev => ({
                  ...prev,
                  // Auto-fill title if empty
                  title: !prev.title && metadata.title ? metadata.title : prev.title,
                  // Auto-fill reason if empty
                  reason: !prev.reason && metadata.description ? metadata.description : prev.reason
              }));
          }
      } catch (e) {
          console.error("Failed to fetch link data", e);
      } finally {
          setIsLoading(false);
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = async () => {
          const base64 = reader.result as string;
          setUploadedImage(base64);
          setIsAnalyzingImage(true);
          try {
              const result = await analyzeImageForRequest(base64);
              setFormData(prev => ({
                  ...prev,
                  title: result.title || prev.title,
                  reason: result.reason || prev.reason,
                  category: (Object.values(Category).includes(result.category as Category) ? result.category as Category : Category.OTHER)
              }));
          } catch (err) { setError("Analysis failed."); } finally { setIsAnalyzingImage(false); }
      };
      reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    setError(null);
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
            stream.getTracks().forEach(track => track.stop());
            setIsAnalyzingImage(true);
            try {
                 const reader = new FileReader();
                 reader.readAsDataURL(audioBlob);
                 reader.onloadend = async () => {
                     const base64Audio = reader.result as string;
                     const result = await analyzeAudioForRequest(base64Audio);
                     setFormData(prev => ({ ...prev, title: result.title || prev.title, reason: result.reason || prev.reason, category: (Object.values(Category).includes(result.category as Category) ? result.category as Category : Category.OTHER) }));
                    setIsAnalyzingImage(false);
                 };
            } catch (err) { setIsAnalyzingImage(false); }
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);
    } catch (err) { setError("Microphone access denied."); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); } };

  const handleGenerateImage = async () => {
      if (!formData.title) return;
      setIsGeneratingImage(true);
      try {
          const base64 = await generateRequestImage(formData.title, formData.category);
          if (base64) setUploadedImage(base64);
      } catch (err) { setError("Generation failed."); } finally { setIsGeneratingImage(false); }
  };

  const handleEnrichment = async () => {
    if (!formData.title && !formData.reason) { setError("Title/Reason required."); return; }
    setIsLoading(true);
    setError(null);
    try {
      // Safety check is still important
      const safetyCheck = await validateContent(formData.title + " " + formData.reason);
      if (!safetyCheck.safe) throw new Error("Safety check failed: Content flagged.");

      // If we already have link data, we can construct the enriched data without another AI call
      // or we can use AI to categorize if needed.
      let enriched = { 
          title: formData.title, 
          price: 0, 
          description: linkDescription || formData.reason, 
          category: formData.category, 
          imageUrl: uploadedImage || undefined 
      };
      
      // If no link data but we have a URL, or if we want to force AI verification
      if (formData.productUrl && !linkDescription) {
          const result = await enrichRequestData(formData.productUrl, formData.title, formData.reason);
          enriched = { 
              ...result, 
              category: Object.values(Category).includes(result.category as Category) ? (result.category as Category) : Category.OTHER,
              imageUrl: result.imageUrl || uploadedImage || undefined
          };
      }

      setFormData(prev => ({ ...prev, title: prev.title || enriched.title }));
      // We don't overwrite category if user selected one, unless it was 'Other'
      if (formData.category === Category.OTHER && enriched.category !== 'General') {
          // Check if valid category
           if (Object.values(Category).includes(enriched.category as Category)) {
               setFormData(prev => ({ ...prev, category: enriched.category as Category }));
           }
      }

      setStep(2);
    } catch (err: any) { setError(err.message); } finally { setIsLoading(false); }
  };
  
  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoordinates({ lat, lng });
        try {
            setLocationName("Locating...");
            const address = await getApproximateAddress(lat, lng);
            setLocationName(address);
        } catch (e) { setLocationName(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`); } finally { setIsLocating(false); }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.shippingAddress || !formData.title) return;
    // Use uploaded/fetched image or fallback
    const finalImage = uploadedImage || ""; 
    const newRequest: RequestItem = {
      id: `req_${Date.now()}`,
      requesterId: currentUser.id,
      title: formData.title,
      productUrl: formData.productUrl,
      reason: formData.reason,
      shippingAddress: formData.shippingAddress,
      status: RequestStatus.OPEN,
      category: formData.category,
      deliveryPreference: formData.deliveryPreference,
      createdAt: new Date().toISOString(),
      location: locationName, 
      coordinates: coordinates,
      enrichedData: { 
          title: formData.title, 
          price: 0, 
          description: linkDescription || formData.reason, 
          imageUrl: finalImage 
      },
      comments: [],
      candidates: []
    };
    onSubmit(newRequest);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white/90 backdrop-blur-md rounded-3xl border border-white/60 shadow-glow overflow-hidden">
      <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-6 text-white">
        <h2 className="text-2xl font-black tracking-tight">{step === 1 ? 'New Request Protocol' : 'Finalize Request'}</h2>
        <p className="text-cyan-100 text-sm font-medium">Step {step} of 2</p>
      </div>

      <div className="p-8">
        {step === 1 && (
          <div className="space-y-6">
            
            {/* AI Assistant Section */}
            <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-indigo-900 text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-indigo-500" /> AI Auto-Fill</h3>
                    <div className="flex gap-2">
                         {isRecording ? (
                            <button onClick={stopRecording} className="bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold animate-pulse">Recording...</button>
                         ) : (
                            <button onClick={startRecording} disabled={isAnalyzingImage} className="bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-colors"><Mic className="h-3 w-3" /> Voice</button>
                         )}
                         <label className="cursor-pointer bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-colors">
                            <Camera className="h-3 w-3" /> Image
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isRecording} />
                        </label>
                    </div>
                </div>
                {(isAnalyzingImage || isGeneratingImage) && <div className="text-xs font-bold text-indigo-600 animate-pulse">Processing media stream...</div>}
                {uploadedImage && <img src={uploadedImage} alt="Uploaded" className="h-20 w-20 object-cover rounded-xl border border-indigo-200 shadow-sm mt-2" />}
            </div>

            <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Item Title</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-50 outline-none text-sm font-bold bg-slate-50 focus:bg-white transition-all" placeholder="What do you need?" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                        <select className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-cyan-400 outline-none text-sm bg-slate-50 focus:bg-white transition-all cursor-pointer" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value as Category})}>
                            {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Delivery</label>
                        <select className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-cyan-400 outline-none text-sm bg-slate-50 focus:bg-white transition-all cursor-pointer" value={formData.deliveryPreference} onChange={(e) => setFormData({...formData, deliveryPreference: e.target.value as DeliveryPreference})}>
                            <option value={DeliveryPreference.ANY}>Any Method</option>
                            <option value={DeliveryPreference.SHIPPING}>Shipping</option>
                            <option value={DeliveryPreference.IN_PERSON}>In Person</option>
                        </select>
                    </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link (Optional)</label>
                  <div className="relative">
                      <LinkIcon className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                      <input 
                        type="url" 
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-50 outline-none text-sm bg-slate-50 focus:bg-white transition-all" 
                        placeholder="https://amazon.com/..." 
                        value={formData.productUrl} 
                        onChange={(e) => setFormData({...formData, productUrl: e.target.value})}
                        onBlur={handleLinkFetch}
                      />
                      {isLoading && <div className="absolute right-3 top-3.5"><Loader2 className="h-4 w-4 text-cyan-500 animate-spin"/></div>}
                      {!isLoading && formData.productUrl && <div className="absolute right-3 top-3.5"><DownloadCloud className="h-4 w-4 text-slate-400 cursor-pointer hover:text-cyan-500" onClick={handleLinkFetch} title="Fetch Info" /></div>}
                  </div>
                  {linkDescription && <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1"><Sparkles className="h-3 w-3"/> Link data fetched successfully</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason / Context</label>
                  <textarea className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-50 outline-none h-32 text-sm bg-slate-50 focus:bg-white transition-all" placeholder="Why do you need this item? Tell your story..." value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} />
                </div>
                
                {!uploadedImage && formData.title && !formData.productUrl && (
                    <button type="button" onClick={handleGenerateImage} disabled={isGeneratingImage} className="text-xs text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-indigo-50 w-fit">
                        <Wand2 className="h-3 w-3" /> Generate Visualization with AI
                    </button>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Your Location</label>
                  <div className="flex gap-2">
                      <div className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          {locationName}
                      </div>
                      <Button variant="outline" onClick={handleDetectLocation} isLoading={isLocating} className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"><Crosshair className="h-4 w-4" /></Button>
                  </div>
                </div>

                {error && <div className="text-red-600 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>}

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="ghost" onClick={onCancel} className="rounded-xl">Cancel</Button>
                  <Button onClick={handleEnrichment} isLoading={isLoading} className="rounded-xl shadow-lg shadow-cyan-500/25">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex gap-4 items-center">
               <img src={uploadedImage || `https://picsum.photos/100`} className="w-16 h-16 object-cover rounded-xl shadow-sm" alt="Preview" onError={(e) => (e.target as HTMLImageElement).src = 'https://picsum.photos/100'} />
               <div>
                 <h3 className="font-bold text-slate-900">{formData.title}</h3>
                 <div className="text-xs text-slate-500 mt-1 font-medium">{formData.category} • {formData.deliveryPreference}</div>
               </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Private Shipping Info</label>
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-xs text-yellow-800 mb-2">
                  This info is encrypted and only shared with the person who fulfills your request.
              </div>
              <textarea className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-50 outline-none h-24 text-sm bg-slate-50 focus:bg-white transition-all" placeholder="Full Address or preferred meetup spot..." value={formData.shippingAddress} onChange={(e) => setFormData({...formData, shippingAddress: e.target.value})} required />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" type="button" onClick={() => setStep(1)} className="rounded-xl"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
              <Button type="submit" variant="primary" className="rounded-xl shadow-lg shadow-cyan-500/25">Post Request</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
