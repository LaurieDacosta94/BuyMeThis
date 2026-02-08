import React, { useState } from 'react';
import { Button } from './Button';
import { generateThankYouMessage, draftSuccessStoryThread } from '../services/geminiService';
import { X, Sparkles, Heart, Share2, Loader2 } from 'lucide-react';

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
      // Fallback
      setMessage("Thank you so much! This really helps.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
      if (!message.trim()) return;
      setIsSubmitting(true);
      
      let forumPostData = undefined;
      
      if (shareToForum) {
          try {
             forumPostData = await draftSuccessStoryThread(itemTitle, donorName || 'Anonymous', originalReason, message);
          } catch (e) {
             console.error("Failed to draft forum post", e);
             // Proceed without forum post rather than failing completely
          }
      }
      
      try {
        await onSubmit(message, forumPostData);
      } catch (e) {
        console.error("Submit failed", e);
        // Try to close at least
      } finally {
        setIsSubmitting(false);
        onClose();
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>

        <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-6 text-white text-center">
          <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
             <Heart className="h-6 w-6 text-white fill-current" />
          </div>
          <h3 className="text-xl font-bold">Say Thank You!</h3>
          <p className="text-pink-100 text-sm mt-1">
            You received your item. Send a note to show your appreciation.
          </p>
        </div>

        <div className="p-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Your Message</label>
          <div className="relative mb-4">
            <textarea
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[120px]"
              placeholder="Write something nice..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="absolute bottom-3 right-3 text-xs bg-pink-50 text-pink-600 hover:bg-pink-100 px-2 py-1 rounded-md flex items-center gap-1 transition-colors border border-pink-200"
              title="Draft with AI"
            >
              {isGenerating ? 'Writing...' : (
                <><Sparkles className="h-3 w-3" /> Draft with AI</>
              )}
            </button>
          </div>
          
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-start gap-3 mb-6 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setShareToForum(!shareToForum)}>
              <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${shareToForum ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                  {shareToForum && <Sparkles className="h-3 w-3 text-white" />}
              </div>
              <div>
                  <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                     Share as "Success Story" <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full">AI Auto-Post</span>
                  </p>
                  <p className="text-xs text-slate-500 leading-tight mt-0.5">
                      Automatically post a heartwarming story to the Community Forum to inspire others.
                  </p>
              </div>
          </div>

          <div className="flex gap-3">
             <Button variant="ghost" onClick={onClose} className="flex-1">
               Skip
             </Button>
             <Button 
               variant="primary" 
               onClick={handleSubmit}
               disabled={!message.trim() || isSubmitting}
               className="flex-[2] bg-pink-600 hover:bg-pink-700 focus:ring-pink-500"
             >
               {isSubmitting ? (
                   <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {shareToForum ? 'Posting...' : 'Sending...'}</>
               ) : (
                   'Send Thanks'
               )}
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
};