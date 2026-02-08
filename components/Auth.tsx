import React, { useState } from 'react';
import { db } from '../services/db';
import { Button } from './Button';
import { Gift, Mail, Lock, User, MapPin, AtSign, AlertCircle, ArrowRight, Database, Copy, Check, Terminal } from 'lucide-react';

interface AuthProps {
  onLoginSuccess: () => void;
}

// SQL Script for setting up Neon
const NEON_SETUP_SQL = `
-- RESET DATABASE (Drop all existing tables)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS forum_replies CASCADE;
DROP TABLE IF EXISTS forum_threads CASCADE;
DROP TABLE IF EXISTS requests CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 1. Create Profiles Table
create table profiles (
  id text primary key,
  display_name text,
  handle text,
  bio text,
  avatar_url text,
  location text,
  trust_score integer default 50,
  badges jsonb default '[]'::jsonb,
  projects text[] default '{}',
  hobbies text[] default '{}',
  coordinates_lat float,
  coordinates_lng float,
  created_at timestamp with time zone default now()
);

-- 2. Create Requests Table
create table requests (
  id text primary key,
  requester_id text references profiles(id),
  title text,
  reason text,
  category text,
  status text,
  location text,
  created_at timestamp with time zone,
  coordinates_lat float,
  coordinates_lng float,
  shipping_address text,
  fulfiller_id text references profiles(id),
  tracking_number text,
  proof_of_purchase_image text,
  gift_message text,
  thank_you_message text,
  receipt_verification_status text,
  enriched_data jsonb,
  candidates text[] default '{}',
  comments jsonb default '[]'::jsonb
);

-- 3. Create Forum Tables
create table forum_threads (
  id text primary key,
  author_id text references profiles(id),
  title text,
  content text,
  category text,
  created_at timestamp with time zone,
  views integer default 0,
  likes text[] default '{}'
);

create table forum_replies (
  id text primary key,
  thread_id text references forum_threads(id),
  author_id text references profiles(id),
  content text,
  created_at timestamp with time zone
);

-- 4. Create Notifications Table
create table notifications (
  id text primary key,
  user_id text references profiles(id),
  message text,
  type text,
  is_read boolean default false,
  created_at timestamp with time zone,
  related_request_id text
);
`;

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  // If DB is not configured, show setup. Force setup if not neon.
  const [showSetup, setShowSetup] = useState(!db.isNeon);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Form Fields
  const [email, setEmail] = useState(''); // Used as handle/identifier for simple auth
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [location, setLocation] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        // Sign up
        await db.signUp(email, {
          displayName,
          handle: handle.replace('@', ''),
          location,
          bio: "I'm new here! Ready to help."
        });
        
        onLoginSuccess();

      } else {
        // Login - in this simple version we assume email/handle is enough
        await db.signIn(email);
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const copySqlToClipboard = () => {
      navigator.clipboard.writeText(NEON_SETUP_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
  };

  // --- NEON SETUP WIZARD ---
  if (showSetup) {
      return (
        <div className="min-h-screen bg-[#0d0e10] text-white flex items-center justify-center p-4 font-sans">
            <div className="max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 bg-[#15171b] rounded-2xl overflow-hidden shadow-2xl border border-[#2c2e33]">
                {/* Left: Info */}
                <div className="p-8 flex flex-col justify-center border-r border-[#2c2e33]">
                    <div className="mb-6">
                        <div className="bg-[#00e599] w-12 h-12 rounded-lg flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,229,153,0.3)]">
                            <Database className="h-6 w-6 text-black" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2 text-white">Connect Neon DB</h1>
                        <p className="text-slate-400 text-sm">
                            To persist data and go live, you must connect your Neon Postgres database.
                        </p>
                    </div>

                    <div className="space-y-6">
                         <div className="flex gap-4">
                             <div className="bg-[#1f2329] w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border border-[#2c2e33] shrink-0">1</div>
                             <div>
                                 <h3 className="font-semibold text-sm text-[#00e599] mb-1">Get Connection String</h3>
                                 <p className="text-xs text-slate-400 mb-2">
                                     In your Neon Dashboard, click <strong>"Connect"</strong> and copy the Postgres Connection String.
                                 </p>
                                 <div className="bg-black/30 p-2 rounded border border-white/5 text-[10px] font-mono text-slate-500 truncate">
                                     postgres://user:pass@ep-xyz.neon.tech/neondb...
                                 </div>
                             </div>
                         </div>

                         <div className="flex gap-4">
                             <div className="bg-[#1f2329] w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border border-[#2c2e33] shrink-0">2</div>
                             <div>
                                 <h3 className="font-semibold text-sm text-[#00e599] mb-1">Set Environment Variable</h3>
                                 <p className="text-xs text-slate-400">
                                     Add this to your <code>.env</code> file or Environment Variables:
                                 </p>
                                 <code className="block mt-2 bg-[#1f2329] px-2 py-1 rounded text-[10px] text-slate-300 font-mono border border-white/5">
                                     DATABASE_URL=your_connection_string
                                 </code>
                             </div>
                         </div>

                         <div className="flex gap-4">
                             <div className="bg-[#1f2329] w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border border-[#2c2e33] shrink-0">3</div>
                             <div>
                                 <h3 className="font-semibold text-sm text-[#00e599] mb-1">Run Setup SQL</h3>
                                 <p className="text-xs text-slate-400 mb-2">
                                     Go to the <strong>SQL Editor</strong> in Neon and run the initialization script.
                                 </p>
                                 <button 
                                    onClick={copySqlToClipboard}
                                    className="flex items-center gap-2 bg-[#2c2e33] hover:bg-[#363940] text-xs px-3 py-1.5 rounded transition-colors border border-white/5"
                                 >
                                     {copiedSql ? <Check className="h-3 w-3 text-[#00e599]" /> : <Copy className="h-3 w-3" />}
                                     {copiedSql ? 'Copied!' : 'Copy SQL Script'}
                                 </button>
                             </div>
                         </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-[#2c2e33]">
                         <button 
                            onClick={() => window.location.reload()}
                            className="w-full bg-[#00e599] hover:bg-[#00cc88] text-black font-bold py-2.5 rounded-lg transition-all text-sm mb-3"
                         >
                             I've Added the Key (Reload)
                         </button>
                    </div>
                </div>

                {/* Right: Code Preview (Decorative) */}
                <div className="bg-[#0d0e10] p-6 hidden md:flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#00e599]/10 rounded-full blur-[80px] pointer-events-none"></div>
                    <div className="flex items-center gap-2 mb-4 text-slate-500">
                        <Terminal className="h-4 w-4" />
                        <span className="text-xs font-mono">db_setup.sql</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[10px] leading-relaxed text-slate-400 opacity-80">
                        <pre>{NEON_SETUP_SQL}</pre>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // --- STANDARD AUTH SCREEN ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="bg-indigo-600 p-8 text-center relative">
           {!db.isNeon && (
               <button 
                   onClick={() => setShowSetup(true)}
                   className="absolute top-3 right-3 bg-indigo-500 hover:bg-indigo-400 text-indigo-50 text-[10px] px-2 py-1 rounded-md border border-indigo-400 flex items-center gap-1 transition-colors"
               >
                   <Database className="h-3 w-3" /> Connect DB
               </button>
           )}
           
           <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-inner">
              <Gift className="h-8 w-8 text-white" />
           </div>
           <h1 className="text-2xl font-bold text-white mb-1">buymethis</h1>
           <p className="text-indigo-100 text-sm">Join the community of givers.</p>
        </div>

        {/* Form */}
        <div className="p-8">
           <div className="flex gap-4 mb-6 border-b border-slate-100 pb-1">
             <button 
               onClick={() => setMode('login')}
               className={`flex-1 pb-3 text-sm font-semibold transition-colors relative ${mode === 'login' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
             >
               Log In
               {mode === 'login' && <div className="absolute bottom-[-5px] left-0 w-full h-0.5 bg-indigo-600 rounded-full"></div>}
             </button>
             <button 
               onClick={() => setMode('signup')}
               className={`flex-1 pb-3 text-sm font-semibold transition-colors relative ${mode === 'signup' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
             >
               Sign Up
               {mode === 'signup' && <div className="absolute bottom-[-5px] left-0 w-full h-0.5 bg-indigo-600 rounded-full"></div>}
             </button>
           </div>

           <form onSubmit={handleAuth} className="space-y-4">
              {mode === 'signup' && (
                  <div className="space-y-4 animate-in slide-in-from-left-4 fade-in">
                    <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Display Name"
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <AtSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Handle"
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                value={handle}
                                onChange={(e) => setHandle(e.target.value)}
                                required
                            />
                        </div>
                        <div className="relative flex-1">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="City, State"
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                  </div>
              )}

              <div className="relative">
                 <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                 <input 
                    type="text" 
                    placeholder={mode === 'login' ? "Handle or Display Name" : "Email (optional)"}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                 />
              </div>
              
              {/* Dummy Password Field for UX consistency */}
              <div className="relative">
                 <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                 <input 
                    type="password" 
                    placeholder="Password"
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    required
                    minLength={4}
                 />
              </div>

              {error && (
                  <div className="flex items-start gap-2 text-red-600 text-xs bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
              )}

              <Button 
                type="submit" 
                variant="primary" 
                className="w-full bg-indigo-600 hover:bg-indigo-700" 
                size="lg"
                isLoading={loading}
              >
                {mode === 'login' ? 'Log In' : 'Join Now'}
                {mode !== 'login' && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
           </form>
        </div>
      </div>
    </div>
  );
};