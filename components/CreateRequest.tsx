import React, { useState, useRef } from 'react';
import { Button } from './Button';
import { enrichRequestData, validateContent, analyzeImageForRequest, analyzeAudioForRequest, generateRequestImage, getApproximateAddress } from '../services/geminiService';
import { RequestItem, RequestStatus, User, Coordinates, Category, DeliveryPreference } from '../types';
import { Sparkles, Link as LinkIcon, AlertCircle, Crosshair, ShieldAlert, Camera, Upload, X, Mic, Square, Wand2, Truck, Handshake, Globe } from 'lucide-react';

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
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
      } catch (err) { setError("Gen failed."); } finally { setIsGeneratingImage(false); }
  };

  const handleEnrichment = async () => {
    if (!formData.title && !formData.reason) { setError("Title/Reason required."); return; }
    setIsLoading(true);
    setError(null);
    try {
      const safetyCheck = await validateContent(formData.title + " " + formData.reason);
      if (!safetyCheck.safe) throw new Error("Safety check failed.");

      let enriched = { title: formData.title, price: 0, description: "", category: formData.category };
      if (formData.productUrl) {
          const result = await enrichRequestData(formData.productUrl, formData.title, formData.reason);
          enriched = { ...result, category: Object.values(Category).includes(result.category as Category) ? (result.category as Category) : Category.OTHER };
      }
      setFormData(prev => ({ ...prev, title: prev.title || enriched.title }));
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
    const finalImage = uploadedImage || `https://picsum.photos/seed/${Date.now()}/400/300`;
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
      enrichedData: { title: formData.title, price: 0, description: "User requested", imageUrl: finalImage },
      comments: [],
      candidates: []
    };
    onSubmit(newRequest);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white border border-slate-200 shadow-sm">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">New Request Protocol</h2>
      </div>

      <div className="p-6">
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-blue-700 text-sm uppercase flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI Auto-Fill</h3>
                    <div className="flex gap-2">
                         {isRecording ? (
                            <button onClick={stopRecording} className="bg-red-600 text-white px-3 py-1 text-xs font-bold uppercase animate-pulse">Stop</button>
                         ) : (
                            <button onClick={startRecording} disabled={isAnalyzingImage} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1 text-xs font-bold uppercase"><Mic className="h-3 w-3 inline mr-1" /> Voice</button>
                         )}
                         <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1 text-xs font-bold uppercase flex items-center gap-1">
                            <Camera className="h-3 w-3" /> Image
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isRecording} />
                        </label>
                    </div>
                </div>
                {(isAnalyzingImage || isGeneratingImage) && <div className="text-xs font-mono text-blue-600">Processing media stream...</div>}
                {uploadedImage && <img src={uploadedImage} alt="Uploaded" className="h-16 w-16 object-cover border border-slate-300 mt-2" />}
            </div>

            <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">External Link</label>
                  <input type="url" className="w-full px-4 py-2 border border-slate-300 rounded-none focus:border-blue-500 outline-none text-sm font-mono" placeholder="https://" value={formData.productUrl} onChange={(e) => setFormData({...formData, productUrl: e.target.value})} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Item Title</label>
                  <input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-none focus:border-blue-500 outline-none text-sm font-bold" placeholder="Item Name" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                        <select className="w-full px-4 py-2 border border-slate-300 rounded-none focus:border-blue-500 outline-none text-sm bg-white" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value as Category})}>
                            {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Logistics</label>
                        <select className="w-full px-4 py-2 border border-slate-300 rounded-none focus:border-blue-500 outline-none text-sm bg-white" value={formData.deliveryPreference} onChange={(e) => setFormData({...formData, deliveryPreference: e.target.value as DeliveryPreference})}>
                            <option value={DeliveryPreference.ANY}>Any Method</option>
                            <option value={DeliveryPreference.SHIPPING}>Shipping</option>
                            <option value={DeliveryPreference.IN_PERSON}>In Person</option>
                        </select>
                    </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason / Context</label>
                  <textarea className="w-full px-4 py-2 border border-slate-300 rounded-none focus:border-blue-500 outline-none h-32 text-sm" placeholder="Explanation required." value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} />
                </div>
                
                {!uploadedImage && formData.title && (
                    <button type="button" onClick={handleGenerateImage} disabled={isGeneratingImage} className="text-xs text-blue-600 font-bold uppercase hover:underline flex items-center gap-1">
                        <Wand2 className="h-3 w-3" /> Generate Visualization
                    </button>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Geo-Tag</label>
                  <div className="flex gap-2">
                      <div className="flex-1 px-3 py-2 border border-slate-200 bg-slate-50 text-sm font-mono truncate">{locationName}</div>
                      <Button variant="outline" onClick={handleDetectLocation} isLoading={isLocating}><Crosshair className="h-4 w-4" /></Button>
                  </div>
                </div>

                {error && <div className="text-red-600 text-xs font-bold bg-red-50 p-2 border border-red-200 flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> {error}</div>}

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="ghost" onClick={onCancel} className="uppercase">Cancel</Button>
                  <Button onClick={handleEnrichment} isLoading={isLoading} className="uppercase">Next Step <Sparkles className="ml-2 h-3 w-3" /></Button>
                </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-slate-50 p-4 border border-slate-200 flex gap-4">
               <img src={uploadedImage || `https://picsum.photos/100`} className="w-16 h-16 object-cover border border-slate-300" alt="Preview" />
               <div>
                 <h3 className="font-bold text-slate-900">{formData.title}</h3>
                 <div className="text-xs text-slate-500 mt-1 uppercase font-bold">{formData.category} • {formData.deliveryPreference}</div>
               </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Secure Delivery Data</label>
              <textarea className="w-full px-4 py-2 border border-slate-300 rounded-none focus:border-blue-500 outline-none h-24 font-mono text-sm" placeholder="Address or Meetup Coordinates" value={formData.shippingAddress} onChange={(e) => setFormData({...formData, shippingAddress: e.target.value})} required />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" type="button" onClick={() => setStep(1)} className="uppercase">Back</Button>
              <Button type="submit" variant="primary" className="uppercase">Initialize Request</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};