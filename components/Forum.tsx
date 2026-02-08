import React, { useState } from 'react';
import { ForumThread, ForumReply, ForumCategory, User } from '../types';
import { Button } from './Button';
import { MessageSquare, ArrowLeft, PlusCircle, Sparkles, User as UserIcon, Shield, MapPin, Hash, Clock, Quote } from 'lucide-react';
import { summarizeForumThread, validateContent } from '../services/geminiService';

interface ForumProps { currentUser: User | null; users: Record<string, User>; threads: ForumThread[]; onAddThread: (thread: ForumThread) => void; onAddReply: (reply: ForumReply) => void; onRequireAuth: () => void; }

const ForumPost: React.FC<{ author: User | undefined; content: string; date: string; title?: string; isOp?: boolean }> = ({ author, content, date, title, isOp }) => {
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

    return (
        <div className={`flex flex-col md:flex-row border border-slate-200 bg-white shadow-sm ${isOp ? 'border-t-4 border-t-indigo-500' : 'mt-4'}`}>
            {/* User Sidebar */}
            <div className="md:w-56 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-6 flex flex-col items-center text-center shrink-0">
                <div className="relative mb-3 group">
                    <img src={author?.avatarUrl || 'https://picsum.photos/100'} className="w-20 h-20 rounded-lg bg-white border-2 border-slate-200 object-cover shadow-sm" alt="Avatar" />
                    {author?.isAdmin && <div className="absolute -top-2 -right-2 bg-purple-600 text-white p-1 rounded-full border-2 border-white shadow-sm" title="Admin"><Shield className="w-3 h-3" /></div>}
                </div>
                <div className="font-bold text-slate-800 text-sm mb-1 truncate w-full">{author?.displayName || 'Unknown User'}</div>
                <div className="text-[10px] text-slate-500 font-mono mb-2 truncate w-full">@{author?.handle || 'unknown'}</div>
                
                <div className="space-y-1 w-full border-t border-slate-200 pt-3 mt-1">
                    {author?.isAdmin && <div className="text-[10px] font-bold text-purple-600 uppercase bg-purple-50 py-0.5 rounded border border-purple-100">Administrator</div>}
                    <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                        <UserIcon className="w-3 h-3" /> Score: {author?.trustScore || 0}
                    </div>
                    {author?.location && (
                         <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1 truncate">
                            <MapPin className="w-3 h-3" /> {author.location}
                        </div>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-h-[200px]">
                {/* Header */}
                <div className="bg-white p-4 border-b border-slate-100 flex justify-between items-center">
                     <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                        <Clock className="w-3 h-3" /> {formatDate(date)}
                        {isOp && <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-indigo-200">Original Post</span>}
                     </div>
                     <div className="text-xs font-bold text-slate-300">#{isOp ? '1' : 'REPLY'}</div>
                </div>

                {/* Body */}
                <div className="p-6 flex-1 text-slate-800 text-sm leading-relaxed prose prose-slate max-w-none">
                    {title && <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">{title}</h2>}
                    <div className="whitespace-pre-wrap font-sans">{content}</div>
                </div>

                {/* Footer Actions */}
                <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                    {/* Placeholder for future actions like Report/Quote */}
                    <button className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 uppercase transition-colors">
                        <Quote className="w-3 h-3" /> Quote
                    </button>
                </div>
            </div>
        </div>
    );
};

export const Forum: React.FC<ForumProps> = ({ currentUser, users, threads, onAddThread, onAddReply, onRequireAuth }) => {
  const [activeView, setActiveView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<ForumCategory | 'All'>('All');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<ForumCategory>(ForumCategory.GENERAL);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const handleSelectThread = (thread: ForumThread) => { setSelectedThread(thread); setActiveView('detail'); setAiSummary(null); window.scrollTo(0,0); };
  const handleStartThreadClick = () => { if (!currentUser) { onRequireAuth(); return; } setActiveView('create'); };
  
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!currentUser || !newTitle.trim()) return;
    setIsSubmitting(true); setError(null);
    try { const safety = await validateContent(newTitle + " " + newContent); if (!safety.safe) { setError("Content flagged."); setIsSubmitting(false); return; } } catch (e) {}
    onAddThread({ id: `th_${Date.now()}`, authorId: currentUser.id, title: newTitle, content: newContent, category: newCategory, createdAt: new Date().toISOString(), replies: [], views: 0, likes: [] });
    setNewTitle(''); setNewContent(''); setIsSubmitting(false); setActiveView('list');
  };

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault(); if (!currentUser) { onRequireAuth(); return; }
    if (!replyContent.trim() || !selectedThread) return;
    const reply = { id: `rp_${Date.now()}`, threadId: selectedThread.id, authorId: currentUser.id, content: replyContent, createdAt: new Date().toISOString() };
    onAddReply(reply); setSelectedThread({ ...selectedThread, replies: [...selectedThread.replies, reply] }); setReplyContent('');
  };

  const generateSummary = async () => {
    if (!selectedThread) return; setIsSummarizing(true);
    try { setAiSummary(await summarizeForumThread(selectedThread.title, selectedThread.content, selectedThread.replies.map(r => ({ authorName: users[r.authorId]?.displayName || 'Unknown', content: r.content })))); } catch (e) { setAiSummary("Failed."); } finally { setIsSummarizing(false); }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  if (activeView === 'create') {
    return (
      <div className="max-w-4xl mx-auto min-h-screen">
        <div className="bg-slate-900 text-white px-6 py-4 font-bold text-sm uppercase flex justify-between items-center rounded-t-xl shadow-lg">
             <span>New Transmission</span>
             <button onClick={() => setActiveView('list')} className="text-slate-400 hover:text-white flex items-center gap-1 uppercase text-xs transition-colors"><ArrowLeft className="h-3 w-3" /> Cancel</button>
        </div>
        <div className="bg-white border-x border-b border-slate-200 shadow-sm p-8 rounded-b-xl">
             <form onSubmit={handleCreateSubmit} className="space-y-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject Line</label>
                    <input type="text" className="w-full px-4 py-3 border border-slate-300 rounded focus:border-indigo-600 outline-none font-bold text-slate-800" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required placeholder="What's on your mind?" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Channel</label>
                    <select className="w-full px-4 py-3 border border-slate-300 rounded focus:border-indigo-600 outline-none bg-white text-sm" value={newCategory} onChange={(e) => setNewCategory(e.target.value as ForumCategory)}>
                        {Object.values(ForumCategory).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Message Body</label>
                    <textarea className="w-full px-4 py-3 border border-slate-300 rounded focus:border-indigo-600 outline-none h-64 font-mono text-sm leading-relaxed" value={newContent} onChange={(e) => setNewContent(e.target.value)} required placeholder="Type your message here..." />
                </div>
                {error && <div className="bg-red-50 text-red-600 p-3 text-xs font-mono border border-red-200 rounded">{error}</div>}
                <div className="flex justify-end border-t border-slate-100 pt-6"><Button type="submit" isLoading={isSubmitting} className="uppercase px-8">Transmit</Button></div>
             </form>
        </div>
      </div>
    );
  }

  if (activeView === 'detail' && selectedThread) {
    return (
      <div className="max-w-6xl mx-auto min-h-screen pb-12">
        <div className="mb-6 flex items-center justify-between">
             <button onClick={() => setActiveView('list')} className="text-slate-500 font-bold text-xs uppercase flex items-center gap-2 hover:text-indigo-600 transition-colors bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                 <ArrowLeft className="h-4 w-4" /> Return to Index
             </button>
             <div className="text-right">
                 <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">{selectedThread.title}</h1>
                 <div className="text-xs font-mono text-slate-500 mt-1 flex items-center justify-end gap-2">
                    <span className="bg-slate-200 px-2 py-0.5 rounded text-slate-600 uppercase font-bold text-[10px]">{selectedThread.category}</span>
                    <span>//</span>
                    <span>ID: {selectedThread.id}</span>
                 </div>
             </div>
        </div>
        
        {/* AI Summary Section */}
        {(selectedThread.content.length > 500 || selectedThread.replies.length > 3) && (
            <div className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg p-4 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="bg-white p-2 rounded-full shadow-sm text-indigo-500">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-xs font-bold text-indigo-800 uppercase mb-1">AI Synopsis</h4>
                         {!aiSummary ? (
                             <button onClick={generateSummary} disabled={isSummarizing} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline decoration-dotted">
                                 {isSummarizing ? 'Generating summary...' : 'Generate a quick summary of this discussion'}
                             </button>
                         ) : (
                             <p className="text-xs text-slate-700 leading-relaxed font-medium">{aiSummary}</p>
                         )}
                    </div>
                </div>
            </div>
        )}

        {/* OP */}
        <ForumPost 
            author={users[selectedThread.authorId]} 
            title={selectedThread.title} 
            content={selectedThread.content} 
            date={selectedThread.createdAt} 
            isOp={true} 
        />
        
        {/* Replies */}
        <div className="mt-6 space-y-6">
            {selectedThread.replies.map((reply) => (
                <ForumPost 
                    key={reply.id} 
                    author={users[reply.authorId]} 
                    content={reply.content} 
                    date={reply.createdAt} 
                />
            ))}
        </div>

        {/* Reply Box */}
        <div className="mt-8 border border-slate-200 bg-white shadow-sm p-6 rounded-lg">
            <h4 className="text-xs font-bold uppercase mb-4 text-slate-500 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Post a Reply</h4>
            <form onSubmit={handleReplySubmit}>
                <textarea 
                    className="w-full border border-slate-200 bg-slate-50 p-4 font-mono text-sm h-32 focus:border-indigo-600 focus:bg-white outline-none rounded transition-colors" 
                    value={replyContent} 
                    onChange={(e) => setReplyContent(e.target.value)} 
                    placeholder={currentUser ? "Add your voice to the discussion..." : "Please log in to reply."} 
                    disabled={!currentUser} 
                />
                <div className="mt-4 flex justify-end">
                    <Button type="submit" disabled={!replyContent.trim() || !currentUser} className="uppercase px-6">Post Reply</Button>
                </div>
            </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto min-h-screen">
       <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
         <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Comm Link</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Community Uplink // Global Frequency</p>
            <div className="flex flex-wrap gap-2 mt-4">
                <button onClick={() => setCategoryFilter('All')} className={`px-4 py-1.5 text-xs font-bold uppercase rounded-full border transition-all ${categoryFilter === 'All' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>All Frequencies</button>
                {Object.values(ForumCategory).map(cat => <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-4 py-1.5 text-xs font-bold uppercase rounded-full border transition-all ${categoryFilter === cat ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>{cat}</button>)}
            </div>
         </div>
         <Button onClick={handleStartThreadClick} className="uppercase shadow-lg shadow-indigo-500/20"><PlusCircle className="h-4 w-4 mr-2" /> New Transmission</Button>
       </div>

       <div className="bg-white rounded-xl shadow-hard border-2 border-slate-900 overflow-hidden">
           <div className="grid grid-cols-12 bg-slate-900 text-slate-400 text-[10px] font-bold uppercase tracking-widest py-3 px-6 border-b border-slate-900">
               <div className="col-span-8 md:col-span-7">Topic</div>
               <div className="hidden md:block col-span-2 text-center">Stats</div>
               <div className="col-span-4 md:col-span-3 text-right">Last Activity</div>
           </div>
           <div className="divide-y divide-slate-100">
               {threads.filter(t => categoryFilter === 'All' || t.category === categoryFilter).length > 0 ? (
                   threads.filter(t => categoryFilter === 'All' || t.category === categoryFilter).map((thread) => (
                       <div key={thread.id} className="grid grid-cols-12 py-4 px-6 items-center hover:bg-slate-50 cursor-pointer group transition-colors" onClick={() => handleSelectThread(thread)}>
                           <div className="col-span-8 md:col-span-7 pr-4">
                               <div className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors mb-1 line-clamp-1">{thread.title}</div>
                               <div className="flex items-center gap-2">
                                   <span className="text-[10px] font-bold text-white bg-slate-400 px-1.5 rounded uppercase">{thread.category}</span>
                                   <span className="text-[10px] text-slate-400 font-mono">by @{users[thread.authorId]?.handle || 'unknown'}</span>
                               </div>
                           </div>
                           <div className="hidden md:block col-span-2 text-center">
                               <div className="flex flex-col items-center justify-center">
                                   <div className="text-xs font-bold text-slate-700">{thread.replies.length}</div>
                                   <div className="text-[9px] text-slate-400 uppercase">Replies</div>
                               </div>
                           </div>
                           <div className="col-span-4 md:col-span-3 text-right">
                               <div className="text-xs font-bold text-slate-600">{formatDate(thread.createdAt)}</div>
                               <div className="text-[10px] text-slate-400 mt-0.5">
                                   {thread.replies.length > 0 ? 'New Reply' : 'Created'}
                               </div>
                           </div>
                       </div>
                   ))
               ) : (
                   <div className="py-12 text-center text-slate-400 font-mono text-sm">
                       NO_TRANSMISSIONS_FOUND
                   </div>
               )}
           </div>
       </div>
    </div>
  );
};