import React, { useState } from 'react';
import { Button } from './Button';
import { generateThankYouMessage, draftSuccessStoryThread } from '../services/geminiService';
import { X, Sparkles, Heart, Share2, Loader2, MessageSquare } from 'lucide-react';

interface ThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string, forumPostData?: { title: string, content: string }) => void;
  itemTitle: string;
  originalReason?: string;
  donorName?: string;
}

export const ThankYouModal: React.FC<ThankYouModalProps> = ({ 
  isOpen, onClose, onSubmit, itemTitle, originalReason = "Needed an item", donorName 
}) => {
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareToForum, setShareToForum] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generated = await generateThankYouMessage(itemTitle, donorName);
      setMessage(generated);
    } catch (e) {
      setMessage("Thank you so much! This really helps.");
    } finally { setIsGenerating(false); }
  };

  const handleSubmit = async () => {
      if (!message.trim()) return;
      setIsSubmitting(true);
      let forumPostData = undefined;
      if (shareToForum) {
          try {
             forumPostData = await draftSuccessStoryThread(itemTitle, donorName || 'Anonymous', originalReason, message);
          } catch (e) { console.error(e); }
      }
      try { await onSubmit(message, forumPostData); } catch (e) { console.error(e); } finally { setIsSubmitting(false); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-white shadow-hard border-2 border-slate-900 max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* System Bar */}
        <div className="bg-slate-900 text-white px-3 py-2 flex justify-between items-center select-none border-b-2 border-slate-900">
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 bg-pink-500 border border-black"></div>
             <span className="font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-2">GRATITUDE_PROTOCOL</span>
           </div>
           <button onClick={onClose}><X className="h-4 w-4 hover:text-red-400"/></button>
        </div>

        <div className="bg-pink-50 p-6 text-center border-b-2 border-slate-200">
          <div className="bg-white w-12 h-12 flex items-center justify-center mx-auto mb-3 border-2 border-pink-200 shadow-sm">
             <Heart className="h-6 w-6 text-pink-500 fill-current" />
          </div>
          <h3 className="text-xl font-black uppercase tracking-tight text-pink-900">Item Received!</h3>
          <p className="text-pink-700 text-xs mt-1 font-mono">
            Transaction Complete. Initialize appreciation message.
          </p>
        </div>

        <div className="p-6">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2 font-mono">Message_Body</label>
          <div className="relative mb-4">
            <textarea
              className="w-full px-4 py-3 border-2 border-slate-300 focus:border-pink-500 outline-none min-h-[120px] font-mono text-sm"
              placeholder="Enter text..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="absolute bottom-3 right-3 text-[10px] bg-white text-pink-600 hover:bg-pink-50 px-2 py-1 border border-pink-200 flex items-center gap-1 transition-colors uppercase font-bold font-mono"
              title="Draft with AI"
            >
              {isGenerating ? 'PROCESSING...' : (
                <><Sparkles className="h-3 w-3" /> AI_DRAFT</>
              )}
            </button>
          </div>
          
          <div className="bg-slate-50 border-2 border-slate-200 p-3 flex items-start gap-3 mb-6 cursor-pointer hover:bg-white transition-colors" onClick={() => setShareToForum(!shareToForum)}>
              <div className={`mt-0.5 w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 transition-colors ${shareToForum ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-400'}`}>
                  {shareToForum && <Sparkles className="h-3 w-3 text-white" />}
              </div>
              <div>
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-2 uppercase font-mono">
                     Broadcast_Success <span className="bg-indigo-100 text-indigo-700 text-[9px] px-1 border border-indigo-200">AUTO</span>
                  </p>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5 font-mono">
                      Post story to community uplink.
                  </p>
              </div>
          </div>

          <div className="flex gap-3">
             <Button variant="ghost" onClick={onClose} className="flex-1 font-mono uppercase font-bold text-xs">
               SKIP
             </Button>
             <Button 
               variant="primary" 
               onClick={handleSubmit}
               disabled={!message.trim() || isSubmitting}
               className="flex-[2] bg-pink-600 hover:bg-pink-500 shadow-hard-sm font-mono uppercase font-bold text-xs"
             >
               {isSubmitting ? (
                   <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> SENDING...</>
               ) : (
                   'TRANSMIT_THANKS'
               )}
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
};