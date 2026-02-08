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
        className={`h-9 px-4 rounded-xl flex items-center gap-2 text-sm font-bold transition-all ${
            active 
            ? 'bg-cyan-100 text-cyan-700' 
            : 'text-slate-500 hover:text-cyan-600 hover:bg-cyan-50'
        }`}
      >
          {Icon && <Icon className="h-4 w-4" />}
          {label}
      </button>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/50 h-16 shadow-sm" ref={navRef}>
      <div className="max-w-7xl mx-auto px-4 h-full">
        <div className="flex justify-between items-center h-full">
          
          <div className="flex items-center h-full gap-6">
              {/* Logo */}
              <div className="flex items-center cursor-pointer gap-2" onClick={() => onNavigate('feed')}>
                <div className="bg-gradient-to-tr from-cyan-400 to-blue-500 text-white p-2 rounded-xl shadow-lg shadow-cyan-500/20 transform rotate-3 hover:rotate-6 transition-transform">
                    <Gift className="h-5 w-5" />
                </div>
                <span className="font-bold text-xl tracking-tight text-slate-800">buymethis</span>
              </div>
              
              {/* Desktop Nav */}
              <div className="hidden md:flex items-center gap-2">
                <NavItem id="feed" label="Feed" icon={Globe} active={currentView === 'feed'} />
                <NavItem id="forum" label="Forum" icon={MessageSquare} active={currentView === 'forum'} />
                <NavItem id="leaderboard" label="Rankings" icon={Trophy} active={currentView === 'leaderboard'} />
              </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Request Button */}
            <div className="hidden md:block">
                 <button
                    onClick={() => onNavigate('create')}
                    className="flex items-center gap-2 px-5 py-2 bg-slate-800 text-white text-sm font-bold hover:bg-slate-900 transition-colors rounded-full shadow-lg shadow-slate-900/20"
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
                        className={`p-2.5 rounded-full hover:bg-cyan-50 transition-colors relative ${activeMenu === 'notifications' ? 'bg-cyan-100 text-cyan-600' : 'text-slate-500'}`}
                    >
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 block h-3 w-3 bg-pink-500 rounded-full border-2 border-white animate-bounce" />
                        )}
                    </button>

                    {activeMenu === 'notifications' && (
                        <div className="absolute top-full right-[-60px] md:right-0 mt-2 w-80 bg-white/95 backdrop-blur-xl border border-cyan-100 shadow-glow rounded-2xl z-50 overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 bg-cyan-50/50 flex justify-between items-center">
                                <span className="text-xs font-bold uppercase text-cyan-600 tracking-wider">Notifications</span>
                                {unreadCount > 0 && <span className="bg-pink-100 text-pink-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{unreadCount} New</span>}
                            </div>
                            <div className="max-h-80 overflow-y-auto custom-scrollbar p-2">
                                {notifications.length > 0 ? (
                                notifications.map((n) => (
                                    <div key={n.id} className={`p-3 mb-1 rounded-xl hover:bg-cyan-50 transition-colors ${!n.isRead ? 'bg-blue-50/50 border border-blue-100' : ''}`}>
                                        <div className="flex gap-3">
                                            <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.type === 'success' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : n.type === 'alert' ? 'bg-pink-500' : 'bg-cyan-400'}`} />
                                            <div>
                                                <p className="text-sm text-slate-700 leading-snug font-medium">{n.message}</p>
                                                <span className="text-[10px] text-slate-400 mt-1 block font-mono">{new Date(n.createdAt).toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                                ) : (
                                <div className="px-5 py-8 text-center">
                                    <p className="text-slate-400 text-xs">No notifications yet.</p>
                                </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* User Profile / Auth */}
            <div className="relative">
              {user ? (
                  <>
                    <button
                        onClick={() => toggleMenu('user')}
                        className={`flex items-center gap-2 pl-1 pr-3 py-1 hover:bg-white/60 transition-colors rounded-full border border-transparent hover:border-cyan-100 ${activeMenu === 'user' ? 'bg-white border-cyan-200' : ''}`}
                    >
                        <img src={user.avatarUrl} alt={user.displayName} className="h-8 w-8 object-cover rounded-full border-2 border-white shadow-sm" />
                        <span className="hidden md:block text-sm font-bold text-slate-700">{user.displayName}</span>
                        <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${activeMenu === 'user' ? 'rotate-180' : ''}`} />
                    </button>

                    {activeMenu === 'user' && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl border border-cyan-100 shadow-glow z-50 rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-cyan-100">
                                <p className="text-sm font-bold text-slate-800">{user.displayName}</p>
                                <p className="text-xs text-cyan-600 font-medium">@{user.handle}</p>
                            </div>
                            
                            <div className="p-2">
                                {user.isAdmin && (
                                    <button 
                                    onClick={() => { onNavigate('admin'); setActiveMenu('none'); }}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-cyan-50 hover:text-cyan-600 flex items-center gap-2 transition-colors rounded-xl"
                                    >
                                    <Shield className="h-4 w-4" /> Admin Console
                                    </button>
                                )}

                                <button 
                                onClick={() => { onNavigate('profile'); setActiveMenu('none'); }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-cyan-50 hover:text-cyan-600 flex items-center gap-2 transition-colors rounded-xl"
                                >
                                <UserIcon className="h-4 w-4" /> My Profile
                                </button>
                            </div>

                            <div className="border-t border-slate-100 p-2">
                                <button 
                                    onClick={() => { onLogout(); setActiveMenu('none'); }}
                                    className="w-full text-left px-4 py-2 text-sm text-pink-500 hover:bg-pink-50 hover:text-pink-600 flex items-center gap-2 transition-colors rounded-xl font-medium"
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
                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-bold hover:shadow-lg hover:shadow-cyan-500/25 transition-all rounded-full"
                  >
                      <LogIn className="h-4 w-4" />
                      <span className="hidden sm:inline">Log In</span>
                  </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2 text-slate-600 hover:bg-cyan-50 hover:text-cyan-600 rounded-full" onClick={() => toggleMenu('mobile')}>
                {activeMenu === 'mobile' ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {activeMenu === 'mobile' && (
            <div className="md:hidden absolute top-20 left-4 right-4 bg-white/95 backdrop-blur-xl border border-cyan-100 shadow-glow z-40 rounded-3xl p-2 overflow-hidden animate-in slide-in-from-top-4 fade-in">
                <div className="flex flex-col gap-1">
                    <button onClick={() => { onNavigate('feed'); setActiveMenu('none'); }} className="p-4 rounded-xl text-left font-bold text-slate-700 flex items-center gap-3 hover:bg-cyan-50 hover:text-cyan-600">
                        <Globe className="h-5 w-5 text-cyan-400" /> Feed
                    </button>
                    <button onClick={() => { onNavigate('forum'); setActiveMenu('none'); }} className="p-4 rounded-xl text-left font-bold text-slate-700 flex items-center gap-3 hover:bg-cyan-50 hover:text-cyan-600">
                        <MessageSquare className="h-5 w-5 text-cyan-400" /> Forum
                    </button>
                    <button onClick={() => { onNavigate('leaderboard'); setActiveMenu('none'); }} className="p-4 rounded-xl text-left font-bold text-slate-700 flex items-center gap-3 hover:bg-cyan-50 hover:text-cyan-600">
                        <Trophy className="h-5 w-5 text-cyan-400" /> Rankings
                    </button>
                    {user?.isAdmin && (
                        <button onClick={() => { onNavigate('admin'); setActiveMenu('none'); }} className="p-4 rounded-xl text-left font-bold text-purple-700 flex items-center gap-3 hover:bg-purple-50">
                            <Shield className="h-5 w-5 text-purple-500" /> Admin
                        </button>
                    )}
                    <button onClick={() => { onNavigate('create'); setActiveMenu('none'); }} className="p-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-left font-bold flex items-center gap-3 shadow-lg shadow-cyan-500/20 mt-2">
                        <Plus className="h-5 w-5" /> Post Request
                    </button>
                </div>
            </div>
        )}
      </div>
    </nav>
  );
};