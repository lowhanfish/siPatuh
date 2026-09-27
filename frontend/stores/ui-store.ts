import { create } from "zustand";

type UiState = {
  isMobileNavigationOpen: boolean;
  closeMobileNavigation: () => void;
  toggleMobileNavigation: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  isMobileNavigationOpen: false,
  closeMobileNavigation: () => set({ isMobileNavigationOpen: false }),
  toggleMobileNavigation: () =>
    set((state) => ({
      isMobileNavigationOpen: !state.isMobileNavigationOpen,
    })),
}));
