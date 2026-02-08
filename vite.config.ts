import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // API Key for Gemini
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      
      // Database Configuration
      'process.env.DATABASE_URL': JSON.stringify(env.DATABASE_URL || ''),
      'process.env.VITE_DATABASE_URL': JSON.stringify(env.VITE_DATABASE_URL || ''),
      
      // Admin Credentials
      'process.env.ADMIN_PASSWORD': JSON.stringify(env.ADMIN_PASSWORD || 'secret123'),

      // Mapbox Token
      'process.env.VITE_MAPBOX_TOKEN': JSON.stringify(env.VITE_MAPBOX_TOKEN || '')
    }
  };
});