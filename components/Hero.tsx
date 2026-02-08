import React from 'react';
import { ShieldCheck, Gift, ArrowRight, Globe, Package } from 'lucide-react';
import { Button } from './Button';

export const Hero: React.FC = () => {
  return (
    <div className="mb-8 border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="grid md:grid-cols-2">
            
            <div className="p-8 md:p-16 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/50">
                <div className="inline-flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-6">
                    <Globe className="h-4 w-4" /> Global Giving Network
                </div>
                
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-6 tracking-tight">
                    Peer-to-Peer<br />
                    <span className="text-blue-600">Material Support.</span>
                </h1>
                
                <p className="text-lg text-slate-600 leading-relaxed mb-8 max-w-md">
                    Connect directly with the community to fulfill real needs. No intermediaries. Verified requests. Direct logistics.
                </p>

                <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <div className="w-2 h-2 bg-green-500"></div> AI Verified
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <div className="w-2 h-2 bg-blue-500"></div> Direct Ship
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <div className="w-2 h-2 bg-slate-900"></div> Open Source
                    </div>
                </div>
            </div>

            <div className="relative bg-slate-100 overflow-hidden min-h-[300px] flex items-center justify-center">
                {/* Tech Pattern Background */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                
                <div className="relative z-10 w-64 md:w-80">
                    <div className="bg-white border border-slate-300 shadow-xl p-0">
                        <div className="bg-slate-900 text-white p-3 flex justify-between items-center text-xs font-mono">
                            <span>REQ-2024-89</span>
                            <span className="text-green-400">OPEN</span>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="flex gap-4 items-start">
                                <div className="w-16 h-16 bg-slate-200 shrink-0 border border-slate-300 flex items-center justify-center">
                                    <Package className="h-8 w-8 text-slate-400" />
                                </div>
                                <div>
                                    <div className="h-4 w-32 bg-slate-800 mb-2"></div>
                                    <div className="h-3 w-24 bg-slate-300"></div>
                                </div>
                            </div>
                            <div className="h-px bg-slate-200 w-full"></div>
                            <div className="flex justify-between items-center">
                                <div className="flex gap-2">
                                    <div className="w-6 h-6 bg-blue-600"></div>
                                    <div className="w-6 h-6 bg-slate-300"></div>
                                </div>
                                <div className="text-xs font-bold text-blue-600 uppercase">Fulfill ></div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Shadow Card */}
                    <div className="absolute top-4 left-4 w-full h-full border border-slate-400/30 -z-10"></div>
                </div>
            </div>

        </div>
    </div>
  );
};