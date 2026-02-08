export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export const formatDistance = (km: number): string => {
  if (km < 1) return '< 1 km away';
  return `${Math.round(km)} km away`;
};

// Project lat/lng to x/y coordinates relative to a center point
// Returns offsets in kilometers
export const projectCoordinates = (
  centerLat: number, 
  centerLng: number, 
  targetLat: number, 
  targetLng: number
): { x: number, y: number } => {
  const R = 6371; // Earth radius km
  
  // Simple Equirectangular projection for small distances
  // x = (lon2 - lon1) * cos(avgLat)
  // y = (lat2 - lat1)
  
  const avgLatRad = deg2rad((centerLat + targetLat) / 2);
  const dLng = deg2rad(targetLng - centerLng);
  const dLat = deg2rad(targetLat - centerLat);
  
  const x = dLng * Math.cos(avgLatRad) * R;
  const y = dLat * R;
  
  return { x, y };
};