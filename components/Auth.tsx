import React, { useState } from 'react';
import { db } from '../services/db';
import { Button } from './Button';
import { Gift, Mail, Lock, User, MapPin, AtSign, AlertCircle, ArrowRight, Database, Copy, Check, Wrench } from 'lucide-react';
import { User as UserType } from '../types';

interface AuthProps {
  onLoginSuccess: () => void;
}

// SQL to fix the specific missing column error without wiping data
const MIGRATION_SQL = `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;`;

// SQL Script for setting up Neon (Full Reset)
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
  banner_url text,
  location text,
  trust_score integer default 50,
  badges jsonb default '[]'::jsonb,
  projects text[] default '{}',
  hobbies text[] default '{}',
  coordinates_lat float,
  coordinates_lng float,
  is_admin boolean default false,
  created_at timestamp with time zone default now()
);

-- 2. Create Requests Table
create table requests (
  id text primary key,
  requester_id text references profiles(id),
  title text,
  reason text,
  category text,
  delivery_preference text,
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
  const [showSetup, setShowSetup] = useState(!db.isNeon);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedMigration, setCopiedMigration] = useState(false);

  // Form Fields
  const [email, setEmail] = useState(''); // Used as handle/identifier
  const [password, setPassword] = useState(''); // Only used for Admin
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [location, setLocation] = useState('');

  // Check both fields for 'admin' to toggle admin mode UI logic
  const isAdminAttempt = email.toLowerCase() === 'admin' || handle.toLowerCase() === 'admin';
  
  const isSchemaError = error && error.includes('column') && error.includes('does not exist');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isAdminAttempt) {
          // Use the dedicated DB method for admin login
          await db.loginAsAdmin(password);
          onLoginSuccess();
          return;
      }

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
      if (isAdminAttempt && err.message.includes("Invalid admin password")) {
          setError("Incorrect system password for 'admin' account.");
      } else {
          setError(err.message || "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const copySqlToClipboard = () => {
      navigator.clipboard.writeText(NEON_SETUP_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
  };

  const copyMigrationToClipboard = () => {
      navigator.clipboard.writeText(MIGRATION_SQL);
      setCopiedMigration(true);
      setTimeout(() => setCopiedMigration(false), 2000);
  };

  if (showSetup) {
      return (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-2xl w-full max-w-lg mx-auto">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-4">
                 <div className="bg-[#00e599] p-2 rounded-lg text-black">
                    <Database className="h-5 w-5" />
                 </div>
                 <div>
                    <h2 className="text-lg font-bold">Connect Neon DB</h2>
                    <p className="text-slate-400 text-xs">Required for live data persistence</p>
                 </div>
            </div>
            
            <div className="space-y-4 mb-6 text-sm">
                 <div className="bg-black/30 p-3 rounded border border-white/10">
                     <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Step 1: Env Variable</p>
                     <code className="text-[10px] font-mono text-green-400 break-all">DATABASE_URL=postgres://...</code>
                 </div>
                 <div className="bg-black/30 p-3 rounded border border-white/10">
                     <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Step 2: Initialize</p>
                     <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-300">Run the setup SQL in Neon Editor</span>
                        <button 
                            onClick={copySqlToClipboard} 
                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors"
                        >
                            {copiedSql ? <Check className="h-3 w-3 text-[#00e599]" /> : <Copy className="h-3 w-3" />}
                            {copiedSql ? 'Copied' : 'Copy SQL'}
                        </button>
                     </div>
                 </div>
            </div>

            <button onClick={() => window.location.reload()} className="w-full bg-[#00e599] hover:bg-[#00cc88] text-black font-bold py-2.5 rounded-lg text-sm transition-colors">
                I've Configured It (Reload)
            </button>
        </div>
      );
  }

  return (
      <div className="bg-white rounded-3xl overflow-hidden shadow-xl w-full transition-all duration-300">
        {/* Header - Standard Appearance always */}
        <div className="bg-indigo-600 p-6 text-center transition-colors">
           <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md shadow-inner">
              <Gift className="h-6 w-6 text-white" />
           </div>
           <h1 className="text-xl font-bold text-white">Welcome to buymethis</h1>
           <p className="text-indigo-100 text-xs mt-1">Join the community of givers.</p>
        </div>

        {/* Form */}
        <div className="p-6">
           {/* Tab Switcher - Hide if admin detected to streamline? No, keep it. */}
           <div className="flex bg-slate-100 p-1 rounded-xl mb-5">
             <button 
               onClick={() => setMode('login')}
               className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               Log In
             </button>
             <button 
               onClick={() => setMode('signup')}
               className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'signup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               Sign Up
             </button>
           </div>

           <form onSubmit={handleAuth} className="space-y-4">
              {mode === 'signup' && (
                  <div className="space-y-3 animate-in slide-in-from-left-4 fade-in">
                    <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Display Name"
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            required={!isAdminAttempt && mode === 'signup'}
                        />
                    </div>
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <AtSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Handle"
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none"
                                value={handle}
                                onChange={(e) => setHandle(e.target.value)}
                                required={!isAdminAttempt && mode === 'signup'}
                            />
                        </div>
                        <div className="relative flex-1">
                            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="City"
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                required={!isAdminAttempt && mode === 'signup'}
                            />
                        </div>
                    </div>
                  </div>
              )}

              <div className="relative">
                 <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                 <input 
                    type="text" 
                    placeholder={mode === 'login' ? "Handle or Email" : "Email"}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                 />
              </div>
              
              {/* Password field only shows if admin logic is triggered */}
              <div className={`relative transition-all duration-300 ${isAdminAttempt ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                 <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                 <input 
                    type="password" 
                    placeholder="System Password"
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={isAdminAttempt}
                 />
              </div>

              {error && (
                  <div className="space-y-3">
                      <div className="flex items-start gap-2 text-red-600 text-xs bg-red-50 p-2.5 rounded-lg border border-red-100">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span className="break-all">{error}</span>
                      </div>
                      
                      {isSchemaError && (
                          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs animate-in fade-in">
                              <div className="flex items-center gap-2 font-bold text-amber-700 mb-1">
                                  <Wrench className="h-3 w-3" /> Database Schema Mismatch
                              </div>
                              <p className="text-amber-600 mb-2">
                                  Your database is missing the <code>is_admin</code> column. Run this SQL in your Neon SQL Editor to fix it:
                              </p>
                              <div className="flex gap-2">
                                  <code className="flex-1 bg-white border border-amber-200 p-2 rounded font-mono text-[10px] text-slate-600 overflow-x-auto whitespace-nowrap">
                                      {MIGRATION_SQL}
                                  </code>
                                  <button 
                                      type="button"
                                      onClick={copyMigrationToClipboard}
                                      className="bg-amber-100 hover:bg-amber-200 text-amber-700 p-2 rounded border border-amber-200 transition-colors"
                                      title="Copy SQL"
                                  >
                                      {copiedMigration ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              )}

              <Button 
                type="submit" 
                variant="primary" 
                className="w-full rounded-lg py-2.5 font-bold shadow-lg bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                size="md"
                isLoading={loading}
              >
                {mode === 'login' ? 'Log In' : 'Join Now'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
           </form>
           
           <p className="text-center text-[10px] text-slate-400 mt-4">
               By continuing, you agree to our Community Guidelines.
           </p>
        </div>
      </div>
  );
};