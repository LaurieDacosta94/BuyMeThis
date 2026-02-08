import React from 'react';
import { Badge as BadgeType } from '../types';
import { Shield, Star, Heart, Zap, Award } from 'lucide-react';

interface BadgeProps {
  badge: BadgeType;
  size?: 'sm' | 'md';
}

const ICONS: Record<string, any> = {
  'shield': Shield,
  'star': Star,
  'heart': Heart,
  'zap': Zap,
  'award': Award
};

export const Badge: React.FC<BadgeProps> = ({ badge, size = 'sm' }) => {
  const Icon = ICONS[badge.icon] || Award;
  const sizeClasses = size === 'sm' ? 'w-6 h-6 p-1' : 'w-10 h-10 p-2';
  const iconSizes = size === 'sm' ? 'w-3.5 h-3.5' : 'w-6 h-6';

  return (
    <div className="group relative flex items-center justify-center">
      <div className={`${sizeClasses} rounded-full flex items-center justify-center shadow-sm border border-white/50 ${badge.color}`}>
        <Icon className={`${iconSizes} text-white`} />
      </div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
        <p className="font-bold">{badge.label}</p>
        <p className="text-[10px] text-slate-300 font-normal">{badge.description}</p>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
      </div>
    </div>
  );
};