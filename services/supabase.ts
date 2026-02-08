import { createClient } from '@supabase/supabase-js';

// Use environment variables defined in .env and loaded via vite.config.ts
// We provide fallbacks to prevent the app from crashing if keys are missing.
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder-key';

export const isSupabaseConfigured = supabaseUrl !== 'https://placeholder.supabase.co' && supabaseAnonKey !== 'placeholder-key';

if (!isSupabaseConfigured) {
  console.warn("Supabase keys are missing or invalid. Please check your .env file or Netlify environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Converts a Base64 string to a File object.
 */
export const base64ToFile = (base64: string, filename: string): File => {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

/**
 * Uploads a file to the 'images' bucket and returns the public URL.
 */
export const uploadImage = async (file: File): Promise<string | null> => {
  if (!isSupabaseConfigured) return null;
  
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
};