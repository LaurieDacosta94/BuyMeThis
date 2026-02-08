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
import { db, base64ToFile, uploadImage } from './services/db';
import confetti from 'canvas-confetti';

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
    checkSession();
  }, []);

  const checkSession = async () => {
    setAuthLoading(true);
    const userId = db.getSessionId();
    if (userId) {
      await fetchUserProfile(userId);
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
    setAuthLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      loadData();
    }
  }, [isAuthenticated, currentUser]);

  const loadData = async () => {
     setLoading(true);
     await Promise.all([
         fetchRequests(),
         fetchAllUsers(),
         fetchForumThreads(),
         fetchNotifications()
     ]);
     setLoading(false);
  };

  // --- DATA FETCHING ---

  const fetchUserProfile = async (userId: string) => {
    try {
      const user = await db.getUser(userId);
      if (user) {
         setCurrentUser(user);
         setUsers(prev => ({ ...prev, [user.id]: user }));
      }
    } catch (e) { console.error(e); }
  };

  const fetchAllUsers = async () => {
      const allUsers = await db.getAllUsers();
      const userMap: Record<string, User> = {};
      allUsers.forEach(u => userMap[u.id] = u);
      setUsers(prev => ({ ...prev, ...userMap }));
  };

  const fetchRequests = async () => {
    try {
      const data = await db.getRequests();
      setRequests(data);
    } catch (err) { console.error(err); }
  };

  const fetchForumThreads = async () => {
      const data = await db.getThreads();
      setForumThreads(data);
  };

  const fetchNotifications = async () => {
      if (!currentUser) return;
      const data = await db.getNotifications(currentUser.id);
      setNotifications(data);
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
      await db.createNotification({
          id: `notif_${Date.now()}_${Math.random()}`,
          userId,
          message,
          type,
          createdAt: new Date().toISOString(),
          relatedRequestId: requestId,
          isRead: false
      });
  };

  const handleSignOut = () => {
      db.signOut();
      setIsAuthenticated(false);
      setCurrentUser(null);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    if (!currentUser) return;
    try {
        await db.updateUser(updatedUser);
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
      // Image is already base64 in enrichedData.imageUrl for local DB/Neon storage
      // In a real production app, we would upload to a bucket here.
      await db.createRequest(newRequest);
      
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
      await db.updateRequest(requestId, { status: RequestStatus.PENDING, fulfillerId: currentUser.id });
      
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
        await db.updateRequest(requestId, {
            status: RequestStatus.FULFILLED, 
            trackingNumber: orderId,
            proofOfPurchaseImage: receiptImage,
            giftMessage: giftMessage,
            receiptVerificationStatus: verificationStatus
        });

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
        await db.updateRequest(requestId, { trackingNumber });
        
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
      await db.updateRequest(thankYouModalRequest.id, { status: RequestStatus.RECEIVED, thankYouMessage: message });
      
      if (thankYouModalRequest.fulfillerId) {
          createNotification(thankYouModalRequest.fulfillerId, `${currentUser.displayName} received the item and says: "${message}"`, 'success', thankYouModalRequest.id);
      }

      if (forumPostData) {
          await db.createThread({
              id: `th_${Date.now()}`,
              authorId: currentUser.id,
              title: forumPostData.title,
              content: forumPostData.content,
              category: ForumCategory.STORIES,
              createdAt: new Date().toISOString(),
              replies: [],
              views: 0,
              likes: []
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
        await db.updateRequest(requestId, { comments: updatedComments });
        
        if (targetRequest.requesterId !== currentUser.id) {
            createNotification(targetRequest.requesterId, `${currentUser.displayName} commented on "${targetRequest.title}"`, 'info', requestId);
        }
        
        fetchRequests();
      } catch (err) { showToast('Failed to post comment', 'error'); }
  };

  // --- FORUM HANDLERS ---
  const handleAddForumThread = async (thread: ForumThread) => {
      try {
          await db.createThread(thread);
          fetchForumThreads();
          showToast('Discussion started!');
      } catch (e) { showToast('Failed to start thread', 'error'); }
  };

  const handleAddForumReply = async (reply: ForumReply) => {
      try {
          await db.createReply(reply);
          fetchForumThreads();
      } catch (e) { showToast('Failed to reply', 'error'); }
  };

  const handleMarkNotificationsRead = async () => {
      if (!currentUser) return;
      await db.markNotificationsRead(currentUser.id);
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
  if (!isAuthenticated || !currentUser) return <Auth onLoginSuccess={checkSession} />;

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