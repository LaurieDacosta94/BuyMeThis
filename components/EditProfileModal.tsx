import React, { useState } from 'react';
import { User, Coordinates } from '../types';
import { Button } from './Button';
import { X, Save, MapPin, Crosshair, Image as ImageIcon, Camera, UserCog } from 'lucide-react';
import { uploadImage } from '../services/db';

interface EditProfileModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: User) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    displayName: user.displayName,
    bio: user.bio,
    location: user.location,
    bannerUrl: user.bannerUrl || '',
    avatarUrl: user.avatarUrl || '',
    projects: user.projects.join('\n'),
    hobbies: user.hobbies.join(', ')
  });
  
  const [coordinates, setCoordinates] = useState<Coordinates | undefined>(user.coordinates);
  const [isLocating, setIsLocating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLocating(false);
      },
      (error) => {
        console.error("Error getting location", error);
        alert("Unable to retrieve your location");
        setIsLocating(false);
      }
    );
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setIsUploading(true);
          const base64 = await uploadImage(file);
          if (base64) {
              setFormData(prev => ({ ...prev, bannerUrl: base64 }));
          }
          setIsUploading(false);
      }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setIsUploading(true);
          const base64 = await uploadImage(file);
          if (base64) {
              setFormData(prev => ({ ...prev, avatarUrl: base64 }));
          }
          setIsUploading(false);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser: User = {
      ...user,
      displayName: formData.displayName,
      bio: formData.bio,
      location: formData.location,
      bannerUrl: formData.bannerUrl || undefined,
      avatarUrl: formData.avatarUrl,
      coordinates: coordinates,
      projects: formData.projects.split('\n').filter(p => p.trim() !== ''),
      hobbies: formData.hobbies.split(',').map(h => h.trim()).filter(h => h !== '')
    };
    onSave(updatedUser);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-lg shadow-hard border-2 border-slate-900 flex flex-col max-h-[90vh]">
        
        {/* System Bar */}
        <div className="bg-slate-900 text-white px-3 py-2 flex justify-between items-center select-none border-b-2 border-slate-900">
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 bg-yellow-400 border border-black"></div>
             <span className="font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-2"><UserCog className="h-3 w-3" /> USER_CONFIG</span>
           </div>
           <button onClick={onClose}><X className="h-4 w-4 hover:text-red-400"/></button>
        </div>

        <div className="overflow-y-auto p-6 bg-slate-50 flex-1 custom-scrollbar">
          <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Banner Edit */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 font-mono">Banner_Image</label>
                <div className="relative h-24 border-2 border-slate-300 bg-white group hover:border-blue-500 transition-colors">
                    {formData.bannerUrl ? (
                        <img src={formData.bannerUrl} alt="Banner" className="w-full h-full object-cover opacity-80" />
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-300 text-xs font-mono">NO_DATA</div>
                    )}
                    <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <label htmlFor="banner-upload" className="cursor-pointer text-white font-mono text-xs font-bold flex items-center gap-2 hover:underline">
                            <ImageIcon className="h-4 w-4" /> UPLOAD
                        </label>
                        <input id="banner-upload" type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} disabled={isUploading} />
                    </div>
                </div>
            </div>

            {/* Avatar Edit */}
            <div className="flex justify-center -mt-8 mb-4 relative z-10">
                <div className="relative group">
                    <img 
                        src={formData.avatarUrl || user.avatarUrl} 
                        alt="Avatar" 
                        className="w-20 h-20 bg-white object-cover border-2 border-slate-900 shadow-hard-sm" 
                    />
                    <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <label htmlFor="avatar-upload" className="cursor-pointer text-white">
                            <Camera className="h-6 w-6" />
                        </label>
                        <input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
                    </div>
                </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 font-mono">Display_ID</label>
              <input
                type="text"
                className="w-full px-3 py-2 border-2 border-slate-300 focus:border-blue-600 outline-none font-bold text-sm bg-white"
                value={formData.displayName}
                onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 font-mono">Geo_Loc</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    className="w-full pl-9 pr-3 py-2 border-2 border-slate-300 focus:border-blue-600 outline-none text-sm bg-white font-mono"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    required
                    placeholder="CITY, STATE"
                  />
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleDetectLocation}
                  disabled={isLocating}
                  title="Detect GPS"
                  className="border-2 border-slate-300"
                >
                  {isLocating ? (
                    <span className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                  ) : (
                    <Crosshair className={`h-4 w-4 ${coordinates ? 'text-green-600' : 'text-slate-400'}`} />
                  )}
                </Button>
              </div>
              {coordinates && (
                <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1 font-mono">
                  <span className="inline-block w-1.5 h-1.5 bg-green-500" />
                  COORDS_LOCKED ({coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)})
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 font-mono">Bio_Data</label>
              <textarea
                className="w-full px-3 py-2 border-2 border-slate-300 focus:border-blue-600 outline-none h-24 bg-white text-sm"
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                maxLength={200}
              />
              <p className="text-[10px] text-slate-400 text-right mt-1 font-mono">{formData.bio.length}/200</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 font-mono">Active_Projects</label>
              <textarea
                className="w-full px-3 py-2 border-2 border-slate-300 focus:border-blue-600 outline-none h-24 bg-white text-sm font-mono"
                value={formData.projects}
                onChange={(e) => setFormData({...formData, projects: e.target.value})}
                placeholder="PROJECT_ALPHA&#10;PROJECT_BETA"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 font-mono">Interests</label>
              <input
                type="text"
                className="w-full px-3 py-2 border-2 border-slate-300 focus:border-blue-600 outline-none text-sm bg-white font-mono"
                value={formData.hobbies}
                onChange={(e) => setFormData({...formData, hobbies: e.target.value})}
                placeholder="TECH, CODING, ART"
              />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t-2 border-slate-900 bg-white flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} className="font-mono text-xs font-bold uppercase">Abort</Button>
          <Button type="submit" form="edit-profile-form" variant="primary" disabled={isUploading} className="font-mono text-xs font-bold uppercase shadow-hard-sm">
            <Save className="h-4 w-4 mr-2" /> Commit_Changes
          </Button>
        </div>
      </div>
    </div>
  );
};