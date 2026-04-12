// Bottom tab bar — two tabs: Productos and Vender.
//
// Fixed to the bottom of the viewport. Uses the router context
// to highlight the active tab and switch between root screens.

import { useRouter, type Tab } from '../lib/router';

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'products', label: 'Productos', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { id: 'quick-sale', label: 'Vender', icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z' },
];

export function BottomNav() {
  const { activeTab, setTab } = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 safe-area-bottom">
      <div className="flex">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 min-h-touch transition-colors
                ${isActive ? 'text-craft-700' : 'text-stone-400'}`}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={isActive ? 2 : 1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={tab.icon}
                />
              </svg>
              <span className={`text-xs ${isActive ? 'font-semibold' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
