import React from 'react';
import { Globe, Sparkles } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <div className="mb-8 rounded-3xl bg-white shadow-glow overflow-hidden relative border border-white/60">
        <div className="grid md:grid-cols-2 relative z-10">
            <div className="p-8 md:p-16 flex flex-col justify-center bg-gradient-to-br from-white via-cyan-50 to-white relative">
                
                <div className="inline-flex items-center gap-2 text-cyan-600 font-bold text-xs uppercase tracking-widest mb-6 font-mono bg-cyan-50 px-3 py-1.5 rounded-full w-fit border border-cyan-100">
                    <Globe className="h-3 w-3" /> Global Community
                </div>
                
                <h1 className="text-4xl md:text-5xl font-black text-slate-800 leading-tight mb-6 tracking-tight">
                    Fulfill Dreams,<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-500">One Item at a Time</span>
                </h1>
                
                <p className="text-lg text-slate-500 leading-relaxed mb-8 max-w-md font-medium">
                    A peer-to-peer request board for the anime generation. Connect, share, and support each other directly.
                </p>

                <div className="flex gap-4 font-bold text-xs">
                    <div className="flex items-center gap-2 bg-white border border-cyan-100 px-4 py-2 rounded-full shadow-sm text-cyan-700">
                        <Sparkles className="w-4 h-4 text-cyan-400" /> AI-POWERED
                    </div>
                    <div className="flex items-center gap-2 bg-white border border-cyan-100 px-4 py-2 rounded-full shadow-sm text-blue-700">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div> LOGISTICS
                    </div>
                </div>
            </div>

            <div className="relative overflow-hidden min-h-[300px] flex items-center justify-center bg-cyan-100">
                {/* Decorative Background Image */}
                <div className="absolute inset-0" style={{ 
                    backgroundImage: 'url(https://images.unsplash.com/photo-1558981396-5fcf84bdf14d?q=80&w=2574&auto=format&fit=crop)', // Anime style sky
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.8
                }}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-200/50 to-transparent"></div>

                <div className="relative z-10 bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-xl transform rotate-3 max-w-xs border border-white/50">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center shadow-lg shadow-pink-500/30 text-white font-bold text-lg">
                            Y
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-800 mb-1">New Request!</div>
                            <div className="text-xs text-slate-500 leading-relaxed">"I really need a tablet for my digital art class. Can anyone help?"</div>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                         <div className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-2 py-1 rounded-full">ART & HOBBIES</div>
                         <button className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-full font-bold shadow-md hover:bg-slate-700 transition-colors">View &gt;</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};