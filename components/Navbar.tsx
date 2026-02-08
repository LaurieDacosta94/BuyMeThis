import React, { useState, useRef, useEffect } from 'react';
import { Gift, PlusCircle, Globe, Bell, ChevronDown, User as UserIcon, LogOut, Trophy, MessageSquare } from 'lucide-react';
import { User, Notification } from '../types';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  user: User;
  allUsers: User[];
  onSwitchUser: (userId: string) => void;
  notifications: Notification[];
  onMarkNotificationsRead: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentView, 
  onNavigate, 
  user, 
  allUsers, 
  onSwitchUser,
  notifications,
  onMarkNotificationsRead
}) => {
  const [activeMenu, setActiveMenu] = useState<'none' | 'notifications' | 'user'>('none');
  const navRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveMenu('none');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (menu: 'notifications' | 'user') => {
    if (activeMenu === menu) {
      setActiveMenu('none');
    } else {
      setActiveMenu(menu);
      if (menu === 'notifications' && unreadCount > 0) {
        onMarkNotificationsRead();
      }
    }
  };

  const handleSwitch = (userId: string) => {
    onSwitchUser(userId);
    setActiveMenu('none');
    onNavigate('feed'); // Reset to feed on switch
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200" ref={navRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center cursor-pointer" onClick={() => onNavigate('feed')}>
            <div className="flex-shrink-0 flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900">buymethis</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4">
            {/* View Buttons */}
            <div className="hidden sm:flex bg-slate-100/50 rounded-full p-1 border border-slate-200">
                <button
                onClick={() => onNavigate('feed')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${currentView === 'feed' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                aria-label="Feed"
                >
                <Globe className="h-4 w-4" /> Feed
                </button>
                <button
                onClick={() => onNavigate('forum')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${currentView === 'forum' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                aria-label="Community"
                >
                <MessageSquare className="h-4 w-4" /> Community
                </button>
                <button
                onClick={() => onNavigate('leaderboard')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${currentView === 'leaderboard' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                aria-label="Leaderboard"
                >
                <Trophy className="h-4 w-4" /> Leaderboard
                </button>
            </div>
            
            {/* Mobile View Buttons (Simplified) */}
            <div className="flex sm:hidden">
                 <button
                onClick={() => onNavigate('feed')}
                className={`p-2 rounded-full transition-colors ${currentView === 'feed' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}
                >
                <Globe className="h-5 w-5" />
                </button>
                 <button
                onClick={() => onNavigate('forum')}
                className={`p-2 rounded-full transition-colors ${currentView === 'forum' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}
                >
                <MessageSquare className="h-5 w-5" />
                </button>
                <button
                onClick={() => onNavigate('leaderboard')}
                className={`p-2 rounded-full transition-colors ${currentView === 'leaderboard' ? 'bg-amber-50 text-amber-600' : 'text-slate-500'}`}
                >
                <Trophy className="h-5 w-5" />
                </button>
            </div>

            <button
              onClick={() => onNavigate('create')}
              className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-full text-sm font-medium transition-colors shadow-sm ${currentView === 'create' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
            >
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Request</span>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => toggleMenu('notifications')}
                className={`p-2 rounded-full transition-colors relative ${activeMenu === 'notifications' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </button>

              {activeMenu === 'notifications' && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-900">Notifications</span>
                    {unreadCount > 0 && <span className="text-xs text-indigo-600 font-medium">{unreadCount} New</span>}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div key={n.id} className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-indigo-50/30' : ''}`}>
                          <p className="text-sm text-slate-800 leading-snug">{n.message}</p>
                          <span className="text-xs text-slate-400 mt-1 block">{new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-slate-400 text-sm">
                        No notifications yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile / Switcher */}
            <div className="relative">
              <button
                onClick={() => toggleMenu('user')}
                className={`flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-full border transition-all ${activeMenu === 'user' ? 'border-indigo-200 bg-indigo-50 ring-2 ring-indigo-100' : 'border-transparent hover:bg-slate-50'}`}
              >
                <img src={user.avatarUrl} alt={user.displayName} className="h-8 w-8 rounded-full object-cover bg-slate-200" />
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${activeMenu === 'user' ? 'rotate-180' : ''}`} />
              </button>

              {activeMenu === 'user' && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-3 border-b border-slate-50">
                    <p className="text-sm font-semibold text-slate-900">{user.displayName}</p>
                    <p className="text-xs text-slate-500">@{user.handle}</p>
                  </div>
                  
                  <div className="py-1">
                    <button 
                      onClick={() => { onNavigate('profile'); setActiveMenu('none'); }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <UserIcon className="h-4 w-4" /> My Profile
                    </button>
                  </div>

                  <div className="border-t border-slate-50 pt-1 pb-1">
                    <div className="px-4 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Switch User</div>
                    {allUsers.filter(u => u.id !== user.id).map(u => (
                      <button
                        key={u.id}
                        onClick={() => handleSwitch(u.id)}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                         <img src={u.avatarUrl} className="w-5 h-5 rounded-full" alt="" />
                         {u.displayName}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-50 py-1">
                     <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                       <LogOut className="h-4 w-4" /> Log Out
                     </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};