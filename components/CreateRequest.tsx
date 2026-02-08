import React, { useState, useRef } from 'react';
import { Button } from './Button';
import { enrichRequestData, validateContent, analyzeImageForRequest, analyzeAudioForRequest, generateRequestImage } from '../services/geminiService';
import { RequestItem, RequestStatus, User, Coordinates, Category } from '../types';
import { Sparkles, Link as LinkIcon, AlertCircle, Crosshair, ShieldAlert, Camera, Upload, X, Mic, Square, Wand2 } from 'lucide-react';

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
    category: Category.OTHER
  });
  
  const [coordinates, setCoordinates] = useState<Coordinates | undefined>(currentUser.coordinates);
  const [isLocating, setIsLocating] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Audio Recording State
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
          setError(null);
          
          try {
              const result = await analyzeImageForRequest(base64);
              setFormData(prev => ({
                  ...prev,
                  title: result.title || prev.title,
                  reason: result.reason || prev.reason,
                  category: (Object.values(Category).includes(result.category as Category) ? result.category as Category : Category.OTHER)
              }));
          } catch (err) {
              console.error(err);
              setError("Could not analyze image automatically. Please fill in details manually.");
          } finally {
              setIsAnalyzingImage(false);
          }
      };
      reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    setError(null);
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
            // Stop tracks
            stream.getTracks().forEach(track => track.stop());
            
            // Process audio
            setIsAnalyzingImage(true); // Re-use loading state
            try {
                 const reader = new FileReader();
                 reader.readAsDataURL(audioBlob);
                 reader.onloadend = async () => {
                     const base64Audio = reader.result as string;
                     const result = await analyzeAudioForRequest(base64Audio);
                     setFormData(prev => ({
                        ...prev,
                        title: result.title || prev.title,
                        reason: result.reason || prev.reason,
                        category: (Object.values(Category).includes(result.category as Category) ? result.category as Category : Category.OTHER)
                    }));
                    setIsAnalyzingImage(false);
                 };
            } catch (err) {
                setError("Failed to analyze audio.");
                setIsAnalyzingImage(false);
            }
        };

        mediaRecorder.start();
        setIsRecording(true);
    } catch (err) {
        setError("Could not access microphone.");
    }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  const handleGenerateImage = async () => {
      if (!formData.title) {
          setError("Please enter a title to generate an image.");
          return;
      }
      setIsGeneratingImage(true);
      setError(null);
      try {
          const base64 = await generateRequestImage(formData.title, formData.category);
          if (base64) {
              setUploadedImage(base64);
          } else {
              setError("Could not generate image. Please try again or upload one.");
          }
      } catch (err) {
          setError("Failed to generate image.");
      } finally {
          setIsGeneratingImage(false);
      }
  };

  const handleEnrichment = async () => {
    // If we have an uploaded image, we might not have a URL, which is fine.
    if (!formData.title && !formData.reason) {
      setError("Please provide at least a Title and Reason.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      // Step 1: Validate Content Safety
      const safetyCheck = await validateContent(formData.title + " " + formData.reason);
      if (!safetyCheck.safe) {
        throw new Error(`Safety Check Failed: ${safetyCheck.reason || "Content flagged as inappropriate."}`);
      }

      // Step 2: Simulate extracting data from URL if present
      let enriched: { title: string; price: number; description: string; category: Category } = { 
          title: formData.title, 
          price: 0, 
          description: "User requested item", 
          category: formData.category 
      };
      
      if (formData.productUrl) {
          const result = await enrichRequestData(formData.productUrl, formData.title, formData.reason);
          // Cast the string category from result to Category enum, defaulting to OTHER if invalid
          const validCategory = Object.values(Category).includes(result.category as Category)
             ? (result.category as Category)
             : Category.OTHER;
          
          enriched = { ...result, category: validCategory };
      }
      
      // Auto-update title if it was empty, otherwise keep user's
      setFormData(prev => ({
        ...prev,
        title: prev.title || enriched.title
      }));
      
      setStep(2); // Move to review/address step
    } catch (err: any) {
      setError(err.message || "Failed to process request.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLocating(false);
      },
      (error) => {
        console.error("Error getting location", error);
        setError("Unable to retrieve your location");
        setIsLocating(false);
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.shippingAddress || !formData.title) return;

    // Use a placeholder if no image
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
      createdAt: new Date().toISOString(),
      location: currentUser.location, // Default to user profile location string
      coordinates: coordinates, // Use detected coords
      enrichedData: {
        title: formData.title,
        price: 0, 
        description: "User requested item",
        imageUrl: finalImage
      },
      comments: [],
      candidates: []
    };

    onSubmit(newRequest);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900">Create a Request</h2>
        <p className="text-sm text-slate-500">Ask the community for help with what you need.</p>
      </div>

      <div className="p-6">
        {step === 1 && (
          <div className="space-y-6">
            
            {/* Magic Auto-fill Section */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center relative z-10 gap-4">
                    <div>
                        <h3 className="font-semibold text-indigo-900 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-600" /> Magic Auto-fill
                        </h3>
                        <p className="text-xs text-indigo-700 mt-1 max-w-xs">
                            Use AI to fill out the form by uploading a photo or speaking your request.
                        </p>
                    </div>
                    <div className="flex gap-2">
                         {/* Voice Input */}
                         {isRecording ? (
                            <button
                                onClick={stopRecording}
                                className="bg-red-500 text-white border border-red-600 hover:bg-red-600 px-3 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 transition-all animate-pulse"
                            >
                                <Square className="h-4 w-4 fill-current" /> Stop
                            </button>
                         ) : (
                            <button
                                onClick={startRecording}
                                disabled={isAnalyzingImage || isGeneratingImage}
                                className="bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 px-3 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
                            >
                                <Mic className="h-4 w-4" /> Speak
                            </button>
                         )}

                         {/* Image Input */}
                         <input 
                            type="file" 
                            id="magic-upload" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={isRecording || isGeneratingImage}
                        />
                         <label 
                            htmlFor="magic-upload" 
                            className={`cursor-pointer bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 px-3 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 transition-all ${isRecording || isAnalyzingImage || isGeneratingImage ? 'opacity-50 pointer-events-none' : ''}`}
                         >
                            <Camera className="h-4 w-4" /> Photo
                        </label>
                    </div>
                </div>

                {(isAnalyzingImage || isGeneratingImage) && !isRecording && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-indigo-600 font-medium">
                        <div className="h-3 w-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        {isGeneratingImage ? 'Generating image...' : 'Analyzing media...'}
                    </div>
                )}

                {uploadedImage && (
                    <div className="mt-3 relative inline-block">
                        <img src={uploadedImage} alt="Uploaded" className="h-20 w-20 object-cover rounded-lg border border-white shadow-sm" />
                        <button 
                            onClick={() => { setUploadedImage(null); setFormData(prev => ({...prev, title: '', reason: ''})); }}
                            className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 shadow-sm"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product Link (Optional)</label>
                <div className="relative">
                    <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                    type="url"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="https://amazon.com/..."
                    value={formData.productUrl}
                    onChange={(e) => setFormData({...formData, productUrl: e.target.value})}
                    />
                </div>
                </div>

                <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">What do you need?</label>
                <input
                    type="text"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Organic Chemistry Textbook"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
                </div>
                
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value as Category})}
                >
                    {Object.values(Category).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
                </div>

                <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Why do you need it?</label>
                <textarea
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-32"
                    placeholder="Tell your story. Context helps build trust."
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                />
                </div>
                
                {/* Image Generation Option */}
                {!uploadedImage && formData.title && (
                    <div className="flex justify-end">
                        <button 
                            type="button" 
                            onClick={handleGenerateImage} 
                            disabled={isGeneratingImage}
                            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100"
                        >
                            <Wand2 className="h-3 w-3" />
                            No photo? Generate one with AI
                        </button>
                    </div>
                )}

                {/* Location Tagging */}
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location Tag</label>
                <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500 text-sm">
                    {coordinates ? (
                        <span className="text-green-600 flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> 
                        Using GPS Coordinates ({coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)})
                        </span>
                    ) : (
                        <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> {currentUser.location} (Default)
                        </span>
                    )}
                    </div>
                    <Button 
                    variant="outline" 
                    onClick={handleDetectLocation} 
                    isLoading={isLocating}
                    title="Update to current location"
                    >
                    <Crosshair className="h-4 w-4" />
                    </Button>
                </div>
                </div>

                {error && (
                <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                    <ShieldAlert className="h-5 w-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleEnrichment} isLoading={isLoading}>
                    Next <Sparkles className="ml-2 h-4 w-4" />
                </Button>
                </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-indigo-50 p-4 rounded-lg flex gap-4 items-start">
               {uploadedImage ? (
                   <img src={uploadedImage} className="w-16 h-16 rounded-md object-cover" alt="Preview" />
               ) : (
                   <img src={`https://picsum.photos/seed/${Date.now()}/100/100`} className="w-16 h-16 rounded-md object-cover" alt="Preview" />
               )}
               <div>
                 <h3 className="font-semibold text-indigo-900">{formData.title}</h3>
                 <p className="text-sm text-indigo-700 line-clamp-2">{formData.reason}</p>
                 {formData.productUrl && (
                    <a href={formData.productUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline mt-1 block">
                    {formData.productUrl.substring(0, 30)}...
                    </a>
                 )}
               </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Shipping Address</label>
              <p className="text-xs text-slate-500 mb-2">
                This is encrypted and only shown to the person who commits to buying this item for you.
              </p>
              <textarea
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-24 font-mono text-sm"
                placeholder="Full Name&#10;Street Address&#10;City, State, Zip"
                value={formData.shippingAddress}
                onChange={(e) => setFormData({...formData, shippingAddress: e.target.value})}
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" type="button" onClick={() => setStep(1)}>Back</Button>
              <Button type="submit" variant="primary">Post Request</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// Internal MapPin icon since I didn't import it in component props but used it in render
function MapPin({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}