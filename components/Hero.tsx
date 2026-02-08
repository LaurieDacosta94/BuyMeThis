import React from 'react';
import { Heart, ShieldCheck, Gift } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 rounded-2xl p-8 mb-8 text-white shadow-xl relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-indigo-100 mb-4 border border-white/10">
            <Heart className="h-3 w-3 fill-pink-500 text-pink-500" />
            <span className="tracking-wide uppercase">Community Powered</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
            Help your neighbors get <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-indigo-200">
              what they really need.
            </span>
          </h1>
          
          <p className="text-indigo-100 text-lg mb-6 leading-relaxed max-w-xl">
            buymethis is a social request board where you can fulfill specific needs directly. 
            No cash transfers, just items arriving at doorsteps.
          </p>

          <div className="flex flex-wrap gap-4 text-sm font-medium text-indigo-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-400" />
              <span>Verified Requests</span>
            </div>
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-pink-400" />
              <span>Direct Shipping</span>
            </div>
          </div>
        </div>

        <div className="hidden md:block relative">
           {/* Illustration placeholder using simplified UI elements */}
           <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 w-64 rotate-3 transform hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-3 mb-3">
                 <div className="w-8 h-8 rounded-full bg-pink-500/80"></div>
                 <div className="h-2 w-24 bg-white/40 rounded"></div>
              </div>
              <div className="h-24 bg-white/5 rounded-lg mb-3"></div>
              <div className="h-8 bg-indigo-500 rounded-lg w-full flex items-center justify-center text-xs font-bold">Fulfill Request</div>
           </div>
        </div>
      </div>
    </div>
  );
};