import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type ThemeMode = 'light' | 'dark';

interface DisplaySettingsState {
  theme: ThemeMode;
  smallTextStep: number;
  canDecreaseSmallText: boolean;
  canIncreaseSmallText: boolean;
  toggleTheme: () => void;
  decreaseSmallText: () => void;
  increaseSmallText: () => void;
}

const STORAGE_KEYS = {
  theme: 'craftly.theme',
  smallTextStep: 'craftly.small-text-step',
} as const;

const SMALL_TEXT_STEPS = [1, 1.08, 1.16, 1.24] as const;

const DisplaySettingsContext = createContext<DisplaySettingsState | null>(null);

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';

  const storedTheme = window.localStorage.getItem(STORAGE_KEYS.theme);
  return storedTheme === 'dark' ? 'dark' : 'light';
}

function getInitialSmallTextStep(): number {
  if (typeof window === 'undefined') return 0;

  const storedStep = Number(window.localStorage.getItem(STORAGE_KEYS.smallTextStep));
  if (Number.isNaN(storedStep)) return 0;

  return Math.min(Math.max(storedStep, 0), SMALL_TEXT_STEPS.length - 1);
}

export function DisplaySettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const [smallTextStep, setSmallTextStep] = useState<number>(() => getInitialSmallTextStep());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--small-text-scale',
      String(SMALL_TEXT_STEPS[smallTextStep]),
    );
    document.documentElement.dataset.smallTextStep = String(smallTextStep);
    window.localStorage.setItem(STORAGE_KEYS.smallTextStep, String(smallTextStep));
  }, [smallTextStep]);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'));
  }, []);

  const decreaseSmallText = useCallback(() => {
    setSmallTextStep((currentStep) => Math.max(currentStep - 1, 0));
  }, []);

  const increaseSmallText = useCallback(() => {
    setSmallTextStep((currentStep) => Math.min(currentStep + 1, SMALL_TEXT_STEPS.length - 1));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      smallTextStep,
      canDecreaseSmallText: smallTextStep > 0,
      canIncreaseSmallText: smallTextStep < SMALL_TEXT_STEPS.length - 1,
      toggleTheme,
      decreaseSmallText,
      increaseSmallText,
    }),
    [theme, smallTextStep, toggleTheme, decreaseSmallText, increaseSmallText],
  );

  return (
    <DisplaySettingsContext.Provider value={value}>{children}</DisplaySettingsContext.Provider>
  );
}

export function useDisplaySettings(): DisplaySettingsState {
  const ctx = useContext(DisplaySettingsContext);
  if (!ctx) {
    throw new Error('useDisplaySettings must be used within DisplaySettingsProvider');
  }

  return ctx;
}
