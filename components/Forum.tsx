import React, { useState } from 'react';
import { ForumThread, ForumReply, ForumCategory, User } from '../types';
import { Button } from './Button';
import { MessageSquare, Eye, Clock, ArrowLeft, PlusCircle, Sparkles, Send, FileText, CornerDownRight, Hash, User as UserIcon, AlertTriangle } from 'lucide-react';
import { summarizeForumThread, validateContent } from '../services/geminiService';

interface ForumProps {
  currentUser: User;
  users: Record<string, User>;
  threads: ForumThread[];
  onAddThread: (thread: ForumThread) => void;
  onAddReply: (reply: ForumReply) => void;
}

export const Forum: React.FC<ForumProps> = ({ currentUser, users, threads, onAddThread, onAddReply }) => {
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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        // Continue if AI check fails (fail open or closed depends on policy, here open)
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
          <div className="border border-indigo-200 mb-4 bg-white shadow-sm">
             {/* Post Header */}
             <div className="bg-[#5c7099] text-white px-3 py-1 text-xs font-bold flex justify-between items-center">
                 <span>{formatDate(date)}</span>
                 <span className="flex items-center gap-1 opacity-80">
                    <Hash className="h-3 w-3" />
                    {isReply ? postIndex : 'OP'}
                 </span>
             </div>

             <div className="flex flex-col md:flex-row">
                 {/* User Info Column (Left) */}
                 <div className="w-full md:w-48 bg-[#f5f7fa] border-b md:border-b-0 md:border-r border-indigo-100 p-4 flex flex-col items-center text-center shrink-0">
                     <p className="font-bold text-[#3c5a99] text-sm mb-1 cursor-pointer hover:underline">{author.displayName}</p>
                     <p className="text-[10px] text-slate-500 mb-2">{author.trustScore > 80 ? 'Veteran Member' : 'Member'}</p>
                     
                     <img src={author.avatarUrl} alt="" className="w-20 h-20 border border-slate-300 bg-white p-1 mb-2 object-cover" />
                     
                     <div className="text-[10px] text-slate-600 w-full space-y-1 mt-2 text-left pl-2">
                        <div className="flex justify-between">
                            <span>Join Date:</span> 
                            <span className="font-semibold">2024</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Location:</span> 
                            <span className="font-semibold truncate w-16 text-right">{author.location}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Trust:</span> 
                            <span className="font-semibold">{author.trustScore}</span>
                        </div>
                     </div>
                 </div>

                 {/* Post Content Column (Right) */}
                 <div className="flex-1 p-4 min-h-[150px] flex flex-col">
                     <div className="prose prose-sm max-w-none text-slate-800 flex-1 whitespace-pre-wrap font-sans">
                         {content}
                     </div>
                     
                     {/* Post Footer / Signature */}
                     <div className="mt-8 pt-4 border-t border-slate-100 text-xs text-slate-400 italic">
                         {author.bio ? `"${author.bio.substring(0, 60)}..."` : ''}
                     </div>

                     {/* Action Buttons */}
                     <div className="mt-2 flex justify-end gap-2">
                        <button className="text-xs border border-slate-300 px-2 py-1 rounded bg-slate-50 text-slate-600 hover:bg-white font-medium shadow-sm">
                            Quote
                        </button>
                        <button className="text-xs border border-slate-300 px-2 py-1 rounded bg-slate-50 text-slate-600 hover:bg-white font-medium shadow-sm">
                            Report
                        </button>
                     </div>
                 </div>
             </div>
          </div>
      );
  };

  if (activeView === 'create') {
    return (
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2">
        <div className="bg-[#3c5a99] text-white px-4 py-2 rounded-t-md font-bold text-sm flex justify-between items-center">
             <span>Post New Thread</span>
             <button onClick={() => setActiveView('list')} className="text-white hover:text-indigo-200 text-xs flex items-center gap-1">
                 <ArrowLeft className="h-3 w-3" /> Cancel
             </button>
        </div>
        <div className="bg-[#f0f3fc] border border-[#3c5a99] border-t-0 p-6 rounded-b-md">
          <form onSubmit={handleCreateSubmit} className="space-y-4 max-w-2xl mx-auto">
            <div className="bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-800 mb-4">
                <strong>Forum Rules:</strong> Be kind, be helpful, and keep it relevant to donations and community support.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Thread Title</label>
              <input 
                type="text" 
                className="w-full px-3 py-1.5 border border-slate-400 rounded-sm focus:ring-1 focus:ring-[#3c5a99] text-sm"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Category</label>
              <select 
                className="w-full px-3 py-1.5 border border-slate-400 rounded-sm focus:ring-1 focus:ring-[#3c5a99] text-sm"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ForumCategory)}
              >
                {Object.values(ForumCategory).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Message</label>
              <textarea 
                className="w-full px-3 py-2 border border-slate-400 rounded-sm focus:ring-1 focus:ring-[#3c5a99] text-sm h-48 font-mono"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                required
              />
            </div>
            
            {error && (
                <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 p-2 border border-red-200">
                    <AlertTriangle className="h-4 w-4" /> {error}
                </div>
            )}

            <div className="flex justify-center pt-4">
              <Button type="submit" isLoading={isSubmitting} className="bg-[#3c5a99] hover:bg-[#2c4a89] text-white px-6 rounded-sm font-bold shadow-sm">Submit New Thread</Button>
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
        <div className="flex items-center gap-2 text-xs mb-4">
            <button onClick={() => setActiveView('list')} className="text-[#3c5a99] hover:underline font-bold">
                &laquo; Back to Forum
            </button>
            <span className="text-slate-400">/</span>
            <span className="text-slate-600 font-bold">{selectedThread.category}</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-800">{selectedThread.title}</span>
        </div>

        {/* Thread Title Header */}
        <div className="bg-[#3c5a99] text-white px-4 py-2 rounded-t-md font-bold text-sm shadow-sm flex justify-between items-center">
            <span>{selectedThread.title}</span>
            <span className="text-xs font-normal opacity-80 flex items-center gap-1">
                Started by {users[selectedThread.authorId]?.displayName}
            </span>
        </div>

        <div className="bg-[#dbe3f0] p-2 border-x border-b border-[#3c5a99] mb-6">
            
            {/* AI Summary Block - Styled as System Announcement */}
            {(selectedThread.content.length > 500 || selectedThread.replies.length > 3) && (
              <div className="bg-[#ffffcc] border border-[#dcb35d] p-3 mb-4 mx-1 shadow-sm">
                 <div className="flex items-center justify-between mb-2">
                     <span className="text-xs font-bold text-[#996600] uppercase flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Thread Summary (AI)
                     </span>
                     {!aiSummary && (
                        <button 
                            onClick={generateSummary} 
                            disabled={isSummarizing}
                            className="text-[10px] bg-[#996600] text-white px-2 py-0.5 rounded-sm hover:bg-[#7a5200]"
                        >
                            {isSummarizing ? 'Generating...' : 'Generate TL;DR'}
                        </button>
                     )}
                 </div>
                 {aiSummary && (
                     <p className="text-xs text-slate-800 leading-relaxed font-medium border-t border-[#ebdcb2] pt-2">
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
            <div className="mt-6 bg-[#f0f3fc] border border-[#aebbd6] p-4 rounded-sm">
                <h4 className="text-sm font-bold text-[#3c5a99] mb-2 border-b border-indigo-200 pb-1">Quick Reply</h4>
                <form onSubmit={handleReplySubmit}>
                    <textarea 
                        className="w-full border border-slate-400 p-2 text-sm h-32 focus:ring-1 focus:ring-[#3c5a99] mb-2 font-mono"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Type your reply here..."
                    />
                    <div className="flex justify-end">
                        <Button type="submit" disabled={!replyContent.trim()} className="bg-[#3c5a99] hover:bg-[#2c4a89] text-white text-xs px-4 py-1.5 rounded-sm shadow-sm">
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
       <div className="flex justify-between items-end mb-4">
         <div>
            <h1 className="text-2xl font-bold text-[#3c5a99] flex items-center gap-2">
                <MessageSquare className="h-6 w-6" /> Community Forum
            </h1>
            <div className="flex gap-1 mt-2 text-xs">
                <button 
                    onClick={() => setCategoryFilter('All')}
                    className={`px-3 py-1 border rounded-sm transition-colors ${categoryFilter === 'All' ? 'bg-[#3c5a99] text-white border-[#3c5a99]' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                >
                    All Topics
                </button>
                {Object.values(ForumCategory).map(cat => (
                    <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-3 py-1 border rounded-sm transition-colors ${categoryFilter === cat ? 'bg-[#3c5a99] text-white border-[#3c5a99]' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
         </div>
         <Button onClick={() => setActiveView('create')} className="bg-[#3c5a99] hover:bg-[#2c4a89] text-white text-xs px-4 py-2 rounded-sm shadow-sm border border-[#20345e]">
            <PlusCircle className="mr-1 h-3 w-3" /> New Thread
         </Button>
       </div>

       {/* Forum Table */}
       <div className="border border-[#2c4a89] bg-white shadow-sm">
           {/* Table Header */}
           <div className="grid grid-cols-12 bg-[#3c5a99] text-white text-xs font-bold py-2 px-2">
               <div className="col-span-7 pl-2">Thread / Thread Starter</div>
               <div className="col-span-2 text-center">Replies / Views</div>
               <div className="col-span-3">Last Post</div>
           </div>

           {/* Table Body */}
           <div className="bg-[#f0f3fc]">
               {threads
                   .filter(t => categoryFilter === 'All' || t.category === categoryFilter)
                   .map((thread, idx) => {
                       const author = users[thread.authorId] || { displayName: 'Unknown' };
                       const lastPost = getLastPostInfo(thread);
                       const lastPostAuthor = users[lastPost.authorId]?.displayName || 'Unknown';
                       const isOdd = idx % 2 === 1;

                       return (
                           <div 
                               key={thread.id} 
                               className={`grid grid-cols-12 border-b border-indigo-100 py-2 px-2 items-center hover:bg-[#ffffcc] cursor-pointer transition-colors ${isOdd ? 'bg-[#eef1f9]' : 'bg-white'}`}
                               onClick={() => handleSelectThread(thread)}
                           >
                               {/* Icon & Title */}
                               <div className="col-span-7 pl-2 flex items-start gap-3">
                                   <div className="pt-1">
                                       <FileText className={`h-5 w-5 ${thread.replies.length > 5 ? 'text-orange-500 fill-orange-100' : 'text-blue-400 fill-blue-50'}`} />
                                   </div>
                                   <div>
                                       <div className="font-bold text-[#3c5a99] text-sm hover:underline leading-tight">
                                           {thread.title}
                                       </div>
                                       <div className="text-[10px] text-slate-500 mt-0.5">
                                           {thread.category} &bull; Started by <span className="font-semibold text-slate-700">{author.displayName}</span>
                                       </div>
                                   </div>
                               </div>

                               {/* Stats */}
                               <div className="col-span-2 text-center text-xs text-slate-600 flex flex-col justify-center h-full">
                                   <div><span className="font-bold">{thread.replies.length}</span> Replies</div>
                                   <div className="text-[10px] text-slate-400">{thread.views} Views</div>
                               </div>

                               {/* Last Post */}
                               <div className="col-span-3 text-[10px] text-slate-600 pl-2">
                                   <div className="font-semibold text-[#3c5a99] truncate">{lastPostAuthor}</div>
                                   <div className="text-slate-400 flex items-center gap-1">
                                       <CornerDownRight className="h-2 w-2" />
                                       {formatDate(lastPost.date)}
                                   </div>
                               </div>
                           </div>
                       );
                   })
               }

               {threads.filter(t => categoryFilter === 'All' || t.category === categoryFilter).length === 0 && (
                    <div className="p-8 text-center text-slate-500 italic bg-white">
                        No threads to display in this forum.
                    </div>
               )}
           </div>
       </div>

       {/* Footer Legend */}
       <div className="mt-4 flex gap-4 text-[10px] text-slate-500 justify-center">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-100 border border-orange-500"></div> Hot Thread</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-50 border border-blue-400"></div> New Thread</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-slate-300"></div> No New Posts</div>
       </div>
    </div>
  );
};