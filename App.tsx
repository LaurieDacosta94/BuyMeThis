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
import { RequestItem, RequestStatus, LocationFilter, User, Notification, Category, ForumThread, ForumCategory, ForumReply } from './types';
import { Filter, Search, Package, Gift, ArrowLeft, Map, List, Loader2 } from 'lucide-react';
import { supabase } from './services/supabase';

// MOCK USERS (We keep users local for the demo, but sync their requests)
const MOCK_USERS: Record<string, User> = {
  'user_1': {
    id: 'user_1',
    displayName: 'Alex Rivera',
    handle: 'arivera',
    bio: 'Avid reader and community gardener. Trying to build a free library in my neighborhood. I believe in the power of sharing knowledge.',
    avatarUrl: 'https://picsum.photos/seed/user1/200',
    projects: ['Community Garden', 'Little Free Library'],
    hobbies: ['Gardening', 'Woodworking', 'Sci-Fi'],
    location: 'Portland, OR',
    coordinates: { lat: 45.5152, lng: -122.6784 },
    trustScore: 50,
    badges: [
      { id: 'b1', label: 'Early Adopter', icon: 'star', description: 'Joined in beta', color: 'bg-indigo-500' },
      { id: 'b2', label: 'Verified Local', icon: 'shield', description: 'Address verified', color: 'bg-teal-500' }
    ]
  },
  'user_2': {
    id: 'user_2',
    displayName: 'Sarah Chen',
    handle: 'schen_art',
    bio: 'Art student focusing on digital media. Need supplies for my final thesis project. Trying to make art accessible to everyone.',
    avatarUrl: 'https://picsum.photos/seed/user2/200',
    projects: ['Thesis Exhibition', 'Digital Mural'],
    hobbies: ['Painting', 'Hiking', 'Photography'],
    location: 'Seattle, WA',
    coordinates: { lat: 47.6062, lng: -122.3321 },
    trustScore: 50,
    badges: []
  },
  'user_3': {
    id: 'user_3',
    displayName: 'Marcus Johnson',
    handle: 'mj_codes',
    bio: 'Self-taught developer looking for learning resources. Building tools to help non-profits manage their inventory.',
    avatarUrl: 'https://picsum.photos/seed/user3/200',
    projects: ['Personal Website', 'React App', 'Non-profit Tool'],
    hobbies: ['Coding', 'Gaming', 'Basketball'],
    location: 'Austin, TX',
    coordinates: { lat: 30.2672, lng: -97.7431 },
    trustScore: 50,
    badges: [
      { id: 'b3', label: 'First Gift', icon: 'heart', description: 'Fulfilled a request', color: 'bg-pink-500' }
    ]
  }
};

const INITIAL_THREADS: ForumThread[] = [
  {
    id: 'th_1',
    authorId: 'user_1',
    title: 'Tips for reducing shipping costs?',
    category: ForumCategory.ADVICE,
    content: "Hi everyone, I love fulfilling requests but shipping heavy items like textbooks can get pricey. Does anyone have tips on the best services for media mail or regional boxes? I want to make sure I can help as many people as possible without breaking the bank.",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    views: 124,
    likes: ['user_2'],
    replies: [
      {
        id: 'rp_1',
        threadId: 'th_1',
        authorId: 'user_3',
        content: "Definitely use USPS Media Mail for books! It takes longer but is significantly cheaper. Just make sure there are no personal notes inside the book itself.",
        createdAt: new Date(Date.now() - 80000000).toISOString()
      },
      {
        id: 'rp_2',
        threadId: 'th_1',
        authorId: 'user_2',
        content: "Also look into Pirateship. They offer discounted rates that are usually better than going directly to the post office counter.",
        createdAt: new Date(Date.now() - 75000000).toISOString()
      }
    ]
  },
  {
    id: 'th_2',
    authorId: 'user_2',
    title: 'My first fulfillment success story! ❤️',
    category: ForumCategory.STORIES,
    content: "I just wanted to share that I received a picture from the user I sent art supplies to last week. They painted a beautiful landscape! It feels so good to know that a small donation can help someone express their creativity. This community rocks.",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    views: 89,
    likes: ['user_1', 'user_3'],
    replies: []
  }
];

