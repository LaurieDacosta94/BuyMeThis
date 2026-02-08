import React, { useState } from 'react';
import { db } from '../services/db';
import { Button } from './Button';
import { Gift, Mail, Lock, User, MapPin, AtSign, AlertCircle, ArrowRight, Database, Copy, Check, Terminal } from 'lucide-react';

interface AuthProps {
  onLoginSuccess: () => void;
}

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

  // Keep existing setup logic but styled better inside the modal if triggered
  if (showSetup) {
      return (
        <div className="p-6 bg-slate-900 text-white rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
                 <div className="bg-[#00e599] p-2 rounded-lg">
                    <Database className="h-6 w-6 text-black" />
                 </div>
                 <h2 className="text-xl font-bold">Connect Neon DB</h2>
            </div>
            <p className="text-slate-400 text-sm mb-6">
                To enable write access, please configure your Neon Postgres database.
            </p>
            
            <div className="space-y-4 mb-6">
                 <div className="bg-black/30 p-3 rounded border border-white/10">
                     <p className="text-xs text-slate-500 mb-1">1. Add Env Variable</p>
                     <code className="text-[10px] font-mono text-green-400">DATABASE_URL=postgres://...</code>
                 </div>
                 <div className="bg-black/30 p-3 rounded border border-white/10">
                     <p className="text-xs text-slate-500 mb-1">2. Run Setup SQL</p>
                     <button onClick={() => { navigator.clipboard.writeText(`/* SQL HERE */`); setCopiedSql(true); }} className="text-[10px] flex items-center gap-1 text-indigo-400 hover:text-indigo-300">
                        {copiedSql ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy Script from Docs
                     </button>
                 </div>
            </div>

            <button onClick={() => window.location.reload()} className="w-full bg-[#00e599] text-black font-bold py-2 rounded-lg">
                Reload App
            </button>
        </div>
      );
  }

  return (
      <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">
        <div className="bg-indigo-600 p-6 text-center">
           <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md shadow-inner">
              <Gift className="h-6 w-6 text-white" />
           </div>
           <h2 className="text-xl font-bold text-white">Welcome to buymethis</h2>
           <p className="text-indigo-100 text-sm mt-1">Join the community of givers.</p>
        </div>

        <div className="p-6">
           <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
             <button 
               onClick={() => setMode('login')}
               className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               Log In
             </button>
             <button 
               onClick={() => setMode('signup')}
               className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'signup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               Sign Up
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
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <AtSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Handle"
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none"
                                value={handle}
                                onChange={(e) => setHandle(e.target.value)}
                                required
                            />
                        </div>
                        <div className="relative flex-1">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="City"
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none"
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
                    placeholder={mode === 'login' ? "Handle or Display Name" : "Email"}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none"
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
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none"
                    required
                    minLength={4}
                 />
              </div>

              {error && (
                  <div className="flex items-start gap-2 text-red-600 text-xs bg-red-50 p-3 rounded-lg border border-red-100">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
              )}

              <Button 
                type="submit" 
                variant="primary" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl py-2.5 font-bold shadow-lg shadow-indigo-500/20" 
                size="lg"
                isLoading={loading}
              >
                {mode === 'login' ? 'Log In' : 'Join Now'}
                {mode !== 'login' && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
           </form>
           
           <p className="text-center text-xs text-slate-400 mt-4">
               By continuing, you agree to our Community Guidelines.
           </p>
        </div>
      </div>
  );
};