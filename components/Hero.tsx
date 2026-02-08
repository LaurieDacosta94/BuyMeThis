import React from 'react';
import { Heart, ShieldCheck, Gift, ArrowRight } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <div className="relative rounded-3xl overflow-hidden mb-12 min-h-[400px] flex items-center">
      {/* Background with abstract shapes */}
      <div className="absolute inset-0 bg-slate-900">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/30 rounded-full blur-[120px] -mr-32 -mt-32 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-pink-500/20 rounded-full blur-[100px] -ml-20 -mb-20"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-12 md:py-20">
         <div className="grid md:grid-cols-2 gap-12 items-center">
            
            <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full text-sm font-semibold text-indigo-200">
                    <Heart className="h-4 w-4 text-pink-500 fill-pink-500" />
                    <span>Community Powered Giving</span>
                </div>
                
                <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight tracking-tight">
                    Make someone's day, <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300">
                        simply by asking.
                    </span>
                </h1>
                
                <p className="text-lg text-slate-300 leading-relaxed max-w-lg">
                    Connect directly with neighbors to fulfill real needs. No middlemen, no cash transfers—just items arriving at doorsteps where they are needed most.
                </p>

                <div className="flex flex-wrap gap-4 pt-2">
                    <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/10">
                        <div className="bg-teal-500/20 p-2 rounded-lg text-teal-400">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm">Verified Needs</p>
                            <p className="text-slate-400 text-xs">AI-checked for safety</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/10">
                        <div className="bg-pink-500/20 p-2 rounded-lg text-pink-400">
                            <Gift className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm">Direct Giving</p>
                            <p className="text-slate-400 text-xs">Ship straight to them</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Visual Element */}
            <div className="hidden md:block relative h-full min-h-[300px] animate-in zoom-in duration-1000">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full opacity-20 blur-2xl"></div>
                
                {/* Floating Cards Mockup */}
                <div className="relative z-10 grid gap-4 transform rotate-[-5deg] hover:rotate-0 transition-transform duration-700 ease-out">
                    <div className="bg-white/90 backdrop-blur-xl p-5 rounded-2xl shadow-2xl border border-white/40 flex items-center gap-4 w-72 transform translate-x-8">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-2xl">📚</div>
                        <div>
                            <div className="h-2 w-24 bg-slate-200 rounded mb-2"></div>
                            <div className="h-2 w-16 bg-slate-200 rounded"></div>
                        </div>
                        <div className="ml-auto bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">Fulfilled</div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/40 flex flex-col gap-4 w-80 relative z-20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                            <div>
                                <div className="h-2.5 w-32 bg-slate-800 rounded mb-1.5"></div>
                                <div className="h-2 w-20 bg-slate-300 rounded"></div>
                            </div>
                        </div>
                        <div className="h-24 bg-slate-100 rounded-xl w-full"></div>
                        <div className="flex gap-2 mt-1">
                            <div className="h-8 flex-1 bg-indigo-600 rounded-lg"></div>
                        </div>
                    </div>

                    <div className="bg-white/90 backdrop-blur-xl p-5 rounded-2xl shadow-2xl border border-white/40 flex items-center gap-4 w-72 transform -translate-x-4">
                        <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-2xl">🧸</div>
                        <div>
                            <div className="h-2 w-20 bg-slate-200 rounded mb-2"></div>
                            <div className="h-2 w-12 bg-slate-200 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>

         </div>
      </div>
    </div>
  );
};