import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

import { useSpotterStore } from "@/store/useSpotterStore";

interface AuthState {
  session: Session | null;
  isReady: boolean;
  demoMode: boolean;
  /** One-shot message from OAuth/email redirect failures (web). */
  authRedirectNotice: string | null;
  setSession: (session: Session | null) => void;
  setReady: (isReady: boolean) => void;
  setAuthRedirectNotice: (message: string | null) => void;
  enableDemoMode: () => void;
  signOutDemo: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isReady: false,
  demoMode: false,
  authRedirectNotice: null,
  setSession: (session) => set({ session }),
  setReady: (isReady) => set({ isReady }),
  setAuthRedirectNotice: (authRedirectNotice) => set({ authRedirectNotice }),
  enableDemoMode: () => {
    useSpotterStore.getState().loadDemoSeed();
    set({ demoMode: true });
  },
  signOutDemo: () => set({ demoMode: false, session: null }),
}));
