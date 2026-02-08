
import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { RequestCard } from './components/RequestCard';
import { UserProfile } from './components/UserProfile';
import { CreateRequest } from './components/CreateRequest';
import { FulfillmentModal } from './components/FulfillmentModal';
import { RequestDetailsModal } from './components/RequestDetailsModal';
import { ThankYouModal } from './components/ThankYouModal';
import { EditProfileModal } from './components/EditProfileModal';
import { RequestMap } from './components/RequestMap';
import { RecommendedRequests } from './components/RecommendedRequests';
import { Leaderboard } from './components/Leaderboard';
import { Forum } from './components/Forum';
import { AdminPanel } from './components/AdminPanel';
import { ToastContainer, ToastMessage } from './components/Toast';
import { Hero } from './components/Hero';
import { Auth } from './components/Auth';
import { RequestItem, RequestStatus, User, Notification, Category, ForumThread, ForumCategory, ForumReply, Fulfillment } from './types';
import { Search, Package, ArrowLeft, Map, List, Loader2, Database, AlertCircle, X, Lock } from 'lucide-react';
import { db } from './services/db';
import confetti from 'canvas-confetti';
import { calculateDistance } from './utils/geo';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // App Data
  const [users, setUsers] = useState<Record<string, User>>({});
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [forumThreads, setForumThreads] = useState<ForumThread[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // UI State
  const [currentView, setCurrentView] = useState('feed'); 
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [feedMode, setFeedMode] = useState<'list' | 'map'>('list');
  const [loading, setLoading] = useState(true);
  
  const [activeRequest, setActiveRequest] = useState<RequestItem | null>(null);
  const [detailsRequest, setDetailsRequest] = useState<RequestItem | null>(null);
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
    }
    // Always fetch public data regardless of auth status
    await loadData();
    setAuthLoading(false);
  };

  const loadData = async () => {
     setLoading(true);
     await Promise.all([
         fetchRequests(),
         fetchAllUsers(),
         fetchForumThreads()
     ]);
     setLoading(false);
  };

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [currentUser]);

  // --- DATA FETCHING ---

  const fetchUserProfile = async (userId: string) => {
    try {
      const user = await db.getUser(userId);
      if (user) {
         setCurrentUser(user);
         setUsers(prev => ({ ...prev, [user.id]: user }));
      } else {
         // Session invalid
         db.signOut();
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

  const requireAuth = () => {
      if (!currentUser) {
          setShowAuthModal(true);
          return false;
      }
      return true;
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
      setCurrentUser(null);
      showToast("Logged out successfully", "success");
      handleNavigate('feed');
  };

  const handleUpdateUser = async (updatedUser: User) => {
    // Admins can update any user, normally logic handled in db.ts but for UI:
    const targetId = updatedUser.id;
    try {
        await db.updateUser(updatedUser);
        if (currentUser && currentUser.id === targetId) {
             setCurrentUser(updatedUser);
        }
        setUsers(prev => ({ ...prev, [targetId]: updatedUser }));
        setIsEditProfileOpen(false);
        showToast("Profile updated successfully!");
    } catch (e) { showToast("Failed to update profile", "error"); }
  };

  const handleCreateRequest = async (newRequest: RequestItem) => {
    if (!requireAuth()) return;
    setLoading(true);
    try {
      await db.createRequest(newRequest);
      handleNavigate('feed');
      fetchRequests();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      showToast('Request posted successfully!');
    } catch (err) { showToast('Failed to save request', 'error'); } finally { setLoading(false); }
  };

  const handleDeleteRequest = async (request: RequestItem) => {
      if (!requireAuth()) return;
      if (request.requesterId !== currentUser?.id && !currentUser?.isAdmin) {
          showToast("You can only delete your own requests", 'error');
          return;
      }
      try {
          await db.deleteRequest(request.id);
          setRequests(prev => prev.filter(r => r.id !== request.id));
          if (detailsRequest?.id === request.id) setDetailsRequest(null);
          showToast("Request deleted successfully");
      } catch (e) {
          showToast("Failed to delete request", 'error');
      }
  };

  const handleReactivateRequest = async (request: RequestItem) => {
      if (!requireAuth()) return;
      if (request.requesterId !== currentUser?.id) return;
      
      try {
          // Update createdAt to now to refresh freshness
          await db.updateRequest(request.id, { 
              createdAt: new Date().toISOString(),
              status: RequestStatus.OPEN
          });
          fetchRequests();
          showToast("Request reactivated and bumped to top!");
      } catch (e) {
          showToast("Failed to reactivate request", 'error');
      }
  };

  const handleCommit = async (requestId: string) => {
    if (!requireAuth()) return;
    if (!currentUser) return;
    const req = requests.find(r => r.id === requestId);
    if (!req) return;

    // Check if already a candidate
    const candidates = req.candidates || [];
    if (!candidates.includes(currentUser.id)) {
        const newCandidates = [...candidates, currentUser.id];
        try {
            await db.updateRequest(requestId, { candidates: newCandidates, status: RequestStatus.PENDING });
            createNotification(req.requesterId, `${currentUser.displayName} offered to help with "${req.title}"!`, 'success', req.id);
            showToast('You offered to help! The requester has been notified.');
            fetchRequests();
            // Update local state if modal is open
            if (activeRequest && activeRequest.id === requestId) {
                 setActiveRequest({...activeRequest, candidates: newCandidates, status: RequestStatus.PENDING});
            }
        } catch(e) { showToast('Failed to update request', 'error'); }
    } else {
        // Already a candidate
        showToast('You have already offered to help with this request.');
    }
  };

  const handleConfirmPurchase = async (requestId: string, orderId: string, receiptImage?: string, giftMessage?: string, verificationStatus?: 'verified' | 'warning') => {
    if (!requireAuth()) return;
    if (!currentUser) return;
    const req = requests.find(r => r.id === requestId);
    if (!req) return;

    try {
        // Create new fulfillment entry
        const newFulfillment: Fulfillment = {
            fulfillerId: currentUser.id,
            status: RequestStatus.FULFILLED,
            trackingNumber: orderId,
            proofOfPurchaseImage: receiptImage,
            giftMessage: giftMessage,
            receiptVerificationStatus: verificationStatus,
            createdAt: new Date().toISOString()
        };

        const existingFulfillments = req.fulfillments || [];
        // Remove old entry for this user if exists (upsert logic)
        const updatedFulfillments = [...existingFulfillments.filter(f => f.fulfillerId !== currentUser.id), newFulfillment];

        await db.updateRequest(requestId, {
            status: RequestStatus.FULFILLED, // Global status shows as fulfilled if at least one person does it
            fulfillerId: currentUser.id, // Set primary fulfiller to latest for legacy view
            trackingNumber: orderId, // Legacy
            proofOfPurchaseImage: receiptImage, // Legacy
            giftMessage: giftMessage, // Legacy
            receiptVerificationStatus: verificationStatus, // Legacy
            fulfillments: updatedFulfillments
        });

        // Notify requester
        createNotification(req.requesterId, `${currentUser.displayName} purchased your item! Order ID: ${orderId}`, 'success', req.id);

        // Notify other candidates
        const otherCandidates = (req.candidates || []).filter(cId => cId !== currentUser.id);
        for (const candidateId of otherCandidates) {
            createNotification(
                candidateId, 
                `Heads up: ${currentUser.displayName} has fulfilled the request "${req.title}". If you have already purchased it, you can still submit your fulfillment details.`, 
                'alert', 
                req.id
            );
        }

        setIsFulfillmentModalOpen(false);
        setActiveRequest(null);
        setDetailsRequest(null);
        fetchRequests();
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
        showToast('Purchase confirmed!', 'award');
    } catch (err) { showToast('Failed to confirm purchase', 'error'); }
  };

  const handleUpdateTracking = async (requestId: string, trackingNumber: string) => {
    if (!requireAuth()) return;
    if (!currentUser) return;
    const req = requests.find(r => r.id === requestId);
    if (!req) return;

    try {
        // Update specific fulfillment entry
        const fulfillments = req.fulfillments || [];
        const myFulfillmentIndex = fulfillments.findIndex(f => f.fulfillerId === currentUser.id);
        
        let updatedFulfillments = [...fulfillments];
        if (myFulfillmentIndex !== -1) {
            updatedFulfillments[myFulfillmentIndex] = { ...updatedFulfillments[myFulfillmentIndex], trackingNumber };
        }

        await db.updateRequest(requestId, { 
            trackingNumber, // Legacy
            fulfillments: updatedFulfillments
        });

        if (req) createNotification(req.requesterId, `Tracking updated for "${req.title}" by ${currentUser.displayName}: ${trackingNumber}`, 'info', req.id);
        setIsFulfillmentModalOpen(false);
        setActiveRequest(null);
        fetchRequests();
        showToast('Tracking number updated.');
    } catch (err) { showToast('Failed to update tracking', 'error'); }
  };
  
  const handleMarkReceived = async (request: RequestItem) => {
    if (!requireAuth()) return;
    setThankYouModalRequest(request);
  };
  
  const submitThankYou = async (message: string, forumPostData?: { title: string, content: string }) => {
    if (!thankYouModalRequest || !currentUser) return;
    try {
      await db.updateRequest(thankYouModalRequest.id, { status: RequestStatus.RECEIVED, thankYouMessage: message });
      
      // Notify all fulfillers
      const fulfillerIds = thankYouModalRequest.fulfillments?.map(f => f.fulfillerId) || [];
      // Also include legacy fulfillerId if not in list
      if (thankYouModalRequest.fulfillerId && !fulfillerIds.includes(thankYouModalRequest.fulfillerId)) {
          fulfillerIds.push(thankYouModalRequest.fulfillerId);
      }

      fulfillerIds.forEach(fid => {
           createNotification(fid, `${currentUser.displayName} received the item and says: "${message}"`, 'success', thankYouModalRequest.id);
      });

      if (forumPostData) {
          const newThread: ForumThread = {
              id: `th_${Date.now()}`,
              authorId: currentUser.id,
              title: forumPostData.title,
              content: forumPostData.content,
              category: ForumCategory.STORIES,
              createdAt: new Date().toISOString(),
              replies: [],
              views: 0,
              likes: []
          };
          await db.createThread(newThread);
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
      if (!requireAuth()) return;
      if (!currentUser) return;
      const targetRequest = requests.find(r => r.id === requestId);
      if (!targetRequest) return;
      
      const newComment = { id: `c_${Date.now()}`, userId: currentUser.id, text, createdAt: new Date().toISOString() };
      const updatedComments = [...targetRequest.comments, newComment];

      // Optimistically update details view immediately
      if (detailsRequest && detailsRequest.id === requestId) {
          setDetailsRequest({ ...detailsRequest, comments: updatedComments });
      }

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
      if (!requireAuth()) return;
      try {
          await db.createThread(thread);
          fetchForumThreads();
          showToast('Discussion started!');
      } catch (e) { showToast('Failed to start thread', 'error'); }
  };

  const handleAddForumReply = async (reply: ForumReply) => {
      if (!requireAuth()) return;
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

  const handleRequestLocation = () => {
      if (!navigator.geolocation) {
          showToast("Geolocation is not supported by your browser", 'error');
          return;
      }
      navigator.geolocation.getCurrentPosition(
          async (pos) => {
              if (currentUser) {
                  const updatedUser = {
                      ...currentUser,
                      coordinates: {
                          lat: pos.coords.latitude,
                          lng: pos.coords.longitude
                      }
                  };
                  await handleUpdateUser(updatedUser);
                  showToast("Location updated successfully!");
              } else {
                  showToast("Please log in to save your location", 'error');
              }
          },
          () => showToast("Unable to retrieve location", 'error')
      );
  };

  // --- RENDERING ---

  const handleOpenFulfillment = (request: RequestItem) => {
    if (!requireAuth()) return;
    setActiveRequest(request);
    setIsFulfillmentModalOpen(true);
    // Close details modal if open
    setDetailsRequest(null);
  };

  const handleOpenDetails = (request: RequestItem) => {
    setDetailsRequest(request);
  };
  
  const handleNavigate = (view: string) => {
    // If trying to access create/profile without auth, block it
    if ((view === 'create' || view === 'profile') && !currentUser) {
        setShowAuthModal(true);
        return;
    }
    // Admin route protection
    if (view === 'admin' && !currentUser?.isAdmin) {
        showToast("Unauthorized access", "error");
        return;
    }
    
    setCurrentView(view);
    setViewingProfileId(view === 'profile' && currentUser ? currentUser.id : null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleViewProfile = (userId: string) => {
    setViewingProfileId(userId);
    setCurrentView('profile');
    if (detailsRequest) setDetailsRequest(null); // Close modal if open
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sortedRequests = useMemo(() => {
      // Logic for inactive requests: > 30 days
      // Filter out inactive requests unless we are viewing a profile
      const isProfileView = currentView === 'profile';
      
      let filtered = requests.filter(r => {
          const isInactive = r.status === RequestStatus.OPEN && (Date.now() - new Date(r.createdAt).getTime() > 30 * 24 * 60 * 60 * 1000);
          
          // If inactive, only show if viewing specific profile or user is requester (in future "My Requests" view)
          if (isInactive && !isProfileView) return false;

          const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || r.reason.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesCategory = categoryFilter === 'All' || r.category === categoryFilter;
          return matchesSearch && matchesCategory;
      });

      // Sort by proximity if available
      if (currentUser?.coordinates) {
          filtered.sort((a, b) => {
              // Prioritize those with coordinates
              if (a.coordinates && !b.coordinates) return -1;
              if (!a.coordinates && b.coordinates) return 1;
              if (!a.coordinates && !b.coordinates) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

              const distA = calculateDistance(currentUser.coordinates!.lat, currentUser.coordinates!.lng, a.coordinates!.lat, a.coordinates!.lng);
              const distB = calculateDistance(currentUser.coordinates!.lat, currentUser.coordinates!.lng, b.coordinates!.lat, b.coordinates!.lng);
              return distA - distB;
          });
      } else {
          // Default sort: Newest first
          filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return filtered;
  }, [requests, currentUser?.coordinates, searchTerm, categoryFilter, currentView]);

  if (authLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-12 w-12 text-indigo-600 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans pb-12 selection:bg-indigo-100 selection:text-indigo-900">
      
      {!db.isNeon && (
          <div className="bg-slate-900 text-white px-4 py-2 text-xs flex items-center justify-center gap-2 border-b-2 border-slate-700">
              <Database className="h-3 w-3 text-red-400" />
              <span className="font-mono">DB_OFFLINE // DEMO_MODE</span>
              <button onClick={() => setShowAuthModal(true)} className="underline hover:text-indigo-300">CONNECT</button>
          </div>
      )}

      {currentView !== 'admin' && (
          <Navbar 
            currentView={currentView}
            onNavigate={handleNavigate}
            user={currentUser}
            allUsers={Object.values(users)} 
            onSwitchUser={(id) => { console.log(id); }}
            onLogout={handleSignOut}
            onLogin={() => setShowAuthModal(true)}
            notifications={notifications}
            onMarkNotificationsRead={handleMarkNotificationsRead}
            onOpenRequest={(id) => {
                const req = requests.find(r => r.id === id);
                if (req) handleOpenDetails(req);
            }}
          />
      )}

      <div className={currentView === 'admin' ? '' : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24"}>
        {currentView === 'feed' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Hero />
            
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-3 shadow-hard-sm border-2 border-slate-900 sticky top-20 z-30">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input 
                  type="text" 
                  placeholder="SEARCH_DB..." 
                  className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 focus:border-blue-600 bg-slate-50 focus:bg-white transition-all outline-none font-mono text-xs font-bold"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-3 w-full md:w-auto">
                 <div className="bg-slate-100 p-1 flex border-2 border-slate-200">
                    <button onClick={() => setFeedMode('list')} className={`p-2 transition-all ${feedMode === 'list' ? 'bg-white text-blue-600 shadow-sm border border-slate-300' : 'text-slate-400 hover:text-slate-600'}`}><List className="h-4 w-4" /></button>
                    <button onClick={() => setFeedMode('map')} className={`p-2 transition-all ${feedMode === 'map' ? 'bg-white text-blue-600 shadow-sm border border-slate-300' : 'text-slate-400 hover:text-slate-600'}`}><Map className="h-4 w-4" /></button>
                 </div>
                 <div className="relative flex-1 md:flex-none">
                    <select 
                        className="w-full md:w-48 appearance-none px-4 py-2 border-2 border-slate-200 bg-white text-xs font-bold font-mono focus:border-blue-600 outline-none cursor-pointer uppercase" 
                        value={categoryFilter} 
                        onChange={(e) => setCategoryFilter(e.target.value as Category | 'All')}
                    >
                        <option value="All">FILTER: ALL</option>
                        {Object.values(Category).map(c => <option key={c} value={c}>FILTER: {c.toUpperCase()}</option>)}
                    </select>
                 </div>
              </div>
            </div>

            {currentUser && <RecommendedRequests currentUser={currentUser} requests={requests} onSelectRequest={handleOpenDetails} />}

            {feedMode === 'map' ? (
              <div className="mb-12">
                  <RequestMap 
                    currentUser={currentUser} 
                    requests={requests} 
                    onSelectRequest={handleOpenDetails} 
                    categoryFilter={categoryFilter} 
                    searchTerm={searchTerm} 
                    onEnableLocation={handleRequestLocation} 
                  />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {sortedRequests.map(req => (
                    <RequestCard 
                      key={req.id} 
                      request={req} 
                      requester={users[req.requesterId]}
                      usersMap={users} // Pass users map
                      onFulfill={handleOpenFulfillment}
                      onViewProfile={handleViewProfile}
                      onMarkReceived={handleMarkReceived}
                      onAddComment={handleAddComment}
                      currentUser={currentUser}
                      onRequireAuth={() => setShowAuthModal(true)}
                      onOpenDetails={handleOpenDetails}
                      onDelete={handleDeleteRequest}
                      showDelete={false} // Hide explicit delete on main feed
                    />
                  ))}
                  {sortedRequests.length === 0 && !loading && (
                      <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-300">
                          <div className="bg-slate-100 w-20 h-20 flex items-center justify-center mx-auto mb-4 border-2 border-slate-300">
                            <Package className="h-8 w-8 text-slate-400" />
                          </div>
                          <h3 className="text-sm font-bold text-slate-600 uppercase font-mono mb-1">NO_DATA_FOUND</h3>
                          <p className="text-xs text-slate-400 font-mono">Adjust filter parameters.</p>
                      </div>
                  )}
              </div>
            )}
          </div>
        )}

        {currentView === 'create' && currentUser && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><button onClick={() => setCurrentView('feed')} className="mb-6 text-xs font-bold uppercase text-slate-500 hover:text-blue-600 flex items-center gap-2 transition-colors font-mono"><ArrowLeft className="h-4 w-4" /> ABORT</button><CreateRequest currentUser={currentUser} onSubmit={handleCreateRequest} onCancel={() => setCurrentView('feed')} /></div>}

        {currentView === 'profile' && viewingProfileId && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <button onClick={() => setCurrentView('feed')} className="mb-6 text-xs font-bold uppercase text-slate-500 hover:text-blue-600 flex items-center gap-2 transition-colors font-mono"><ArrowLeft className="h-4 w-4" /> RETURN</button>
             <UserProfile user={users[viewingProfileId]} requests={requests} isCurrentUser={viewingProfileId === currentUser?.id} onEditProfile={() => setIsEditProfileOpen(true)} />
             
             <div className="bg-white shadow-hard border-2 border-slate-900 overflow-hidden mb-8">
                <div className="flex border-b-2 border-slate-900">
                    <button onClick={() => setProfileTab('requests')} className={`flex-1 py-3 text-xs font-bold font-mono uppercase text-center transition-colors relative ${profileTab === 'requests' ? 'text-white bg-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}>
                        REQUEST_LOG
                    </button>
                    <button onClick={() => setProfileTab('commitments')} className={`flex-1 py-3 text-xs font-bold font-mono uppercase text-center transition-colors relative ${profileTab === 'commitments' ? 'text-white bg-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}>
                        MISSION_LOG
                    </button>
                </div>
                <div className="p-6 bg-slate-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {requests.filter(r => profileTab === 'requests' ? r.requesterId === viewingProfileId : r.candidates.includes(viewingProfileId)).length > 0 ? (
                            requests.filter(r => profileTab === 'requests' ? r.requesterId === viewingProfileId : r.candidates.includes(viewingProfileId)).map(req => (
                                <RequestCard 
                                    key={req.id} 
                                    request={req} 
                                    requester={users[req.requesterId]}
                                    usersMap={users} 
                                    onFulfill={handleOpenFulfillment} 
                                    onViewProfile={handleViewProfile} 
                                    onMarkReceived={handleMarkReceived} 
                                    onAddComment={handleAddComment} 
                                    currentUser={currentUser} 
                                    onRequireAuth={() => setShowAuthModal(true)} 
                                    onOpenDetails={handleOpenDetails} 
                                    onDelete={handleDeleteRequest} 
                                    showDelete={viewingProfileId === currentUser?.id && profileTab === 'requests'}
                                    onReactivate={handleReactivateRequest}
                                />
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center text-slate-400 italic font-mono text-xs">NO_ENTRIES_FOUND</div>
                        )}
                    </div>
                </div>
             </div>
           </div>
        )}
        
        {currentView === 'leaderboard' && <Leaderboard users={Object.values(users)} requests={requests} />}
        {currentView === 'forum' && <Forum currentUser={currentUser} users={users} threads={forumThreads} onAddThread={handleAddForumThread} onAddReply={handleAddForumReply} onRequireAuth={() => setShowAuthModal(true)} />}
        
        {/* Admin Route */}
        {currentView === 'admin' && currentUser?.isAdmin && (
             <div className="animate-in fade-in">
                 <button onClick={() => setCurrentView('feed')} className="fixed top-6 right-6 z-50 bg-red-600 text-white px-4 py-2 text-xs font-bold uppercase font-mono hover:bg-red-500 border-2 border-white shadow-lg">
                    LOGOUT_ADMIN
                 </button>
                 <AdminPanel 
                    users={Object.values(users)} 
                    requests={requests} 
                    onDeleteRequest={handleDeleteRequest}
                    onUpdateUser={handleUpdateUser}
                 />
             </div>
        )}
      </div>

      {activeRequest && currentUser && <FulfillmentModal isOpen={isFulfillmentModalOpen} onClose={() => { setIsFulfillmentModalOpen(false); setActiveRequest(null); }} request={activeRequest} currentUser={currentUser} onCommit={handleCommit} onConfirmPurchase={handleConfirmPurchase} onUpdateTracking={handleUpdateTracking} />}
      {detailsRequest && (
        <RequestDetailsModal 
            isOpen={!!detailsRequest} 
            onClose={() => setDetailsRequest(null)} 
            request={detailsRequest} 
            requester={users[detailsRequest.requesterId]} 
            usersMap={users} 
            onFulfill={() => handleOpenFulfillment(detailsRequest)} 
            currentUser={currentUser} 
            candidates={detailsRequest.candidates ? detailsRequest.candidates.map(id => users[id]).filter(Boolean) : []} 
            onDelete={handleDeleteRequest} 
            onAddComment={handleAddComment}
            onViewProfile={handleViewProfile}
        />
      )}
      {thankYouModalRequest && <ThankYouModal isOpen={!!thankYouModalRequest} onClose={() => setThankYouModalRequest(null)} itemTitle={thankYouModalRequest.title} originalReason={thankYouModalRequest.reason} donorName={users[thankYouModalRequest.fulfillerId || '']?.displayName} onSubmit={submitThankYou} />}
      {currentUser && <EditProfileModal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} user={currentUser} onSave={handleUpdateUser} />}
      
      {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowAuthModal(false)} />
              <div className="relative w-full max-w-md animate-in zoom-in-95 duration-200 border-2 border-slate-900 shadow-hard">
                  <div className="bg-slate-900 text-white px-3 py-2 flex justify-between items-center select-none border-b-2 border-slate-900">
                      <div className="flex items-center gap-2">
                          <Lock className="h-3 w-3 text-yellow-400" />
                          <span className="font-mono text-xs font-bold uppercase tracking-widest">ACCESS_TERMINAL</span>
                      </div>
                      <button onClick={() => setShowAuthModal(false)} className="hover:text-red-400"><X className="h-4 w-4"/></button>
                  </div>
                  <Auth onLoginSuccess={() => { setShowAuthModal(false); checkSession(); }} />
              </div>
          </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default App;
