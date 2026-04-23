import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

interface AuthState {
  session: Session | null;
  isReady: boolean;
  demoMode: boolean;
  setSession: (session: Session | null) => void;
  setReady: (isReady: boolean) => void;
  enableDemoMode: () => void;
  signOutDemo: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isReady: false,
  demoMode: false,
  setSession: (session) => set({ session }),
  setReady: (isReady) => set({ isReady }),
  enableDemoMode: () => set({ demoMode: true }),
  signOutDemo: () => set({ demoMode: false, session: null }),
}));