const App: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState('user_1');
  const [currentView, setCurrentView] = useState('feed'); 
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [feedMode, setFeedMode] = useState<'list' | 'map'>('list');
  const [loading, setLoading] = useState(true);

  // Data Persistence
  const [users, setUsers] = useState<Record<string, User>>(MOCK_USERS);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  
  const [forumThreads, setForumThreads] = useState<ForumThread[]>(() => {
    const saved = localStorage.getItem('buymethis_threads');
    return saved ? JSON.parse(saved) : INITIAL_THREADS;
  });
  
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('buymethis_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  // UI State
  const [activeRequest, setActiveRequest] = useState<RequestItem | null>(null);
  const [isFulfillmentModalOpen, setIsFulfillmentModalOpen] = useState(false);
  const [thankYouModalRequest, setThankYouModalRequest] = useState<RequestItem | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  
  const [filter, setFilter] = useState<LocationFilter>(LocationFilter.NATIONAL);
  const [categoryFilter, setCategoryFilter] = useState<Category | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [profileTab, setProfileTab] = useState<'requests' | 'commitments'>('requests');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const currentUser = users[currentUserId];
  const allUsers = Object.values(users);

  // --- SUPABASE INTEGRATION ---

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase.from('requests').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      
      if (data) {
        // Map DB columns to our Typescript Interface
        const mappedRequests: RequestItem[] = data.map((row: any) => ({
          id: row.id,
          requesterId: row.requester_id,
          title: row.title,
          reason: row.reason,
          category: row.category as Category,
          status: row.status as RequestStatus,
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
          productUrl: '' // Simple fallback
        }));
        setRequests(mappedRequests);
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
      showToast('Failed to load requests from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('public:requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- END SUPABASE ---

  useEffect(() => {
    localStorage.setItem('buymethis_notifications', JSON.stringify(notifications));
  }, [notifications]);
  
  useEffect(() => {
    localStorage.setItem('buymethis_threads', JSON.stringify(forumThreads));
  }, [forumThreads]);

  // Helpers
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

  const addNotification = (userId: string, message: string, relatedRequestId?: string) => {
    const newNotif: Notification = {
      id: `notif_${Date.now()}`,
      userId,
      message,
      type: 'info',
      isRead: false,
      createdAt: new Date().toISOString(),
      relatedRequestId
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleMarkNotificationsRead = () => {
    setNotifications(prev => prev.map(n => n.userId === currentUserId ? { ...n, isRead: true } : n));
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => ({
      ...prev,
      [updatedUser.id]: updatedUser
    }));
    setIsEditProfileOpen(false);
  };

  const checkAndAwardBadges = (user: User, completedRequestsCount: number, hasVerifiedReceipt: boolean) => {
    const newBadges = [...user.badges];
    let awarded = false;
    let badgeName = '';

    if (completedRequestsCount >= 1 && !newBadges.find(b => b.id === 'first_gift')) {
      newBadges.push({ id: 'first_gift', label: 'First Gift', icon: 'heart', description: 'Fulfilled your first request', color: 'bg-pink-500' });
      awarded = true;
      badgeName = 'First Gift';
    }

    if (completedRequestsCount >= 3 && !newBadges.find(b => b.id === 'community_star')) {
      newBadges.push({ id: 'community_star', label: 'Community Star', icon: 'star', description: 'Fulfilled 3 requests', color: 'bg-indigo-500' });
      awarded = true;
      badgeName = 'Community Star';
    }
    
    if (hasVerifiedReceipt && !newBadges.find(b => b.id === 'verified_hero')) {
       newBadges.push({ id: 'verified_hero', label: 'Verified Hero', icon: 'shield', description: 'Provided verified proof of purchase', color: 'bg-teal-500' });
       awarded = true;
       badgeName = 'Verified Hero';
    }

    if (awarded) {
      handleUpdateUser({ ...user, badges: newBadges });
      showToast(`🏆 Badge Unlocked: ${badgeName}!`, 'award');
    }
  };

  const handleSwitchUser = (userId: string) => {
    setCurrentUserId(userId);
    setViewingProfileId(null);
    showToast(`Switched to user ${users[userId].displayName}`);
  };

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    if (view === 'profile') {
      setViewingProfileId(currentUserId);
    } else {
      setViewingProfileId(null);
    }
  };

  const handleViewProfile = (userId: string) => {
    setViewingProfileId(userId);
    setCurrentView('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateRequest = async (newRequest: RequestItem) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('requests').insert({
        id: newRequest.id,
        requester_id: newRequest.requesterId,
        title: newRequest.title,
        reason: newRequest.reason,
        category: newRequest.category,
        status: newRequest.status,
        location: newRequest.location,
        created_at: newRequest.createdAt,
        coordinates_lat: newRequest.coordinates?.lat,
        coordinates_lng: newRequest.coordinates?.lng,
        shipping_address: newRequest.shippingAddress,
        enriched_data: newRequest.enrichedData
      });
      
      if (error) throw error;
      
      handleNavigate('feed');
      showToast('Request posted successfully!');
      // Fetch will happen automatically via realtime subscription
    } catch (err) {
      console.error(err);
      showToast('Failed to save request', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddForumThread = (thread: ForumThread) => {
    setForumThreads([thread, ...forumThreads]);
    showToast('Discussion started!');
  };
  
  const handleAddForumReply = (reply: ForumReply) => {
    setForumThreads(prev => prev.map(t => {
      if (t.id === reply.threadId) {
        return { ...t, replies: [...t.replies, reply] };
      }
      return t;
    }));
    
    const thread = forumThreads.find(t => t.id === reply.threadId);
    if (thread && thread.authorId !== currentUser.id) {
       addNotification(thread.authorId, `${currentUser.displayName} replied to your discussion: "${thread.title}"`);
    }
  };

  const handleOpenFulfillment = (request: RequestItem) => {
    setActiveRequest(request);
    setIsFulfillmentModalOpen(true);
  };

  const handleCommit = async (requestId: string) => {
    const targetRequest = requests.find(r => r.id === requestId);
    if (!targetRequest) return;

    try {
      const { error } = await supabase
        .from('requests')
        .update({ status: RequestStatus.PENDING, fulfiller_id: currentUser.id })
        .eq('id', requestId);

      if (error) throw error;

      setActiveRequest(prev => prev ? { ...prev, status: RequestStatus.PENDING, fulfillerId: currentUser.id } : null);
      
      addNotification(
        targetRequest.requesterId, 
        `${currentUser.displayName} has committed to buy your "${targetRequest.title}"! They will confirm purchase soon.`,
        requestId
      );

      showToast('You committed to this request! Don\'t forget to buy it.');
    } catch (err) {
      showToast('Failed to update request', 'error');
    }
  };

  const handleConfirmPurchase = async (requestId: string, orderId: string, receiptImage?: string, giftMessage?: string, verificationStatus?: 'verified' | 'warning') => {
    const targetRequest = requests.find(r => r.id === requestId);
    if (!targetRequest) return;

    try {
      const { error } = await supabase
        .from('requests')
        .update({ 
          status: RequestStatus.FULFILLED, 
          tracking_number: orderId,
          proof_of_purchase_image: receiptImage,
          gift_message: giftMessage,
          receipt_verification_status: verificationStatus
        })
        .eq('id', requestId);

      if (error) throw error;

      setIsFulfillmentModalOpen(false);
      setActiveRequest(null);

      addNotification(
        targetRequest.requesterId,
        `${currentUser.displayName} has purchased your item! Order ID: ${orderId}.${verificationStatus === 'verified' ? ' Proof of Purchase Verified!' : ''}`,
        requestId
      );
      
      const myFulfillments = requests.filter(r => r.fulfillerId === currentUser.id && (r.status === RequestStatus.FULFILLED || r.status === RequestStatus.RECEIVED));
      const currentCount = myFulfillments.length + 1;
      checkAndAwardBadges(currentUser, currentCount, verificationStatus === 'verified');

      showToast('Purchase confirmed! The requester has been notified.');
    } catch (err) {
      showToast('Failed to confirm purchase', 'error');
    }
  };

  const handleUpdateTracking = async (requestId: string, trackingNumber: string) => {
    const targetRequest = requests.find(r => r.id === requestId);
    if (!targetRequest) return;

    try {
      const { error } = await supabase
        .from('requests')
        .update({ tracking_number: trackingNumber })
        .eq('id', requestId);

      if (error) throw error;

      setIsFulfillmentModalOpen(false);
      setActiveRequest(null);

      addNotification(
        targetRequest.requesterId,
        `Tracking update for "${targetRequest.title}": ${trackingNumber}`,
        requestId
      );

      showToast('Tracking number updated successfully.');
    } catch (err) {
      showToast('Failed to update tracking', 'error');
    }
  };

  const handleMarkReceived = (request: RequestItem) => {
    setThankYouModalRequest(request);
  };

  const submitThankYou = async (message: string, forumPostData?: { title: string, content: string }) => {
    if (!thankYouModalRequest) return;
    
    try {
      const { error } = await supabase
        .from('requests')
        .update({ 
          status: RequestStatus.RECEIVED, 
          thank_you_message: message 
        })
        .eq('id', thankYouModalRequest.id);

      if (error) throw error;

      if (thankYouModalRequest.fulfillerId) {
        addNotification(
          thankYouModalRequest.fulfillerId,
          `${currentUser.displayName} received the "${thankYouModalRequest.title}" and says: "${message}"`,
          thankYouModalRequest.id
        );
      }

      if (forumPostData) {
          const thread: ForumThread = {
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
          setForumThreads(prev => [thread, ...prev]);
          showToast('Shared as a success story on the forum!');
      } else {
          showToast('Item marked received!');
      }

      setThankYouModalRequest(null);
    } catch (err) {
      showToast('Failed to mark received', 'error');
    }
  };

  const handleAddComment = async (requestId: string, text: string) => {
      const targetRequest = requests.find(r => r.id === requestId);
      if (!targetRequest) return;

      const newComment = { 
        id: `c_${Date.now()}`, 
        userId: currentUser.id, 
        text, 
        createdAt: new Date().toISOString() 
      };
      
      const updatedComments = [...targetRequest.comments, newComment];

      try {
        const { error } = await supabase
          .from('requests')
          .update({ comments: updatedComments })
          .eq('id', requestId);

        if (error) throw error;

        // Notifications logic remains local for now as we don't have a notifications table yet
        if (targetRequest.requesterId !== currentUser.id) {
            addNotification(
              targetRequest.requesterId,
              `${currentUser.displayName} commented on "${targetRequest.title}"`,
              requestId
            );
        }
      } catch (err) {
        showToast('Failed to post comment', 'error');
      }
  };

  if (loading && requests.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-medium">Connecting to Community...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-12">
      <Navbar 
        currentView={currentView}
        onNavigate={handleNavigate}
        user={currentUser}
        allUsers={allUsers}
        onSwitchUser={handleSwitchUser}
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
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                 <div className="bg-white p-1 rounded-lg border border-slate-200 flex shadow-sm">
                    <button 
                      onClick={() => setFeedMode('list')}
                      className={`p-2 rounded-md transition-all ${feedMode === 'list' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      title="List View"
                    >
                      <List className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => setFeedMode('map')}
                      className={`p-2 rounded-md transition-all ${feedMode === 'map' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      title="Map View"
                    >
                      <Map className="h-4 w-4" />
                    </button>
                 </div>

                 <select 
                   className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm focus:ring-indigo-500"
                   value={categoryFilter}
                   onChange={(e) => setCategoryFilter(e.target.value as Category | 'All')}
                 >
                   <option value="All">All Categories</option>
                   {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
              </div>
            </div>

            <RecommendedRequests 
               currentUser={currentUser} 
               requests={requests} 
               onSelectRequest={(r) => { setActiveRequest(r); setIsFulfillmentModalOpen(true); }} 
            />

            {feedMode === 'map' ? (
              <div className="mb-8">
                <RequestMap 
                  currentUser={currentUser} 
                  requests={requests} 
                  onSelectRequest={(r) => { setActiveRequest(r); setIsFulfillmentModalOpen(true); }}
                  categoryFilter={categoryFilter}
                  searchTerm={searchTerm}
                />
              </div>
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
                      requester={users[req.requesterId] || MOCK_USERS['user_1']} 
                      onFulfill={handleOpenFulfillment}
                      onMarkReceived={handleMarkReceived}
                      onViewProfile={handleViewProfile}
                      onAddComment={handleAddComment}
                      currentUser={currentUser}
                    />
                  ))}
                  
                  {requests.length === 0 && !loading && (
                    <div className="col-span-full text-center py-12 text-slate-400">
                       <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                       <p>No active requests found. Be the first to ask!</p>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}

        {currentView === 'leaderboard' && (
           <Leaderboard users={allUsers} requests={requests} />
        )}

        {currentView === 'forum' && (
           <Forum 
             currentUser={currentUser}
             users={users}
             threads={forumThreads}
             onAddThread={handleAddForumThread}
             onAddReply={handleAddForumReply}
           />
        )}

        {currentView === 'create' && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button 
                onClick={() => setCurrentView('feed')} 
                className="mb-4 text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Feed
              </button>
              <CreateRequest 
                currentUser={currentUser} 
                onSubmit={handleCreateRequest}
                onCancel={() => setCurrentView('feed')}
              />
           </div>
        )}

        {currentView === 'profile' && viewingProfileId && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <button 
                onClick={() => setCurrentView('feed')} 
                className="mb-4 text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Feed
              </button>
              
             <UserProfile 
               user={users[viewingProfileId]} 
               requests={requests}
               isCurrentUser={viewingProfileId === currentUser.id}
               onEditProfile={() => setIsEditProfileOpen(true)}
             />

             <div className="flex border-b border-slate-200 mb-6">
                <button 
                  onClick={() => setProfileTab('requests')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${profileTab === 'requests' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  My Requests
                </button>
                <button 
                  onClick={() => setProfileTab('commitments')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${profileTab === 'commitments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  My Commitments
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requests
                  .filter(r => profileTab === 'requests' ? r.requesterId === viewingProfileId : r.fulfillerId === viewingProfileId)
                  .map(req => (
                    <RequestCard 
                      key={req.id} 
                      request={req} 
                      requester={users[req.requesterId] || MOCK_USERS['user_1']}
                      onFulfill={handleOpenFulfillment}
                      onMarkReceived={handleMarkReceived}
                      onViewProfile={handleViewProfile}
                      onAddComment={handleAddComment}
                      currentUser={currentUser}
                    />
                  ))}
             </div>
           </div>
        )}
      </div>

      {activeRequest && (
        <FulfillmentModal 
          isOpen={isFulfillmentModalOpen}
          onClose={() => { setIsFulfillmentModalOpen(false); setActiveRequest(null); }}
          request={activeRequest}
          currentUser={currentUser}
          onCommit={handleCommit}
          onConfirmPurchase={handleConfirmPurchase}
          onUpdateTracking={handleUpdateTracking}
        />
      )}

      {thankYouModalRequest && (
        <ThankYouModal
          isOpen={!!thankYouModalRequest}
          onClose={() => setThankYouModalRequest(null)}
          itemTitle={thankYouModalRequest.title}
          originalReason={thankYouModalRequest.reason}
          donorName={users[thankYouModalRequest.fulfillerId || '']?.displayName}
          onSubmit={submitThankYou}
        />
      )}

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        user={currentUser}
        onSave={handleUpdateUser}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default App;