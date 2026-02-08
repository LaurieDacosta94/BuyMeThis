import React from 'react';
import { Badge as BadgeType } from '../types';
import { Shield, Star, Heart, Zap, Award } from 'lucide-react';

interface BadgeProps {
  badge: BadgeType;
  size?: 'sm' | 'md';
}

const ICONS: Record<string, any> = { 'shield': Shield, 'star': Star, 'heart': Heart, 'zap': Zap, 'award': Award };

export const Badge: React.FC<BadgeProps> = ({ badge, size = 'sm' }) => {
  const Icon = ICONS[badge.icon] || Award;
  const sizeClasses = size === 'sm' ? 'w-6 h-6 p-1' : 'w-10 h-10 p-2';
  const iconSizes = size === 'sm' ? 'w-3.5 h-3.5' : 'w-6 h-6';

  return (
    <div className="group relative flex items-center justify-center">
      <div className={`${sizeClasses} bg-white border border-slate-300 flex items-center justify-center shadow-sm`}>
        <Icon className={`${iconSizes} text-slate-700`} />
      </div>
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wide opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none border border-slate-700">
        {badge.label}
      </div>
    </div>
  );
};