import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DisplaySettingsProvider, useDisplaySettings } from './display-settings';

function createWrapper() {
  return function DisplaySettingsTestWrapper({ children }: { children: ReactNode }) {
    return <DisplaySettingsProvider>{children}</DisplaySettingsProvider>;
  };
}

describe('DisplaySettingsProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-small-text-step');
    document.documentElement.style.removeProperty('--small-text-scale');
  });

  it('hydrates theme and small text step from localStorage', () => {
    window.localStorage.setItem('craftly.theme', 'dark');
    window.localStorage.setItem('craftly.small-text-step', '2');

    const { result } = renderHook(() => useDisplaySettings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.theme).toBe('dark');
    expect(result.current.smallTextStep).toBe(2);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.dataset.smallTextStep).toBe('2');
    expect(document.documentElement.style.getPropertyValue('--small-text-scale')).toBe('1.16');
  });

  it('toggles dark mode and clamps small text controls', () => {
    const { result } = renderHook(() => useDisplaySettings(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.toggleTheme();
      result.current.decreaseSmallText();
      result.current.increaseSmallText();
      result.current.increaseSmallText();
      result.current.increaseSmallText();
      result.current.increaseSmallText();
    });

    expect(result.current.theme).toBe('dark');
    expect(result.current.smallTextStep).toBe(3);
    expect(result.current.canIncreaseSmallText).toBe(false);
    expect(result.current.canDecreaseSmallText).toBe(true);
    expect(window.localStorage.getItem('craftly.theme')).toBe('dark');
    expect(window.localStorage.getItem('craftly.small-text-step')).toBe('3');
  });
});
