import { create } from "zustand";
import { persist } from "zustand/middleware";

type AppState = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v })
    }),
    { name: "okde-ui" }
  )
);
