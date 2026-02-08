import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { RequestCard } from './components/RequestCard';
import { UserProfile } from './components/UserProfile';
import { CreateRequest } from './components/CreateRequest';
import { FulfillmentModal } from './components/FulfillmentModal';
import { ThankYouModal } from './components/ThankYouModal';
import { EditProfileModal } from './components/EditProfileModal';
import { RequestMap } from './components/RequestMap';
import { RecommendedRequests } from './components/RecommendedRequests';
import { Leaderboard } from './components/Leaderboard';
import { Forum } from './components/Forum';
import { ToastContainer, ToastMessage } from './components/Toast';
import { Hero } from './components/Hero';
import { Auth } from './components/Auth';
import { RequestItem, RequestStatus, LocationFilter, User, Notification, Category, ForumThread, ForumCategory, ForumReply } from './types';
import { Filter, Search, Package, Gift, ArrowLeft, Map, List, Loader2 } from 'lucide-react';
import { supabase, base64ToFile, uploadImage } from './services/supabase';
import confetti from 'canvas-confetti';

const App: React.FC = () => {
  // Auth State
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // App State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [requests, setRequests] = useState<RequestItem[]>([]);
  
  // Real Database State for Forum & Notifications
  const [forumThreads, setForumThreads] = useState<ForumThread[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // UI State
  const [currentView, setCurrentView] = useState('feed'); 
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [feedMode, setFeedMode] = useState<'list' | 'map'>('list');
  const [loading, setLoading] = useState(true);
  
  const [activeRequest, setActiveRequest] = useState<RequestItem | null>(null);
  const [isFulfillmentModalOpen, setIsFulfillmentModalOpen] = useState(false);
  const [thankYouModalRequest, setThankYouModalRequest] = useState<RequestItem | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  
  const [categoryFilter, setCategoryFilter] = useState<Category | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [profileTab, setProfileTab] = useState<'requests' | 'commitments'>('requests');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // --- INITIALIZATION ---

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      setAuthLoading(false);
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session && currentUser) {
      fetchRequests();
      fetchAllUsers(); 
      fetchForumThreads();
      fetchNotifications();
      
      // Realtime Subscriptions
      const requestSub = supabase.channel('public:requests').on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, fetchRequests).subscribe();
      const forumSub = supabase.channel('public:forum_threads').on('postgres_changes', { event: '*', schema: 'public', table: 'forum_threads' }, fetchForumThreads).subscribe();
      const replySub = supabase.channel('public:forum_replies').on('postgres_changes', { event: '*', schema: 'public', table: 'forum_replies' }, fetchForumThreads).subscribe();
      const notifSub = supabase.channel('public:notifications').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` }, fetchNotifications).subscribe();

      return () => {
        supabase.removeChannel(requestSub);
        supabase.removeChannel(forumSub);
        supabase.removeChannel(replySub);
        supabase.removeChannel(notifSub);
      };
    }
  }, [session, currentUser]);

  // --- DATA FETCHING ---

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) {
         const user: User = {
            id: data.id,
            displayName: data.display_name,
            handle: data.handle,
            bio: data.bio || '',
            avatarUrl: data.avatar_url,
            location: data.location,
            trustScore: data.trust_score,
            badges: data.badges || [],
            projects: data.projects || [],
            hobbies: data.hobbies || []
         };
         setCurrentUser(user);
         setUsers(prev => ({ ...prev, [user.id]: user }));
      }
    } catch (e) { console.error(e); }
  };

  const fetchAllUsers = async () => {
      const { data } = await supabase.from('profiles').select('*');
      if (data) {
          const userMap: Record<string, User> = {};
          data.forEach((row: any) => {
              userMap[row.id] = {
                id: row.id,
                displayName: row.display_name,
                handle: row.handle,
                bio: row.bio || '',
                avatarUrl: row.avatar_url,
                location: row.location,
                trustScore: row.trust_score,
                badges: row.badges || [],
                projects: row.projects || [],
                hobbies: row.hobbies || []
              };
          });
          setUsers(prev => ({ ...prev, ...userMap }));
      }
  };

  const fetchRequests = async () => {
    try {
      const { data } = await supabase.from('requests').select('*').order('created_at', { ascending: false });
      if (data) {
        setRequests(data.map((row: any) => ({
          id: row.id,
          requesterId: row.requester_id,
          title: row.title,
          reason: row.reason,
          category: row.category,
          status: row.status,
          location: row.location,
          createdAt: row.created_at,
          coordinates: row.coordinates_lat ? { lat: row.coordinates_lat, lng: row.coordinates_lng } : undefined,
          shippingAddress: row.shipping_address,
          fulfillerId: row.fulfiller_id,
          trackingNumber: row.tracking_number,
          proofOfPurchaseImage: row.proof_of_purchase_image,
          giftMessage: row.gift_message,
          thankYouMessage: row.thank_you_message,
          receiptVerificationStatus: row.receipt_verification_status,
          enrichedData: row.enriched_data,
          comments: row.comments || [],
          productUrl: '' 
        })));
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchForumThreads = async () => {
      // Fetch threads and join with replies
      const { data: threads } = await supabase.from('forum_threads').select('*').order('created_at', { ascending: false });
      const { data: replies } = await supabase.from('forum_replies').select('*').order('created_at', { ascending: true });
      
      if (threads) {
          const mappedThreads: ForumThread[] = threads.map((t: any) => ({
              id: t.id,
              authorId: t.author_id,
              title: t.title,
              content: t.content,
              category: t.category,
              createdAt: t.created_at,
              views: t.views,
              likes: t.likes || [],
              replies: replies ? replies.filter((r: any) => r.thread_id === t.id).map((r: any) => ({
                  id: r.id,
                  threadId: r.thread_id,
                  authorId: r.author_id,
                  content: r.content,
                  createdAt: r.created_at
              })) : []
          }));
          setForumThreads(mappedThreads);
      }
  };

  const fetchNotifications = async () => {
      if (!currentUser) return;
      const { data } = await supabase.from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
        
      if (data) {
          setNotifications(data.map((n: any) => ({
              id: n.id,
              userId: n.user_id,
              message: n.message,
              type: n.type,
              isRead: n.is_read,
              createdAt: n.created_at,
              relatedRequestId: n.related_request_id
          })));
      }
  };

  // --- ACTIONS ---

  const showToast = (message: string, type: 'success' | 'error' | 'award' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const createNotification = async (userId: string, message: string, type: 'info' | 'success' | 'alert' = 'info', requestId?: string) => {
      await supabase.from('notifications').insert({
          id: `notif_${Date.now()}_${Math.random()}`,
          user_id: userId,
          message,
          type,
          created_at: new Date().toISOString(),
          related_request_id: requestId,
          is_read: false
      });
  };

  const handleSignOut = async () => {
      await supabase.auth.signOut();
      setSession(null);
      setCurrentUser(null);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    if (!currentUser) return;
    try {
        const { error } = await supabase.from('profiles').update({
            display_name: updatedUser.displayName,
            bio: updatedUser.bio,
            location: updatedUser.location,
            projects: updatedUser.projects,
            hobbies: updatedUser.hobbies
        }).eq('id', currentUser.id);

        if (error) throw error;
        setCurrentUser(updatedUser);
        setUsers(prev => ({ ...prev, [updatedUser.id]: updatedUser }));
        setIsEditProfileOpen(false);
        showToast("Profile updated successfully!");
    } catch (e) { showToast("Failed to update profile", "error"); }
  };

  const handleCreateRequest = async (newRequest: RequestItem) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      let finalImageUrl = newRequest.enrichedData?.imageUrl;
      if (finalImageUrl && finalImageUrl.startsWith('data:image')) {
          const file = base64ToFile(finalImageUrl, `req_${Date.now()}.jpg`);
          const uploadedUrl = await uploadImage(file);
          if (uploadedUrl) finalImageUrl = uploadedUrl;
      }

      const { error } = await supabase.from('requests').insert({
        id: newRequest.id,
        requester_id: currentUser.id,
        title: newRequest.title,
        reason: newRequest.reason,
        category: newRequest.category,
        status: newRequest.status,
        location: newRequest.location,
        created_at: newRequest.createdAt,
        coordinates_lat: newRequest.coordinates?.lat,
        coordinates_lng: newRequest.coordinates?.lng,
        shipping_address: newRequest.shippingAddress,
        enriched_data: { ...newRequest.enrichedData, imageUrl: finalImageUrl }
      });
      
      if (error) throw error;
      handleNavigate('feed');
      fetchRequests();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      showToast('Request posted successfully!');
    } catch (err) { showToast('Failed to save request', 'error'); } finally { setLoading(false); }
  };

  const handleCommit = async (requestId: string) => {
    if (!currentUser) return;
    const req = requests.find(r => r.id === requestId);
    try {
      const { error } = await supabase
        .from('requests')
        .update({ status: RequestStatus.PENDING, fulfiller_id: currentUser.id })
        .eq('id', requestId);

      if (error) throw error;
      
      if (req) createNotification(req.requesterId, `${currentUser.displayName} committed to buy your "${req.title}"!`, 'success', req.id);
      
      setActiveRequest(prev => prev ? { ...prev, status: RequestStatus.PENDING, fulfillerId: currentUser.id } : null);
      fetchRequests();
      confetti({ particleCount: 50, spread: 60, colors: ['#6366f1', '#a855f7'] });
      showToast('You committed to this request! Don\'t forget to buy it.');
    } catch (err) { showToast('Failed to update request', 'error'); }
  };

  const handleConfirmPurchase = async (requestId: string, orderId: string, receiptImage?: string, giftMessage?: string, verificationStatus?: 'verified' | 'warning') => {
    if (!currentUser) return;
    const req = requests.find(r => r.id === requestId);
    try {
        let receiptUrl = receiptImage;
        if (receiptImage && receiptImage.startsWith('data:image')) {
             const file = base64ToFile(receiptImage, `receipt_${requestId}.jpg`);
             const uploadedUrl = await uploadImage(file);
             if (uploadedUrl) receiptUrl = uploadedUrl;
        }

        const { error } = await supabase.from('requests').update({ 
            status: RequestStatus.FULFILLED, 
            tracking_number: orderId,
            proof_of_purchase_image: receiptUrl,
            gift_message: giftMessage,
            receipt_verification_status: verificationStatus
        }).eq('id', requestId);

        if (error) throw error;

        if (req) createNotification(req.requesterId, `${currentUser.displayName} purchased your item! Order ID: ${orderId}`, 'success', req.id);

        setIsFulfillmentModalOpen(false);
        setActiveRequest(null);
        fetchRequests();
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
        showToast('Purchase confirmed!', 'award');
    } catch (err) { showToast('Failed to confirm purchase', 'error'); }
  };

  const handleUpdateTracking = async (requestId: string, trackingNumber: string) => {
    if (!currentUser) return;
    const req = requests.find(r => r.id === requestId);
    try {
        const { error } = await supabase.from('requests').update({ tracking_number: trackingNumber }).eq('id', requestId);
        if (error) throw error;
        
        if (req) createNotification(req.requesterId, `Tracking updated for "${req.title}": ${trackingNumber}`, 'info', req.id);

        setIsFulfillmentModalOpen(false);
        setActiveRequest(null);
        fetchRequests();
        showToast('Tracking number updated.');
    } catch (err) { showToast('Failed to update tracking', 'error'); }
  };
  
  const handleMarkReceived = async (request: RequestItem) => {
    setThankYouModalRequest(request);
  };
  
  const submitThankYou = async (message: string, forumPostData?: { title: string, content: string }) => {
    if (!thankYouModalRequest || !currentUser) return;
    
    try {
      const { error } = await supabase.from('requests').update({ status: RequestStatus.RECEIVED, thank_you_message: message }).eq('id', thankYouModalRequest.id);
      if (error) throw error;
      
      if (thankYouModalRequest.fulfillerId) {
          createNotification(thankYouModalRequest.fulfillerId, `${currentUser.displayName} received the item and says: "${message}"`, 'success', thankYouModalRequest.id);
      }

      if (forumPostData) {
          await supabase.from('forum_threads').insert({
              id: `th_${Date.now()}`,
              author_id: currentUser.id,
              title: forumPostData.title,
              content: forumPostData.content,
              category: ForumCategory.STORIES,
              created_at: new Date().toISOString()
          });
          fetchForumThreads();
          showToast('Shared as a success story on the forum!');
      } else {
          showToast('Item marked received!');
      }

      setThankYouModalRequest(null);
      fetchRequests();
      confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 } });
    } catch (err) { showToast('Failed to mark received', 'error'); }
  };

  const handleAddComment = async (requestId: string, text: string) => {
      if (!currentUser) return;
      const targetRequest = requests.find(r => r.id === requestId);
      if (!targetRequest) return;

      const newComment = { id: `c_${Date.now()}`, userId: currentUser.id, text, createdAt: new Date().toISOString() };
      const updatedComments = [...targetRequest.comments, newComment];

      try {
        const { error } = await supabase.from('requests').update({ comments: updatedComments }).eq('id', requestId);
        if (error) throw error;
        
        if (targetRequest.requesterId !== currentUser.id) {
            createNotification(targetRequest.requesterId, `${currentUser.displayName} commented on "${targetRequest.title}"`, 'info', requestId);
        }
        
        fetchRequests();
      } catch (err) { showToast('Failed to post comment', 'error'); }
  };

  // --- FORUM HANDLERS ---
  const handleAddForumThread = async (thread: ForumThread) => {
      try {
          const { error } = await supabase.from('forum_threads').insert({
              id: thread.id,
              author_id: thread.authorId,
              title: thread.title,
              content: thread.content,
              category: thread.category,
              created_at: thread.createdAt
          });
          if (error) throw error;
          fetchForumThreads();
          showToast('Discussion started!');
      } catch (e) { showToast('Failed to start thread', 'error'); }
  };

  const handleAddForumReply = async (reply: ForumReply) => {
      try {
          const { error } = await supabase.from('forum_replies').insert({
              id: reply.id,
              thread_id: reply.threadId,
              author_id: reply.authorId,
              content: reply.content,
              created_at: reply.createdAt
          });
          if (error) throw error;
          fetchForumThreads();
      } catch (e) { showToast('Failed to reply', 'error'); }
  };

  const handleMarkNotificationsRead = async () => {
      if (!currentUser) return;
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', currentUser.id);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  // --- RENDERING ---

  const handleOpenFulfillment = (request: RequestItem) => {
    setActiveRequest(request);
    setIsFulfillmentModalOpen(true);
  };
  const handleNavigate = (view: string) => {
    setCurrentView(view);
    setViewingProfileId(view === 'profile' && currentUser ? currentUser.id : null);
  };
  const handleViewProfile = (userId: string) => {
    setViewingProfileId(userId);
    setCurrentView('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (authLoading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="h-12 w-12 text-indigo-500 animate-spin" /></div>;
  if (!session || !currentUser) return <Auth onLoginSuccess={() => fetchUserProfile(session?.user?.id)} session={session} />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">
      <Navbar 
        currentView={currentView}
        onNavigate={handleNavigate}
        user={currentUser}
        allUsers={Object.values(users)} 
        onSwitchUser={handleSignOut}
        notifications={notifications}
        onMarkNotificationsRead={handleMarkNotificationsRead}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'feed' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Hero />
            
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input 
                  type="text" 
                  placeholder="Search requests..." 
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                 <div className="bg-white p-1 rounded-lg border border-slate-200 flex shadow-sm">
                    <button onClick={() => setFeedMode('list')} className={`p-2 rounded-md ${feedMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}><List className="h-4 w-4" /></button>
                    <button onClick={() => setFeedMode('map')} className={`p-2 rounded-md ${feedMode === 'map' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}><Map className="h-4 w-4" /></button>
                 </div>
                 <select className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as Category | 'All')}>
                   <option value="All">All Categories</option>
                   {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
              </div>
            </div>

            <RecommendedRequests currentUser={currentUser} requests={requests} onSelectRequest={(r) => { setActiveRequest(r); setIsFulfillmentModalOpen(true); }} />

            {feedMode === 'map' ? (
              <div className="mb-8"><RequestMap currentUser={currentUser} requests={requests} onSelectRequest={(r) => { setActiveRequest(r); setIsFulfillmentModalOpen(true); }} categoryFilter={categoryFilter} searchTerm={searchTerm} /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requests
                  .filter(r => {
                    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || r.reason.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesCategory = categoryFilter === 'All' || r.category === categoryFilter;
                    return matchesSearch && matchesCategory;
                  })
                  .map(req => (
                    <RequestCard 
                      key={req.id} 
                      request={req} 
                      requester={users[req.requesterId]} 
                      onFulfill={handleOpenFulfillment}
                      onViewProfile={handleViewProfile}
                      onMarkReceived={handleMarkReceived}
                      onAddComment={handleAddComment}
                      currentUser={currentUser}
                    />
                  ))}
                  {requests.length === 0 && !loading && <div className="col-span-full text-center py-12 text-slate-400"><Package className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>No active requests found.</p></div>}
              </div>
            )}
          </div>
        )}

        {currentView === 'create' && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><button onClick={() => setCurrentView('feed')} className="mb-4 text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back to Feed</button><CreateRequest currentUser={currentUser} onSubmit={handleCreateRequest} onCancel={() => setCurrentView('feed')} /></div>}

        {currentView === 'profile' && viewingProfileId && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <button onClick={() => setCurrentView('feed')} className="mb-4 text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back to Feed</button>
             <UserProfile user={users[viewingProfileId]} requests={requests} isCurrentUser={viewingProfileId === currentUser.id} onEditProfile={() => setIsEditProfileOpen(true)} />
             <div className="flex border-b border-slate-200 mb-6">
                <button onClick={() => setProfileTab('requests')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${profileTab === 'requests' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>Requests</button>
                <button onClick={() => setProfileTab('commitments')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${profileTab === 'commitments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>Commitments</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requests.filter(r => profileTab === 'requests' ? r.requesterId === viewingProfileId : r.fulfillerId === viewingProfileId).map(req => (
                    <RequestCard key={req.id} request={req} requester={users[req.requesterId]} onFulfill={handleOpenFulfillment} onViewProfile={handleViewProfile} onMarkReceived={handleMarkReceived} onAddComment={handleAddComment} currentUser={currentUser} />
                ))}
             </div>
           </div>
        )}
        
        {currentView === 'leaderboard' && <Leaderboard users={Object.values(users)} requests={requests} />}
        {currentView === 'forum' && <Forum currentUser={currentUser} users={users} threads={forumThreads} onAddThread={handleAddForumThread} onAddReply={handleAddForumReply} />}
      </div>

      {activeRequest && <FulfillmentModal isOpen={isFulfillmentModalOpen} onClose={() => { setIsFulfillmentModalOpen(false); setActiveRequest(null); }} request={activeRequest} currentUser={currentUser} onCommit={handleCommit} onConfirmPurchase={handleConfirmPurchase} onUpdateTracking={handleUpdateTracking} />}
      {thankYouModalRequest && <ThankYouModal isOpen={!!thankYouModalRequest} onClose={() => setThankYouModalRequest(null)} itemTitle={thankYouModalRequest.title} originalReason={thankYouModalRequest.reason} donorName={users[thankYouModalRequest.fulfillerId || '']?.displayName} onSubmit={submitThankYou} />}
      <EditProfileModal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} user={currentUser} onSave={handleUpdateUser} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default App;