import React, { useState, useRef, useEffect } from 'react';
import { Gift, Plus, Globe, Bell, ChevronDown, User as UserIcon, LogOut, Trophy, MessageSquare, LogIn, Menu, X, Shield, Search } from 'lucide-react';
import { User, Notification } from '../types';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  user: User | null;
  allUsers: User[];
  onSwitchUser: (userId: string) => void;
  onLogout: () => void;
  onLogin: () => void;
  notifications: Notification[];
  onMarkNotificationsRead: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentView, 
  onNavigate, 
  user, 
  allUsers, 
  onSwitchUser,
  onLogout,
  onLogin,
  notifications,
  onMarkNotificationsRead
}) => {
  const [activeMenu, setActiveMenu] = useState<'none' | 'notifications' | 'user' | 'mobile'>('none');
  const navRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveMenu('none');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (menu: 'notifications' | 'user' | 'mobile') => {
    if (activeMenu === menu) {
      setActiveMenu('none');
    } else {
      setActiveMenu(menu);
      if (menu === 'notifications' && unreadCount > 0) {
        onMarkNotificationsRead();
      }
    }
  };

  const NavItem = ({ id, label, icon: Icon, active }: any) => (
      <button
        onClick={() => { onNavigate(id); setActiveMenu('none'); }}
        className={`h-full px-4 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${
            active 
            ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
            : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
        }`}
      >
          {Icon && <Icon className="h-4 w-4" />}
          {label}
      </button>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 h-16" ref={navRef}>
      <div className="max-w-7xl mx-auto px-4 h-full">
        <div className="flex justify-between items-center h-full">
          
          <div className="flex items-center h-full gap-8">
              {/* Logo */}
              <div className="flex items-center cursor-pointer gap-2" onClick={() => onNavigate('feed')}>
                <div className="bg-blue-600 text-white p-1.5 rounded-none">
                    <Gift className="h-5 w-5" />
                </div>
                <span className="font-bold text-xl tracking-tight text-slate-900 uppercase">buymethis</span>
              </div>
              
              {/* Desktop Nav */}
              <div className="hidden md:flex h-full">
                <NavItem id="feed" label="Feed" icon={Globe} active={currentView === 'feed'} />
                <NavItem id="forum" label="Forum" icon={MessageSquare} active={currentView === 'forum'} />
                <NavItem id="leaderboard" label="Rankings" icon={Trophy} active={currentView === 'leaderboard'} />
              </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Request Button */}
            <div className="hidden md:block mr-2">
                 <button
                    onClick={() => onNavigate('create')}
                    className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors rounded-none"
                 >
                    <Plus className="h-4 w-4" />
                    <span>Post Request</span>
                 </button>
            </div>

            {/* Notifications */}
            {user && (
                <div className="relative h-full flex items-center">
                    <button
                        onClick={() => toggleMenu('notifications')}
                        className={`p-2 relative hover:bg-slate-100 transition-colors rounded-none ${activeMenu === 'notifications' ? 'bg-slate-100' : ''}`}
                    >
                        <Bell className="h-5 w-5 text-slate-600" />
                        {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 block h-2.5 w-2.5 bg-red-500 rounded-none border border-white" />
                        )}
                    </button>

                    {activeMenu === 'notifications' && (
                        <div className="absolute top-full right-[-60px] md:right-0 mt-0 w-80 bg-white border border-slate-200 shadow-xl z-50 rounded-none">
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Notifications</span>
                                {unreadCount > 0 && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 font-bold">{unreadCount} New</span>}
                            </div>
                            <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                {notifications.length > 0 ? (
                                notifications.map((n) => (
                                    <div key={n.id} className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-blue-50/30' : ''}`}>
                                        <div className="flex gap-3">
                                            <div className={`mt-1.5 w-1.5 h-1.5 shrink-0 ${n.type === 'success' ? 'bg-green-500' : n.type === 'alert' ? 'bg-red-500' : 'bg-blue-500'}`} />
                                            <div>
                                                <p className="text-sm text-slate-800 leading-snug">{n.message}</p>
                                                <span className="text-[10px] text-slate-400 mt-1 block font-mono">{new Date(n.createdAt).toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                                ) : (
                                <div className="px-5 py-8 text-center">
                                    <p className="text-slate-400 text-xs">No notifications.</p>
                                </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* User Profile / Auth */}
            <div className="relative ml-2">
              {user ? (
                  <>
                    <button
                        onClick={() => toggleMenu('user')}
                        className={`flex items-center gap-3 pl-1 pr-2 py-1 hover:bg-slate-100 transition-colors rounded-none border border-transparent hover:border-slate-200 ${activeMenu === 'user' ? 'bg-slate-100 border-slate-200' : ''}`}
                    >
                        <img src={user.avatarUrl} alt={user.displayName} className="h-8 w-8 object-cover bg-slate-200 rounded-none" />
                        <span className="hidden md:block text-sm font-medium text-slate-700">{user.displayName}</span>
                        <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${activeMenu === 'user' ? 'rotate-180' : ''}`} />
                    </button>

                    {activeMenu === 'user' && (
                        <div className="absolute top-full right-0 mt-0 w-56 bg-white border border-slate-200 shadow-xl z-50 rounded-none">
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                                <p className="text-sm font-bold text-slate-900">{user.displayName}</p>
                                <p className="text-xs text-slate-500 font-mono">@{user.handle}</p>
                            </div>
                            
                            <div className="py-1">
                                {user.isAdmin && (
                                    <button 
                                    onClick={() => { onNavigate('admin'); setActiveMenu('none'); }}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 transition-colors"
                                    >
                                    <Shield className="h-4 w-4" /> Admin Console
                                    </button>
                                )}

                                <button 
                                onClick={() => { onNavigate('profile'); setActiveMenu('none'); }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 transition-colors"
                                >
                                <UserIcon className="h-4 w-4" /> My Profile
                                </button>
                            </div>

                            <div className="border-t border-slate-100 py-1">
                                <button 
                                    onClick={() => { onLogout(); setActiveMenu('none'); }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                >
                                <LogOut className="h-4 w-4" /> Log Out
                                </button>
                            </div>
                        </div>
                    )}
                  </>
              ) : (
                  <button 
                    onClick={onLogin}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors rounded-none"
                  >
                      <LogIn className="h-4 w-4" />
                      <span className="hidden sm:inline">Log In</span>
                  </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-none ml-2" onClick={() => toggleMenu('mobile')}>
                {activeMenu === 'mobile' ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {activeMenu === 'mobile' && (
            <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-slate-200 shadow-lg z-40">
                <div className="flex flex-col">
                    <button onClick={() => { onNavigate('feed'); setActiveMenu('none'); }} className="p-4 border-b border-slate-100 text-left font-medium text-slate-700 flex items-center gap-3 hover:bg-slate-50">
                        <Globe className="h-5 w-5 text-blue-500" /> Feed
                    </button>
                    <button onClick={() => { onNavigate('forum'); setActiveMenu('none'); }} className="p-4 border-b border-slate-100 text-left font-medium text-slate-700 flex items-center gap-3 hover:bg-slate-50">
                        <MessageSquare className="h-5 w-5 text-blue-500" /> Forum
                    </button>
                    <button onClick={() => { onNavigate('leaderboard'); setActiveMenu('none'); }} className="p-4 border-b border-slate-100 text-left font-medium text-slate-700 flex items-center gap-3 hover:bg-slate-50">
                        <Trophy className="h-5 w-5 text-blue-500" /> Rankings
                    </button>
                    {user?.isAdmin && (
                        <button onClick={() => { onNavigate('admin'); setActiveMenu('none'); }} className="p-4 border-b border-slate-100 text-left font-medium text-purple-700 flex items-center gap-3 hover:bg-slate-50">
                            <Shield className="h-5 w-5 text-purple-500" /> Admin
                        </button>
                    )}
                    <button onClick={() => { onNavigate('create'); setActiveMenu('none'); }} className="p-4 bg-slate-50 text-blue-700 text-left font-bold flex items-center gap-3">
                        <Plus className="h-5 w-5" /> Post Request
                    </button>
                </div>
            </div>
        )}
      </div>
    </nav>
  );
};