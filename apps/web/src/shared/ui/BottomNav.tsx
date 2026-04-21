// Bottom tab bar — two tabs: Productos and Vender.
//
// Fixed to the bottom of the viewport. Uses the router context
// to highlight the active tab and switch between root screens.

import type { ComponentType } from 'react';
import { type Tab, useRouter } from '../lib/router';
import { BanknotesIcon, ChartBarIcon, CubeIcon } from './icons';

interface IconProps {
  className?: string;
  strokeWidth?: number;
  'aria-label'?: string;
}

const TABS: Array<{ id: Tab; label: string; Icon: ComponentType<IconProps> }> = [
  { id: 'products', label: 'Productos', Icon: CubeIcon },
  { id: 'quick-sale', label: 'Vender', Icon: BanknotesIcon },
  { id: 'daily-summary', label: 'Caja', Icon: ChartBarIcon },
];

export function BottomNav() {
  const { activeTab, setTab } = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-card border-t border-subtle safe-area-bottom">
      <div className="flex">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 min-h-touch transition-colors
                ${isActive ? 'text-craft-700' : 'text-fg-muted'}`}
            >
              <tab.Icon
                className="w-6 h-6"
                strokeWidth={isActive ? 2 : 1.5}
                aria-label={tab.label}
              />
              <span className={`text-xs ${isActive ? 'font-semibold' : ''}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
