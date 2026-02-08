import React, { useState } from 'react';
import { ForumThread, ForumReply, ForumCategory, User } from '../types';
import { Button } from './Button';
import { MessageSquare, ArrowLeft, PlusCircle, Sparkles, FileText, CornerDownRight, Hash, AlertTriangle, Lock } from 'lucide-react';
import { summarizeForumThread, validateContent } from '../services/geminiService';

interface ForumProps {
  currentUser: User | null;
  users: Record<string, User>;
  threads: ForumThread[];
  onAddThread: (thread: ForumThread) => void;
  onAddReply: (reply: ForumReply) => void;
  onRequireAuth: () => void;
}

export const Forum: React.FC<ForumProps> = ({ currentUser, users, threads, onAddThread, onAddReply, onRequireAuth }) => {
  const [activeView, setActiveView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<ForumCategory | 'All'>('All');
  
  // New Thread State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<ForumCategory>(ForumCategory.GENERAL);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail View State
  const [replyContent, setReplyContent] = useState('');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const handleSelectThread = (thread: ForumThread) => {
    setSelectedThread(thread);
    setActiveView('detail');
    setAiSummary(null); // Reset summary
  };

  const handleStartThreadClick = () => {
      if (!currentUser) {
          onRequireAuth();
          return;
      }
      setActiveView('create');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!newTitle.trim() || !newContent.trim()) return;
    
    setIsSubmitting(true);
    setError(null);

    // AI Safety Check
    try {
        const safety = await validateContent(newTitle + " " + newContent);
        if (!safety.safe) {
            setError(safety.reason || "Content flagged as inappropriate by AI moderation.");
            setIsSubmitting(false);
            return;
        }
    } catch (e) {
        // Continue if AI check fails
    }

    const thread: ForumThread = {
      id: `th_${Date.now()}`,
      authorId: currentUser.id,
      title: newTitle,
      content: newContent,
      category: newCategory,
      createdAt: new Date().toISOString(),
      replies: [],
      views: 0,
      likes: []
    };

    onAddThread(thread);
    setNewTitle('');
    setNewContent('');
    setIsSubmitting(false);
    setActiveView('list');
  };

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
        onRequireAuth();
        return;
    }
    if (!replyContent.trim() || !selectedThread) return;

    const reply: ForumReply = {
      id: `rp_${Date.now()}`,
      threadId: selectedThread.id,
      authorId: currentUser.id,
      content: replyContent,
      createdAt: new Date().toISOString()
    };

    onAddReply(reply);
    // Optimistically update local state for immediate feedback
    setSelectedThread({
      ...selectedThread,
      replies: [...selectedThread.replies, reply]
    });
    setReplyContent('');
  };

  const generateSummary = async () => {
    if (!selectedThread) return;
    setIsSummarizing(true);
    
    // Prepare data for AI
    const replyData = selectedThread.replies.map(r => ({
      authorName: users[r.authorId]?.displayName || 'Unknown',
      content: r.content
    }));

    try {
      const summary = await summarizeForumThread(selectedThread.title, selectedThread.content, replyData);
      setAiSummary(summary);
    } catch (e) {
      setAiSummary("Failed to generate summary.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getLastPostInfo = (thread: ForumThread) => {
    if (thread.replies.length === 0) {
        return { date: thread.createdAt, authorId: thread.authorId };
    }
    const lastReply = thread.replies[thread.replies.length - 1];
    return { date: lastReply.createdAt, authorId: lastReply.authorId };
  };

  const renderPostBit = (authorId: string, content: string, date: string, postIndex: number, isReply: boolean = false) => {
      const author = users[authorId] || { 
          id: 'unknown',
          displayName: 'Unknown', 
          handle: 'unknown', 
          avatarUrl: 'https://via.placeholder.com/50', 
          location: 'Unknown', 
          badges: [], 
          trustScore: 0,
          bio: '',
          projects: [],
          hobbies: []
      };

      return (
          <div className="border border-indigo-200 mb-4 bg-white shadow-sm rounded-lg overflow-hidden">
             {/* Post Header */}
             <div className="bg-slate-100 px-4 py-2 text-xs font-bold flex justify-between items-center text-slate-600 border-b border-indigo-100">
                 <span>{formatDate(date)}</span>
                 <span className="flex items-center gap-1 opacity-80">
                    <Hash className="h-3 w-3" />
                    {isReply ? postIndex : 'OP'}
                 </span>
             </div>

             <div className="flex flex-col md:flex-row">
                 {/* User Info Column (Left) */}
                 <div className="w-full md:w-48 bg-slate-50 border-b md:border-b-0 md:border-r border-indigo-50 p-6 flex flex-col items-center text-center shrink-0">
                     <img src={author.avatarUrl} alt="" className="w-16 h-16 rounded-full border-2 border-white shadow-sm mb-3 object-cover" />
                     <p className="font-bold text-indigo-900 text-sm mb-1">{author.displayName}</p>
                     <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wide font-semibold">{author.trustScore > 80 ? 'Veteran' : 'Member'}</p>
                     
                     
                     <div className="text-[10px] text-slate-500 w-full space-y-1 mt-2 text-center">
                        <div>{author.location}</div>
                        <div className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full inline-block">{author.trustScore} Trust</div>
                     </div>
                 </div>

                 {/* Post Content Column (Right) */}
                 <div className="flex-1 p-6 min-h-[150px] flex flex-col">
                     <div className="prose prose-sm max-w-none text-slate-800 flex-1 whitespace-pre-wrap font-sans leading-relaxed">
                         {content}
                     </div>
                     
                     {/* Post Footer / Signature */}
                     {author.bio && (
                        <div className="mt-8 pt-4 border-t border-slate-100 text-xs text-slate-400 italic">
                             "{author.bio.substring(0, 100)}..."
                        </div>
                     )}
                 </div>
             </div>
          </div>
      );
  };

  if (activeView === 'create') {
    return (
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2">
        <div className="bg-indigo-600 text-white px-6 py-4 rounded-t-xl font-bold text-lg flex justify-between items-center shadow-lg">
             <span>Post New Thread</span>
             <button onClick={() => setActiveView('list')} className="text-white/80 hover:text-white text-sm flex items-center gap-1 transition-colors">
                 <ArrowLeft className="h-4 w-4" /> Cancel
             </button>
        </div>
        <div className="bg-white border border-t-0 border-indigo-100 p-8 rounded-b-xl shadow-sm">
          <form onSubmit={handleCreateSubmit} className="space-y-6 max-w-2xl mx-auto">
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg text-sm text-amber-800 mb-6 flex gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
                <div>
                    <strong>Forum Rules:</strong> Be kind, be helpful, and keep it relevant to donations and community support.
                </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Thread Title</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none transition-all"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                placeholder="What's on your mind?"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Category</label>
              <select 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none transition-all"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ForumCategory)}
              >
                {Object.values(ForumCategory).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Message</label>
              <textarea 
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm h-64 outline-none transition-all"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                required
                placeholder="Share your story or ask a question..."
              />
            </div>
            
            {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                    <AlertTriangle className="h-4 w-4" /> {error}
                </div>
            )}

            <div className="flex justify-end pt-4">
              <Button type="submit" isLoading={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-indigo-500/20">Submit New Thread</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (activeView === 'detail' && selectedThread) {
    return (
      <div className="max-w-5xl mx-auto animate-in fade-in">
        {/* Breadcrumb / Nav */}
        <div className="flex items-center gap-2 text-sm mb-6">
            <button onClick={() => setActiveView('list')} className="text-indigo-600 hover:underline font-bold flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Back to Forum
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500 font-medium">{selectedThread.category}</span>
        </div>

        {/* Thread Title Header */}
        <div className="bg-white px-6 py-4 rounded-t-xl border border-slate-200 border-b-0 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">{selectedThread.title}</h2>
        </div>

        <div className="bg-slate-50/50 p-4 border border-slate-200 rounded-b-xl mb-6">
            
            {/* AI Summary Block */}
            {(selectedThread.content.length > 500 || selectedThread.replies.length > 3) && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 p-4 rounded-lg mb-6 shadow-sm">
                 <div className="flex items-center justify-between mb-2">
                     <span className="text-xs font-bold text-amber-700 uppercase flex items-center gap-2 tracking-wide">
                        <Sparkles className="h-4 w-4" /> AI Summary
                     </span>
                     {!aiSummary && (
                        <button 
                            onClick={generateSummary} 
                            disabled={isSummarizing}
                            className="text-xs bg-white border border-amber-200 text-amber-800 px-3 py-1 rounded-full font-medium hover:bg-amber-50 transition-colors"
                        >
                            {isSummarizing ? 'Generating...' : 'Summarize Thread'}
                        </button>
                     )}
                 </div>
                 {aiSummary && (
                     <p className="text-sm text-slate-700 leading-relaxed font-medium animate-in fade-in">
                         {aiSummary}
                     </p>
                 )}
              </div>
            )}

            {/* Original Post */}
            {renderPostBit(selectedThread.authorId, selectedThread.content, selectedThread.createdAt, 1, false)}

            {/* Replies */}
            {selectedThread.replies.map((reply, index) => (
                <div key={reply.id} id={reply.id}>
                    {renderPostBit(reply.authorId, reply.content, reply.createdAt, index + 2, true)}
                </div>
            ))}

            {/* Quick Reply Box */}
            <div className="mt-8 bg-white border border-indigo-100 p-6 rounded-xl shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-indigo-600" /> Post a Reply
                </h4>
                <form onSubmit={handleReplySubmit} className="relative">
                    {!currentUser && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg">
                            <button type="button" onClick={onRequireAuth} className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:bg-indigo-700 flex items-center gap-2">
                                <Lock className="h-4 w-4" /> Log in to Reply
                            </button>
                        </div>
                    )}
                    <textarea 
                        className="w-full border border-slate-200 rounded-lg p-4 text-sm h-32 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none mb-3 transition-all"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Join the discussion..."
                        disabled={!currentUser}
                    />
                    <div className="flex justify-end">
                        <Button type="submit" disabled={!replyContent.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow-md">
                            Post Reply
                        </Button>
                    </div>
                </form>
            </div>
        </div>
      </div>
    );
  }

  // List View: Classic Table Style
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in">
       {/* Forum Header / Controls */}
       <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
         <div>
            <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3 mb-2">
                <MessageSquare className="h-8 w-8 text-indigo-600" /> Community Forum
            </h1>
            <p className="text-slate-500 mb-4">Discuss, share stories, and connect with other givers.</p>
            
            <div className="flex flex-wrap gap-2 text-sm">
                <button 
                    onClick={() => setCategoryFilter('All')}
                    className={`px-4 py-1.5 rounded-full font-medium transition-all ${categoryFilter === 'All' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                    All Topics
                </button>
                {Object.values(ForumCategory).map(cat => (
                    <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-4 py-1.5 rounded-full font-medium transition-all ${categoryFilter === cat ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
         </div>
         <Button onClick={handleStartThreadClick} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-transform hover:-translate-y-0.5">
            <PlusCircle className="h-5 w-5" /> New Thread
         </Button>
       </div>

       {/* Forum Table */}
       <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
           {/* Table Header */}
           <div className="grid grid-cols-12 bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider py-4 px-6 border-b border-slate-200">
               <div className="col-span-7">Topic</div>
               <div className="col-span-2 text-center">Stats</div>
               <div className="col-span-3 text-right">Last Post</div>
           </div>

           {/* Table Body */}
           <div className="divide-y divide-slate-100">
               {threads
                   .filter(t => categoryFilter === 'All' || t.category === categoryFilter)
                   .map((thread) => {
                       const author = users[thread.authorId] || { displayName: 'Unknown' };
                       const lastPost = getLastPostInfo(thread);
                       const lastPostAuthor = users[lastPost.authorId]?.displayName || 'Unknown';

                       return (
                           <div 
                               key={thread.id} 
                               className="grid grid-cols-12 py-4 px-6 items-center hover:bg-slate-50/80 cursor-pointer transition-colors group"
                               onClick={() => handleSelectThread(thread)}
                           >
                               {/* Icon & Title */}
                               <div className="col-span-7 flex items-start gap-4">
                                   <div className={`p-2 rounded-lg mt-1 shrink-0 ${thread.replies.length > 5 ? 'bg-orange-100 text-orange-600' : 'bg-indigo-50 text-indigo-500'}`}>
                                       <FileText className="h-5 w-5" />
                                   </div>
                                   <div>
                                       <div className="font-bold text-slate-800 text-base group-hover:text-indigo-600 transition-colors mb-1">
                                           {thread.title}
                                       </div>
                                       <div className="text-xs text-slate-500 flex items-center gap-2">
                                           <span className="bg-slate-100 px-2 py-0.5 rounded-full font-medium">{thread.category}</span>
                                           <span>&bull;</span>
                                           <span>by {author.displayName}</span>
                                       </div>
                                   </div>
                               </div>

                               {/* Stats */}
                               <div className="col-span-2 text-center text-xs text-slate-500 flex flex-col justify-center h-full gap-1">
                                   <div><span className="font-bold text-slate-800 text-sm">{thread.replies.length}</span> Replies</div>
                                   <div>{thread.views} Views</div>
                               </div>

                               {/* Last Post */}
                               <div className="col-span-3 text-xs text-slate-500 text-right">
                                   <div className="font-bold text-slate-700 truncate">{lastPostAuthor}</div>
                                   <div className="text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                                       {formatDate(lastPost.date)}
                                   </div>
                               </div>
                           </div>
                       );
                   })
               }

               {threads.filter(t => categoryFilter === 'All' || t.category === categoryFilter).length === 0 && (
                    <div className="p-12 text-center">
                        <MessageSquare className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No threads found in this category.</p>
                    </div>
               )}
           </div>
       </div>
    </div>
  );
};