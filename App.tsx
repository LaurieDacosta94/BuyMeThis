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
import { Filter, Search, Package, Gift, ArrowLeft, Map, List } from 'lucide-react';
import { calculateDistance } from './utils/geo';

// MOCK DATA GENERATORS
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

const INITIAL_REQUESTS: RequestItem[] = [
  {
    id: 'req_1',
    requesterId: 'user_2',
    title: 'Acrylic Paint Set',
    productUrl: 'https://example.com/paints',
    reason: 'I am running low on primary colors for my final thesis piece. This set has everything I need to finish the series.',
    shippingAddress: 'Sarah Chen\n123 Art Ave\nSeattle, WA 98101',
    status: RequestStatus.OPEN,
    category: Category.ART_HOBBY,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    location: 'Seattle, WA',
    coordinates: { lat: 47.6062, lng: -122.3321 },
    enrichedData: {
      title: 'Professional Acrylics 12ct',
      price: 24.99,
      description: 'High viscosity acrylic paint set.',
      imageUrl: 'https://picsum.photos/seed/req1/400/300'
    },
    comments: [
      { id: 'c1', userId: 'user_1', text: 'Do you need heavy body or fluid acrylics?', createdAt: new Date(Date.now() - 3600000).toISOString() }
    ]
  },
  {
    id: 'req_2',
    requesterId: 'user_3',
    title: 'Clean Code Book',
    productUrl: 'https://example.com/book',
    reason: 'Trying to improve my coding standards as I apply for my first junior dev role.',
    shippingAddress: 'Marcus Johnson\n456 Tech Blvd\nAustin, TX 78701',
    status: RequestStatus.FULFILLED,
    category: Category.EDUCATION,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    location: 'Austin, TX',
    coordinates: { lat: 30.2672, lng: -97.7431 },
    enrichedData: {
      title: 'Clean Code: A Handbook',
      price: 35.00,
      description: 'Software engineering principles.',
      imageUrl: 'https://picsum.photos/seed/req2/400/300'
    },
    comments: []
  },
  {
     id: 'req_3',
     requesterId: 'user_1',
     title: 'Garden Rake',
     productUrl: 'https://example.com/rake',
     reason: 'Volunteering at the community garden this weekend and we are short on tools.',
     shippingAddress: 'Alex Rivera\n789 Green St\nPortland, OR 97204',
     status: RequestStatus.OPEN,
     category: Category.TOOLS,
     createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
     location: 'Portland, OR',
     // Coordinates slightly offset from user_1 to show on map
     coordinates: { lat: 45.5200, lng: -122.6800 },
     enrichedData: {
       title: 'Heavy Duty Bow Rake',
       price: 22.50,
       description: 'Steel tine rake for gardening.',
       imageUrl: 'https://picsum.photos/seed/req3/400/300'
     },
     comments: []
  }
];

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

  // Data Persistence
  const [users, setUsers] = useState<Record<string, User>>(() => {
    const saved = localStorage.getItem('buymethis_users');
    return saved ? JSON.parse(saved) : MOCK_USERS;
  });

  const [requests, setRequests] = useState<RequestItem[]>(() => {
    const saved = localStorage.getItem('buymethis_requests');
    return saved ? JSON.parse(saved) : INITIAL_REQUESTS;
  });
  
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

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('buymethis_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('buymethis_requests', JSON.stringify(requests));
  }, [requests]);

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

  // Badge Logic
  const checkAndAwardBadges = (user: User, completedRequestsCount: number, hasVerifiedReceipt: boolean) => {
    const newBadges = [...user.badges];
    let awarded = false;
    let badgeName = '';

    // First Gift
    if (completedRequestsCount >= 1 && !newBadges.find(b => b.id === 'first_gift')) {
      newBadges.push({ id: 'first_gift', label: 'First Gift', icon: 'heart', description: 'Fulfilled your first request', color: 'bg-pink-500' });
      awarded = true;
      badgeName = 'First Gift';
    }

    // Community Star
    if (completedRequestsCount >= 3 && !newBadges.find(b => b.id === 'community_star')) {
      newBadges.push({ id: 'community_star', label: 'Community Star', icon: 'star', description: 'Fulfilled 3 requests', color: 'bg-indigo-500' });
      awarded = true;
      badgeName = 'Community Star';
    }
    
    // Verified Hero (If receipt is verified)
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

  // Action Handlers
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

  const handleCreateRequest = (newRequest: RequestItem) => {
    setRequests([newRequest, ...requests]);
    handleNavigate('feed');
    showToast('Request posted successfully!');
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
    
    // Notify thread author
    const thread = forumThreads.find(t => t.id === reply.threadId);
    if (thread && thread.authorId !== currentUser.id) {
       addNotification(thread.authorId, `${currentUser.displayName} replied to your discussion: "${thread.title}"`);
    }
  };

  const handleOpenFulfillment = (request: RequestItem) => {
    setActiveRequest(request);
    setIsFulfillmentModalOpen(true);
  };

  const handleCommit = (requestId: string) => {
    const targetRequest = requests.find(r => r.id === requestId);
    if (!targetRequest) return;

    setRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        return { ...req, status: RequestStatus.PENDING, fulfillerId: currentUser.id };
      }
      return req;
    }));

    setActiveRequest(prev => prev ? { ...prev, status: RequestStatus.PENDING, fulfillerId: currentUser.id } : null);
    
    addNotification(
      targetRequest.requesterId, 
      `${currentUser.displayName} has committed to buy your "${targetRequest.title}"! They will confirm purchase soon.`,
      requestId
    );

    showToast('You committed to this request! Don\'t forget to buy it.');
  };

  const handleConfirmPurchase = (requestId: string, orderId: string, receiptImage?: string, giftMessage?: string, verificationStatus?: 'verified' | 'warning') => {
    const targetRequest = requests.find(r => r.id === requestId);
    
    setRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        return { 
          ...req, 
          status: RequestStatus.FULFILLED, 
          trackingNumber: orderId,
          proofOfPurchaseImage: receiptImage,
          giftMessage: giftMessage,
          receiptVerificationStatus: verificationStatus
        };
      }
      return req;
    }));
    
    setIsFulfillmentModalOpen(false);
    setActiveRequest(null);

    if (targetRequest) {
      addNotification(
        targetRequest.requesterId,
        `${currentUser.displayName} has purchased your item! Order ID: ${orderId}.${verificationStatus === 'verified' ? ' Proof of Purchase Verified!' : ''}`,
        requestId
      );
    }
    
    // Calculate new stats for badges
    const myFulfillments = requests.filter(r => r.fulfillerId === currentUser.id && (r.status === RequestStatus.FULFILLED || r.status === RequestStatus.RECEIVED));
    const currentCount = myFulfillments.length + 1;
    
    // Pass verification status for badges logic
    checkAndAwardBadges(currentUser, currentCount, verificationStatus === 'verified');

    showToast('Purchase confirmed! The requester has been notified.');
  };

  const handleUpdateTracking = (requestId: string, trackingNumber: string) => {
    const targetRequest = requests.find(r => r.id === requestId);

    setRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        return { ...req, trackingNumber: trackingNumber };
      }
      return req;
    }));
    
    setIsFulfillmentModalOpen(false);
    setActiveRequest(null);

    if (targetRequest) {
      addNotification(
        targetRequest.requesterId,
        `Tracking update for "${targetRequest.title}": ${trackingNumber}`,
        requestId
      );
    }

    showToast('Tracking number updated successfully.');
  };

  const handleMarkReceived = (request: RequestItem) => {
    setThankYouModalRequest(request);
  };

  const submitThankYou = (message: string, forumPostData?: { title: string, content: string }) => {
    if (!thankYouModalRequest) return;
    
    setRequests(prev => prev.map(req => {
      if (req.id === thankYouModalRequest.id) {
        return { ...req, status: RequestStatus.RECEIVED, thankYouMessage: message };
      }
      return req;
    }));
    
    if (thankYouModalRequest.fulfillerId) {
      addNotification(
        thankYouModalRequest.fulfillerId,
        `${currentUser.displayName} received the "${thankYouModalRequest.title}" and says: "${message}"`,
        thankYouModalRequest.id
      );
    }

    // Auto-Post to Forum if requested
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
  };

  const handleAddComment = (requestId: string, text: string) => {
      setRequests(prev => prev.map(r => {
          if (r.id === requestId) {
              return {
                  ...r,
                  comments: [...r.comments, { id: `c_${Date.now()}`, userId: currentUser.id, text, createdAt: new Date().toISOString() }]
              };
          }
          return r;
      }));

      // Notify Request Owner if it's not them commenting
      const req = requests.find(r => r.id === requestId);
      if (req && req.requesterId !== currentUser.id) {
          addNotification(
            req.requesterId,
            `${currentUser.displayName} commented on "${req.title}"`,
            requestId
          );
      }
      // Notify Fulfiller if exists and it's not them
      if (req && req.fulfillerId && req.fulfillerId !== currentUser.id && req.requesterId !== currentUser.id) {
          addNotification(
              req.fulfillerId,
              `${currentUser.displayName} commented on "${req.title}"`,
              requestId
          );
      }
  };

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
                      requester={users[req.requesterId]}
                      onFulfill={handleOpenFulfillment}
                      onMarkReceived={handleMarkReceived}
                      onViewProfile={handleViewProfile}
                      onAddComment={handleAddComment}
                      currentUser={currentUser}
                    />
                  ))}
                  
                  {requests.filter(r => {
                    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || r.reason.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesCategory = categoryFilter === 'All' || r.category === categoryFilter;
                    return matchesSearch && matchesCategory;
                  }).length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-400">
                       <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                       <p>No requests found matching your filters.</p>
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

             {/* Profile Tabs */}
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
                      requester={users[req.requesterId]}
                      onFulfill={handleOpenFulfillment}
                      onMarkReceived={handleMarkReceived}
                      onViewProfile={handleViewProfile}
                      onAddComment={handleAddComment}
                      currentUser={currentUser}
                    />
                  ))}
                  
                 {requests.filter(r => profileTab === 'requests' ? r.requesterId === viewingProfileId : r.fulfillerId === viewingProfileId).length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-400">
                       <p>No items found.</p>
                    </div>
                 )}
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