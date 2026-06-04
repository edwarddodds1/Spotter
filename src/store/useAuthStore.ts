import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

interface AuthState {
  session: Session | null;
  isReady: boolean;
  /** One-shot message from OAuth/email redirect failures (web). */
  authRedirectNotice: string | null;
  setSession: (session: Session | null) => void;
  setReady: (isReady: boolean) => void;
  setAuthRedirectNotice: (message: string | null) => void;
  /** Clear the local session (server sign-out is handled by the caller). */
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isReady: false,
  authRedirectNotice: null,
  setSession: (session) => set({ session }),
  setReady: (isReady) => set({ isReady }),
  setAuthRedirectNotice: (authRedirectNotice) => set({ authRedirectNotice }),
  signOut: () => set({ session: null }),
}));
