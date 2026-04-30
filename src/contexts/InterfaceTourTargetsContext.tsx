import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

export interface InterfaceTourTargetLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface InterfaceTourTargetsContextValue {
  registerTargetRef: (targetId: string, ref: any | null) => void;
  unregisterTargetRef: (targetId: string) => void;
  measureTarget: (targetId: string) => Promise<InterfaceTourTargetLayout | null>;
  getTargetLayout: (targetId: string) => InterfaceTourTargetLayout | null;
}

const InterfaceTourTargetsContext = createContext<InterfaceTourTargetsContextValue | undefined>(undefined);

export const InterfaceTourTargetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const targetRefs = useRef<Map<string, any>>(new Map());
  const [targetLayouts, setTargetLayouts] = useState<Record<string, InterfaceTourTargetLayout>>({});

  const registerTargetRef = useCallback((targetId: string, ref: any | null) => {
    if (!targetId) return;
    if (!ref) {
      targetRefs.current.delete(targetId);
      return;
    }
    targetRefs.current.set(targetId, ref);
  }, []);

  const unregisterTargetRef = useCallback((targetId: string) => {
    targetRefs.current.delete(targetId);
    setTargetLayouts((prev) => {
      if (!prev[targetId]) return prev;
      const next = { ...prev };
      delete next[targetId];
      return next;
    });
  }, []);

  const measureTarget = useCallback(async (targetId: string): Promise<InterfaceTourTargetLayout | null> => {
    const ref = targetRefs.current.get(targetId);
    if (!ref || typeof ref.measureInWindow !== 'function') {
      return null;
    }

    return new Promise((resolve) => {
      try {
        ref.measureInWindow((x: number, y: number, width: number, height: number) => {
          if (!Number.isFinite(x) || !Number.isFinite(y) || width <= 0 || height <= 0) {
            resolve(null);
            return;
          }
          const layout = { x, y, width, height };
          setTargetLayouts((prev) => ({ ...prev, [targetId]: layout }));
          resolve(layout);
        });
      } catch {
        resolve(null);
      }
    });
  }, []);

  const getTargetLayout = useCallback(
    (targetId: string): InterfaceTourTargetLayout | null => targetLayouts[targetId] ?? null,
    [targetLayouts]
  );

  const value = useMemo<InterfaceTourTargetsContextValue>(
    () => ({
      registerTargetRef,
      unregisterTargetRef,
      measureTarget,
      getTargetLayout,
    }),
    [getTargetLayout, measureTarget, registerTargetRef, unregisterTargetRef]
  );

  return (
    <InterfaceTourTargetsContext.Provider value={value}>
      {children}
    </InterfaceTourTargetsContext.Provider>
  );
};

export function useInterfaceTourTargets(): InterfaceTourTargetsContextValue {
  const context = useContext(InterfaceTourTargetsContext);
  if (!context) {
    throw new Error('useInterfaceTourTargets must be used within InterfaceTourTargetsProvider');
  }
  return context;
}
