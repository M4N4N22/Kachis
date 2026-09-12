"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const LAYOUT_KEY = "kachis-workspace-layout";

export type WorkspaceLayoutMode = "chat" | "classic";

interface WorkspaceLayoutContextValue {
  mode: WorkspaceLayoutMode;
  hydrated: boolean;
  setMode: (mode: WorkspaceLayoutMode) => void;
}

const WorkspaceLayoutContext = createContext<WorkspaceLayoutContextValue | null>(
  null,
);

function readLayout(): WorkspaceLayoutMode {
  if (typeof window === "undefined") return "chat";
  try {
    const value = window.localStorage.getItem(LAYOUT_KEY);
    return value === "classic" ? "classic" : "chat";
  } catch {
    return "chat";
  }
}

export function WorkspaceLayoutProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<WorkspaceLayoutMode>("chat");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setModeState(readLayout());
    setHydrated(true);
  }, []);

  const setMode = useCallback((next: WorkspaceLayoutMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(LAYOUT_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ mode, hydrated, setMode }),
    [mode, hydrated, setMode],
  );

  return (
    <WorkspaceLayoutContext.Provider value={value}>
      {children}
    </WorkspaceLayoutContext.Provider>
  );
}

export function useWorkspaceLayout() {
  const context = useContext(WorkspaceLayoutContext);
  if (!context) {
    throw new Error("useWorkspaceLayout must be used within WorkspaceLayoutProvider");
  }
  return context;
}
