import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  language: 'en' | 'mr';
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setLanguage: (lang: 'en' | 'mr') => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      language: 'en',
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleMobileSidebar: () => set((s) => ({ sidebarMobileOpen: !s.sidebarMobileOpen })),
      setLanguage: (language) => set({ language }),
    }),
    { name: 'adtp-ui-prefs' },
  ),
);
