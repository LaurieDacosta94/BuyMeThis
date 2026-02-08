import React, { useState, useRef, useEffect } from 'react';
import { Gift, PlusCircle, Globe, Bell, ChevronDown, User as UserIcon, LogOut, Trophy, MessageSquare, LogIn, Menu, X } from 'lucide-react';
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
        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
            active 
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
        }`}
      >
          {Icon && <Icon className="h-4 w-4" />}
          {label}
      </button>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 pt-4 pb-2" ref={navRef}>
      <div className="max-w-7xl mx-auto bg-white/90 backdrop-blur-xl border border-white/20 shadow-lg shadow-indigo-900/5 rounded-2xl px-6 py-3">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center cursor-pointer group" onClick={() => onNavigate('feed')}>
            <div className="relative mr-3">
               <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
               <div className="relative bg-gradient-to-tr from-indigo-600 to-violet-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/30">
                  <Gift className="h-6 w-6" />
               </div>
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">buymethis</span>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1.5 rounded-full border border-slate-200/50">
             <NavItem id="feed" label="Feed" icon={Globe} active={currentView === 'feed'} />
             <NavItem id="forum" label="Community" icon={MessageSquare} active={currentView === 'forum'} />
             <NavItem id="leaderboard" label="Hall of Fame" icon={Trophy} active={currentView === 'leaderboard'} />
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            {/* Action Buttons */}
            <div className="hidden md:block">
                 <button
                    onClick={() => onNavigate('create')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-md bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5"
                 >
                    <PlusCircle className="h-4 w-4" />
                    <span>Request</span>
                 </button>
            </div>

            {/* Notifications */}
            {user && (
                <div className="relative">
                <button
                    onClick={() => toggleMenu('notifications')}
                    className={`p-2.5 rounded-full transition-all relative ${activeMenu === 'notifications' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                    )}
                </button>

                {activeMenu === 'notifications' && (
                    <div className="absolute right-[-60px] md:right-0 mt-4 w-80 max-w-[90vw] bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 origin-top-right">
                    <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center backdrop-blur-sm">
                        <span className="text-sm font-bold text-slate-900">Notifications</span>
                        {unreadCount > 0 && <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{unreadCount} New</span>}
                    </div>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? (
                        notifications.map((n) => (
                            <div key={n.id} className={`px-5 py-4 border-b border-slate-50 hover:bg-slate-50/80 transition-colors ${!n.isRead ? 'bg-indigo-50/30' : ''}`}>
                             <div className="flex gap-3">
                                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.type === 'success' ? 'bg-green-500' : n.type === 'alert' ? 'bg-red-500' : 'bg-indigo-500'}`} />
                                <div>
                                    <p className="text-sm text-slate-700 leading-snug font-medium">{n.message}</p>
                                    <span className="text-[10px] text-slate-400 mt-1 block font-medium">{new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                             </div>
                            </div>
                        ))
                        ) : (
                        <div className="px-5 py-10 text-center">
                            <Bell className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-slate-400 text-sm">No new notifications.</p>
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
                        className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border transition-all ${activeMenu === 'user' ? 'border-indigo-200 bg-indigo-50 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-200 hover:shadow-sm'}`}
                    >
                        <img src={user.avatarUrl} alt={user.displayName} className="h-8 w-8 rounded-full object-cover bg-slate-100" />
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${activeMenu === 'user' ? 'rotate-180' : ''}`} />
                    </button>

                    {activeMenu === 'user' && (
                        <div className="absolute right-0 mt-4 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 origin-top-right z-50">
                        <div className="px-5 py-4 border-b border-slate-50 bg-gradient-to-r from-slate-50 to-white">
                            <p className="text-sm font-bold text-slate-900">{user.displayName}</p>
                            <p className="text-xs text-slate-500 font-medium">@{user.handle}</p>
                        </div>
                        
                        <div className="py-2">
                            <button 
                            onClick={() => { onNavigate('profile'); setActiveMenu('none'); }}
                            className="w-full text-left px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-3 font-medium transition-colors"
                            >
                            <UserIcon className="h-4 w-4" /> My Profile
                            </button>
                        </div>

                        <div className="border-t border-slate-50 py-2">
                            <button 
                                onClick={() => { onLogout(); setActiveMenu('none'); }}
                                className="w-full text-left px-5 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 font-medium transition-colors"
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
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 shadow-md hover:shadow-indigo-500/20 transition-all"
                  >
                      <LogIn className="h-4 w-4" />
                      <span className="hidden sm:inline">Log In</span>
                  </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2 text-slate-600" onClick={() => toggleMenu('mobile')}>
                {activeMenu === 'mobile' ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {activeMenu === 'mobile' && (
            <div className="md:hidden mt-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2">
                <div className="flex flex-col gap-2">
                    <button onClick={() => { onNavigate('feed'); setActiveMenu('none'); }} className="p-3 rounded-lg hover:bg-slate-50 text-left font-medium text-slate-700 flex items-center gap-3">
                        <Globe className="h-5 w-5 text-indigo-500" /> Feed
                    </button>
                    <button onClick={() => { onNavigate('forum'); setActiveMenu('none'); }} className="p-3 rounded-lg hover:bg-slate-50 text-left font-medium text-slate-700 flex items-center gap-3">
                        <MessageSquare className="h-5 w-5 text-indigo-500" /> Community
                    </button>
                    <button onClick={() => { onNavigate('leaderboard'); setActiveMenu('none'); }} className="p-3 rounded-lg hover:bg-slate-50 text-left font-medium text-slate-700 flex items-center gap-3">
                        <Trophy className="h-5 w-5 text-indigo-500" /> Leaderboard
                    </button>
                    <button onClick={() => { onNavigate('create'); setActiveMenu('none'); }} className="p-3 rounded-lg bg-indigo-50 text-indigo-700 text-left font-bold flex items-center gap-3 mt-2">
                        <PlusCircle className="h-5 w-5" /> Request Item
                    </button>
                </div>
            </div>
        )}
      </div>
    </nav>
  );
};