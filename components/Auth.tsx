import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Button } from './Button';
import { Gift, Mail, Lock, User, MapPin, AtSign, Loader2, AlertCircle, ArrowRight, Database } from 'lucide-react';

interface AuthProps {
  onLoginSuccess: () => void;
  session?: any; // Session passed from App if available
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess, session }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'complete_profile'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    // If we have a session but Auth is still rendered, it means profile is missing.
    if (session) {
        setMode('complete_profile');
        setEmail(session.user.email || '');
    }
  }, [session]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        // 1. Sign up auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("No user returned");

        // 2. Create profile
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          display_name: displayName,
          handle: handle.replace('@', ''),
          location: location,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${handle}`, // Auto-generate avatar
          bio: "I'm new here! Ready to help.",
          trust_score: 50
        });

        if (profileError) {
             console.error("Profile creation failed", profileError);
             throw new Error("Account created but profile setup failed. Please try logging in.");
        }

        alert("Account created! You can now log in.");
        setMode('login');

      } else if (mode === 'complete_profile') {
        // Just insert profile for existing user
        if (!session?.user?.id) throw new Error("No active session found.");

        const { error: profileError } = await supabase.from('profiles').insert({
          id: session.user.id,
          display_name: displayName,
          handle: handle.replace('@', ''),
          location: location,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${handle}`,
          bio: "I'm new here! Ready to help.",
          trust_score: 50
        });

        if (profileError) throw profileError;
        onLoginSuccess();

      } else {
        // Login
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) throw loginError;
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  // --- DATABASE SETUP MODE ---
  // If Supabase is not configured, show instructions instead of login
  if (!isSupabaseConfigured) {
    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white max-w-xl w-full rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-6">
                    <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-amber-50">
                        <Database className="h-8 w-8 text-amber-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Connect Your Database</h1>
                    <p className="text-slate-600">
                        The app is running, but it's not connected to Supabase yet.
                    </p>
                </div>

                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-sm space-y-4 mb-6">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <span className="bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">1</span>
                        Get Credentials
                    </h3>
                    <p className="text-slate-600 pl-7">
                        Create a project at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium">supabase.com</a>. Go to <strong>Project Settings &gt; API</strong> and copy your <code>Project URL</code> and <code>anon public key</code>.
                    </p>

                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <span className="bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">2</span>
                        Configure Environment
                    </h3>
                    <div className="pl-7 text-slate-600">
                        <p className="mb-2">Add these to your Netlify Site Settings (or <code>.env</code> file locally):</p>
                        <ul className="bg-slate-900 text-slate-300 p-3 rounded-md font-mono text-xs space-y-1">
                            <li>SUPABASE_URL=https://your-project.supabase.co</li>
                            <li>SUPABASE_ANON_KEY=your-anon-key</li>
                        </ul>
                    </div>

                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <span className="bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">3</span>
                        Setup Tables
                    </h3>
                    <p className="text-slate-600 pl-7">
                        Copy the contents of the <code>db_setup.sql</code> file in your source code and run it in the Supabase <strong>SQL Editor</strong> to create the necessary tables.
                    </p>
                </div>
                
                <div className="flex justify-center">
                    <Button onClick={() => window.location.reload()}>
                        I've Updated the Settings
                    </Button>
                </div>
            </div>
        </div>
    );
  }

  const isProfileMode = mode === 'signup' || mode === 'complete_profile';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="bg-indigo-600 p-8 text-center">
           <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-inner">
              <Gift className="h-8 w-8 text-white" />
           </div>
           <h1 className="text-2xl font-bold text-white mb-1">buymethis</h1>
           <p className="text-indigo-100 text-sm">Join the community of givers.</p>
        </div>

        {/* Form */}
        <div className="p-8">
           {!session && (
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
           )}

           {mode === 'complete_profile' && (
              <div className="mb-6 bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">You are signed in, but your profile is incomplete. Please finish setup to continue.</p>
              </div>
           )}

           <form onSubmit={handleAuth} className="space-y-4">
              {isProfileMode && (
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

              {mode !== 'complete_profile' && (
                <>
                  <div className="relative">
                     <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                     <input 
                        type="email" 
                        placeholder="Email Address"
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                     />
                  </div>

                  <div className="relative">
                     <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                     <input 
                        type="password" 
                        placeholder="Password"
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                     />
                  </div>
                </>
              )}

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
                {mode === 'login' ? 'Log In' : 'Complete Setup'}
                {mode !== 'login' && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
           </form>
           
           <p className="text-center text-xs text-slate-400 mt-6">
             By continuing, you agree to our Terms of Service and Privacy Policy.
           </p>
        </div>
      </div>
    </div>
  );
};