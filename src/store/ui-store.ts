import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  sidebarCollapsed: boolean;
  language: 'en' | 'mr';
  toggleSidebar: () => void;
  setLanguage: (lang: 'en' | 'mr') => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      language: 'en',
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setLanguage: (language) => set({ language }),
    }),
    { name: 'adtp-ui-prefs' },
  ),
);
