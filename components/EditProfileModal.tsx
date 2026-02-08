import React, { useState } from 'react';
import { User, Coordinates } from '../types';
import { Button } from './Button';
import { X, Save, MapPin, Crosshair } from 'lucide-react';

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
    projects: user.projects.join('\n'),
    hobbies: user.hobbies.join(', ')
  });
  
  const [coordinates, setCoordinates] = useState<Coordinates | undefined>(user.coordinates);
  const [isLocating, setIsLocating] = useState(false);

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
        // We can't easily reverse geocode to a string without an external API key here,
        // so we'll just indicate that we have the coordinates.
        // Optionally, we could assume the user updates the text manually or we keep the old text.
        setIsLocating(false);
      },
      (error) => {
        console.error("Error getting location", error);
        alert("Unable to retrieve your location");
        setIsLocating(false);
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser: User = {
      ...user,
      displayName: formData.displayName,
      bio: formData.bio,
      location: formData.location,
      coordinates: coordinates,
      projects: formData.projects.split('\n').filter(p => p.trim() !== ''),
      hobbies: formData.hobbies.split(',').map(h => h.trim()).filter(h => h !== '')
    };
    onSave(updatedUser);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">Edit Profile</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.displayName}
                onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    required
                    placeholder="City, State"
                  />
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleDetectLocation}
                  disabled={isLocating}
                  title="Detect GPS Coordinates"
                >
                  {isLocating ? (
                    <span className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full" />
                  ) : (
                    <Crosshair className={`h-4 w-4 ${coordinates ? 'text-green-600' : 'text-slate-500'}`} />
                  )}
                </Button>
              </div>
              {coordinates && (
                <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                  GPS Coordinates set ({coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)})
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
              <textarea
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-24"
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                maxLength={200}
              />
              <p className="text-xs text-slate-400 text-right mt-1">{formData.bio.length}/200</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Current Projects</label>
              <p className="text-xs text-slate-500 mb-2">What are you working on? One per line.</p>
              <textarea
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-24"
                value={formData.projects}
                onChange={(e) => setFormData({...formData, projects: e.target.value})}
                placeholder="Building a birdhouse&#10;Learning Spanish"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hobbies</label>
              <p className="text-xs text-slate-500 mb-2">Comma separated.</p>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.hobbies}
                onChange={(e) => setFormData({...formData, hobbies: e.target.value})}
                placeholder="Reading, Hiking, Cooking"
              />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="edit-profile-form" variant="primary">
            <Save className="h-4 w-4 mr-2" /> Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};