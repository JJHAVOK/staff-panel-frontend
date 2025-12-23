import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from './api';

interface SettingsState {
  siteName: string;
  siteDescription: string;
  siteEmail: string;
  supportPhone: string;
  brandColor: string;
  darkSidebar: boolean; // <-- Added
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<SettingsState>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      siteName: 'PixelForge',
      siteDescription: '',
      siteEmail: '',
      supportPhone: '',
      brandColor: '#228be6',
      darkSidebar: false, // Default
      
      fetchSettings: async () => {
        try {
          const res = await api.get('/settings');
          // Convert string 'true'/'false' to boolean if needed
          const isDark = res.data.darkSidebar === true || res.data.darkSidebar === 'true';
          
          set({ 
              siteName: res.data.siteName,
              siteDescription: res.data.siteDescription,
              siteEmail: res.data.siteEmail,
              supportPhone: res.data.supportPhone,
              brandColor: res.data.brandColor || '#228be6',
              darkSidebar: isDark
          });
        } catch (error) {
          console.error('Failed to fetch settings:', error);
        }
      },

      updateSettings: async (newSettings) => {
        set((state) => ({ ...state, ...newSettings }));
      },
    }),
    {
      name: 'platform-settings', 
    }
  )
);