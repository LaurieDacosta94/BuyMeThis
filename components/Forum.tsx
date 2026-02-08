import React, { useState } from 'react';
import { ForumThread, ForumReply, ForumCategory, User } from '../types';
import { Button } from './Button';
import { MessageSquare, ArrowLeft, PlusCircle, Sparkles, FileText, CornerDownRight, Hash, AlertTriangle, Lock } from 'lucide-react';
import { summarizeForumThread, validateContent } from '../services/geminiService';

interface ForumProps { currentUser: User | null; users: Record<string, User>; threads: ForumThread[]; onAddThread: (thread: ForumThread) => void; onAddReply: (reply: ForumReply) => void; onRequireAuth: () => void; }

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

  const handleSelectThread = (thread: ForumThread) => { setSelectedThread(thread); setActiveView('detail'); setAiSummary(null); };
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
      <div className="max-w-4xl mx-auto border border-slate-200 bg-white">
        <div className="bg-slate-900 text-white px-6 py-4 font-bold text-sm uppercase flex justify-between items-center">
             <span>New Transmission</span>
             <button onClick={() => setActiveView('list')} className="text-slate-400 hover:text-white flex items-center gap-1 uppercase text-xs"><ArrowLeft className="h-3 w-3" /> Cancel</button>
        </div>
        <form onSubmit={handleCreateSubmit} className="p-8 space-y-4">
            <input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-none focus:border-blue-600 outline-none font-bold" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required placeholder="Subject Line" />
            <select className="w-full px-4 py-2 border border-slate-300 rounded-none focus:border-blue-600 outline-none bg-white" value={newCategory} onChange={(e) => setNewCategory(e.target.value as ForumCategory)}>
                {Object.values(ForumCategory).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <textarea className="w-full px-4 py-2 border border-slate-300 rounded-none focus:border-blue-600 outline-none h-64 font-mono text-sm" value={newContent} onChange={(e) => setNewContent(e.target.value)} required placeholder="Body text..." />
            {error && <div className="bg-red-50 text-red-600 p-2 text-xs font-mono border border-red-200">{error}</div>}
            <div className="flex justify-end"><Button type="submit" isLoading={isSubmitting} className="uppercase">Transmit</Button></div>
        </form>
      </div>
    );
  }

  if (activeView === 'detail' && selectedThread) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-4"><button onClick={() => setActiveView('list')} className="text-blue-600 font-bold text-xs uppercase flex items-center gap-1 hover:underline"><ArrowLeft className="h-3 w-3" /> Back to Index</button></div>
        <div className="border border-slate-200 bg-white mb-6">
            <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{selectedThread.title}</h2>
                <div className="text-xs font-mono text-slate-500 mt-1">{selectedThread.category} // {formatDate(selectedThread.createdAt)}</div>
            </div>
            {(selectedThread.content.length > 500 || selectedThread.replies.length > 3) && (
              <div className="bg-slate-50 p-4 border-b border-slate-200 text-xs font-mono text-slate-600">
                 {!aiSummary ? <button onClick={generateSummary} disabled={isSummarizing} className="text-blue-600 hover:underline font-bold">[ GENERATE AI SUMMARY ]</button> : <p>{aiSummary}</p>}
              </div>
            )}
            <div className="p-6 prose prose-slate max-w-none font-sans text-sm">{selectedThread.content}</div>
        </div>
        {selectedThread.replies.map((reply, index) => (
            <div key={reply.id} className="ml-8 border-l-2 border-slate-200 pl-4 mb-4">
                <div className="bg-white border border-slate-200 p-4">
                     <div className="flex justify-between text-xs font-mono text-slate-400 mb-2"><span>{users[reply.authorId]?.displayName || 'Unknown'}</span><span>{formatDate(reply.createdAt)}</span></div>
                     <div className="text-sm text-slate-800">{reply.content}</div>
                </div>
            </div>
        ))}
        <div className="mt-8 border border-slate-200 bg-white p-4">
            <h4 className="text-xs font-bold uppercase mb-2">Append Reply</h4>
            <form onSubmit={handleReplySubmit}><textarea className="w-full border border-slate-300 p-2 font-mono text-sm h-32 focus:border-blue-600 outline-none rounded-none" value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder="Type here..." disabled={!currentUser} /><div className="mt-2 flex justify-end"><Button type="submit" disabled={!replyContent.trim()} className="uppercase">Post</Button></div></form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
       <div className="flex justify-between items-end mb-6">
         <div>
            <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-widest">Comm Link</h1>
            <div className="flex gap-2 mt-2">
                <button onClick={() => setCategoryFilter('All')} className={`px-3 py-1 text-xs font-bold uppercase border ${categoryFilter === 'All' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-300'}`}>All</button>
                {Object.values(ForumCategory).map(cat => <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-3 py-1 text-xs font-bold uppercase border ${categoryFilter === cat ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-300'}`}>{cat}</button>)}
            </div>
         </div>
         <Button onClick={handleStartThreadClick} className="uppercase"><PlusCircle className="h-4 w-4 mr-2" /> New Thread</Button>
       </div>

       <div className="border border-slate-200 bg-white">
           <div className="grid grid-cols-12 bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider py-3 px-4 border-b border-slate-200">
               <div className="col-span-8">Topic</div>
               <div className="col-span-2 text-center">Replies</div>
               <div className="col-span-2 text-right">Updated</div>
           </div>
           <div className="divide-y divide-slate-100">
               {threads.filter(t => categoryFilter === 'All' || t.category === categoryFilter).map((thread) => (
                   <div key={thread.id} className="grid grid-cols-12 py-3 px-4 items-center hover:bg-slate-50 cursor-pointer group transition-colors" onClick={() => handleSelectThread(thread)}>
                       <div className="col-span-8">
                           <div className="font-bold text-slate-800 text-sm group-hover:text-blue-600 truncate">{thread.title}</div>
                           <div className="text-[10px] text-slate-400 font-mono uppercase">{thread.category}</div>
                       </div>
                       <div className="col-span-2 text-center text-xs font-mono">{thread.replies.length}</div>
                       <div className="col-span-2 text-right text-xs font-mono text-slate-400">{formatDate(thread.createdAt)}</div>
                   </div>
               ))}
           </div>
       </div>
    </div>
  );
};