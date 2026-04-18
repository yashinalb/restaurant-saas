import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import posSessionService, { PosWaiterSession } from '../services/frontend-posSessionService';

interface PosSessionState {
  session: PosWaiterSession | null;
  loading: boolean;
  setSession: (s: PosWaiterSession | null) => void;
  login: (pin: string, store_id: number) => Promise<PosWaiterSession>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const usePosSessionStore = create<PosSessionState>()(
  persist(
    (set, get) => ({
      session: null,
      loading: false,
      setSession: (s) => set({ session: s }),

      login: async (pin, store_id) => {
        set({ loading: true });
        try {
          const session = await posSessionService.login({ pin, store_id });
          set({ session, loading: false });
          return session;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      logout: async () => {
        const current = get().session;
        if (current) {
          try {
            await posSessionService.logout(current.id);
          } catch {
            // Fall through — clear the client-side session even if the server call fails
          }
        }
        set({ session: null });
      },

      refresh: async () => {
        try {
          const fresh = await posSessionService.getActiveSession();
          set({ session: fresh });
        } catch {
          set({ session: null });
        }
      },
    }),
    { name: 'pos-session' }
  )
);
