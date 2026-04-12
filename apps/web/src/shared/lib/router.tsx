// Minimal state-based router for a mobile-first PWA.
//
// No react-router needed — Craftly has ~4 screens. State machine is simpler,
// lighter, and gives us full control over transitions and back behavior.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type Screen =
  | { name: 'products' }
  | { name: 'product-form'; productId?: string }
  | { name: 'quick-sale' }
  | { name: 'sale-success'; total: string };

export type Tab = 'products' | 'quick-sale';

interface RouterState {
  screen: Screen;
  activeTab: Tab;
  navigate: (screen: Screen) => void;
  goBack: () => void;
  setTab: (tab: Tab) => void;
}

const RouterContext = createContext<RouterState | null>(null);

const TAB_ROOT: Record<Tab, Screen> = {
  products: { name: 'products' },
  'quick-sale': { name: 'quick-sale' },
};

export function RouterProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>({ name: 'products' });
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const historyRef = useRef<Screen[]>([]);

  const navigate = useCallback(
    (next: Screen) => {
      historyRef.current.push(screen);
      setScreen(next);
    },
    [screen],
  );

  const goBack = useCallback(() => {
    const prev = historyRef.current.pop();
    if (prev) {
      setScreen(prev);
      // Sync tab highlight
      if (prev.name === 'products' || prev.name === 'product-form') {
        setActiveTab('products');
      } else {
        setActiveTab('quick-sale');
      }
    }
  }, []);

  const setTab = useCallback((tab: Tab) => {
    historyRef.current = [];
    setActiveTab(tab);
    setScreen(TAB_ROOT[tab]);
  }, []);

  const value = useMemo(
    () => ({ screen, activeTab, navigate, goBack, setTab }),
    [screen, activeTab, navigate, goBack, setTab],
  );

  return (
    <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
  );
}

export function useRouter(): RouterState {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
