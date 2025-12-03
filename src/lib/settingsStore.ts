import { create } from 'zustand';
import api from './api';

interface SettingsState {
  siteName: string;
  fetchSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  siteName: '', // Default value
  
  fetchSettings: async () => {
    try {
      const response = await api.get('/settings');
      if (response.data.siteName) {
        set({ siteName: response.data.siteName });
      }
    } catch (error) {
      console.error('Failed to fetch global settings:', error);
    }
  },
}));
