import { create } from "zustand";

/**
 * Lightweight client cache of the user ids the signed-in user has blocked.
 * Hydrated from `user_blocks` on social-surface focus and updated optimistically
 * when the user blocks/unblocks someone. Feed and profile surfaces read this to
 * hide blocked users' content (App Store guideline 1.2).
 */
interface ModerationState {
  blockedUserIds: string[];
  setBlockedUserIds: (ids: string[]) => void;
  addBlockedUserId: (id: string) => void;
  removeBlockedUserId: (id: string) => void;
}

export const useModerationStore = create<ModerationState>((set) => ({
  blockedUserIds: [],
  setBlockedUserIds: (ids) => set({ blockedUserIds: Array.from(new Set(ids)) }),
  addBlockedUserId: (id) =>
    set((state) =>
      state.blockedUserIds.includes(id)
        ? state
        : { blockedUserIds: [...state.blockedUserIds, id] },
    ),
  removeBlockedUserId: (id) =>
    set((state) => ({ blockedUserIds: state.blockedUserIds.filter((x) => x !== id) })),
}));
