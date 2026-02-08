import React from 'react';
import { ShieldCheck, Gift, ArrowRight, Globe, Package, Cpu } from 'lucide-react';
import { Button } from './Button';

export const Hero: React.FC = () => {
  return (
    <div className="mb-8 border-2 border-slate-900 bg-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] overflow-hidden relative">
        {/* Decorative Top Bar */}
        <div className="h-6 bg-slate-900 flex items-center justify-between px-2">
            <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500 border border-slate-900"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-400 border border-slate-900"></div>
                <div className="w-2 h-2 rounded-full bg-green-500 border border-slate-900"></div>
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">System.Root.Index</div>
            <div className="w-10"></div>
        </div>

        <div className="grid md:grid-cols-2 relative z-10">
            <div className="p-8 md:p-16 flex flex-col justify-center border-b-2 md:border-b-0 md:border-r-2 border-slate-900 bg-slate-50 relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-r-2 border-b-2 border-slate-900 z-0"></div>

                <div className="inline-flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-widest mb-6 font-mono border border-blue-200 bg-blue-50 px-2 py-1 w-fit">
                    <Globe className="h-3 w-3" /> Global_Network_Active
                </div>
                
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-6 tracking-tighter uppercase">
                    Peer<span className="text-blue-600">_to_</span>Peer<br />
                    Material<span className="text-slate-400">.Sync</span>
                </h1>
                
                <p className="text-lg text-slate-700 leading-relaxed mb-8 max-w-md font-medium">
                    Direct community fulfillment protocol. Bypass intermediaries. Execute transactions.
                </p>

                <div className="flex gap-4 font-mono text-xs">
                    <div className="flex items-center gap-2 bg-white border border-slate-900 px-3 py-1 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                        <div className="w-2 h-2 bg-green-500 animate-pulse"></div> AI_VERIFIED
                    </div>
                    <div className="flex items-center gap-2 bg-white border border-slate-900 px-3 py-1 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                        <div className="w-2 h-2 bg-blue-500"></div> LOGISTICS
                    </div>
                </div>
            </div>

            <div className="relative bg-[#f0f4f8] overflow-hidden min-h-[300px] flex items-center justify-center">
                {/* Tech Pattern Background */}
                <div className="absolute inset-0 opacity-20" style={{ 
                    backgroundImage: 'linear-gradient(45deg, #0f172a 25%, transparent 25%, transparent 75%, #0f172a 75%, #0f172a), linear-gradient(45deg, #0f172a 25%, transparent 25%, transparent 75%, #0f172a 75%, #0f172a)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 10px 10px'
                }}></div>
                
                <div className="relative z-10 w-64 md:w-80 animate-in slide-in-from-right duration-700">
                    <div className="bg-white border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-0">
                        <div className="bg-slate-900 text-white p-2 flex justify-between items-center text-[10px] font-mono border-b-2 border-slate-900">
                            <span>REQ-2024-89</span>
                            <span className="text-green-400 blinking-cursor">ACTIVE</span>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="flex gap-4 items-start">
                                <div className="w-16 h-16 bg-blue-100 shrink-0 border-2 border-slate-900 flex items-center justify-center">
                                    <Package className="h-8 w-8 text-blue-600" />
                                </div>
                                <div>
                                    <div className="h-4 w-32 bg-slate-800 mb-2"></div>
                                    <div className="h-3 w-24 bg-slate-300"></div>
                                </div>
                            </div>
                            <div className="h-0.5 bg-slate-900 w-full"></div>
                            <div className="flex justify-between items-center">
                                <div className="flex gap-2">
                                    <Cpu className="h-4 w-4 text-slate-500" />
                                    <div className="w-20 h-4 bg-slate-200"></div>
                                </div>
                                <div className="text-xs font-bold text-blue-600 uppercase font-mono border border-blue-600 px-2 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer">
                                    Fulfill &gt;
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
};