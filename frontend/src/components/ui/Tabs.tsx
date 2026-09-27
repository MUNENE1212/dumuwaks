import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  variant?: 'line' | 'enclosed' | 'soft-rounded';
  className?: string;
}

/**
 * Tabs component with horizontal scrolling for mobile
 *
 * @example
 * ```tsx
 * const tabs = [
 *   { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
 *   { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
 * ];
 * <Tabs tabs={tabs} />
 * ```
 */
export const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultTab,
  variant = 'line',
  className,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab && !tab.disabled) {
      setActiveTab(tabId);
    }
  };

  const variantClasses = {
    line: {
      container: 'border-b border-line',
      trigger: (isActive: boolean) =>
        cn(
          'px-4 py-3 font-medium transition-all duration-200 whitespace-nowrap min-h-[48px] flex items-center',
          isActive
            ? 'text-primary-500 border-b-2 border-primary-500'
            : 'text-ink-muted hover:text-ink-muted'
        ),
    },
    enclosed: {
      container: 'bg-surface-200 p-1 rounded-xl inline-flex',
      trigger: (isActive: boolean) =>
        cn(
          'px-6 py-2 font-medium transition-all duration-200 rounded-lg min-h-[44px] flex items-center',
          isActive
            ? 'bg-surface-100 text-primary-500 shadow-sm'
            : 'text-ink-muted hover:text-ink-muted'
        ),
    },
    'soft-rounded': {
      container: 'space-x-2',
      trigger: (isActive: boolean) =>
        cn(
          'px-6 py-2 font-medium transition-all duration-200 rounded-full min-h-[44px] flex items-center',
          isActive
            ? 'bg-primary-500 text-on-lumen'
            : 'text-ink-muted hover:bg-surface-200'
        ),
    },
  };

  const activeTabContent = tabs.find((t) => t.id === activeTab)?.content;

  return (
    <div className={cn('w-full', className)}>
      {/* Tab Triggers */}
      <div className={cn('flex overflow-x-auto scrollbar-hide', variantClasses[variant].container)}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              disabled={tab.disabled}
              className={cn(
                variantClasses[variant].trigger(activeTab === tab.id),
                'disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2'
              )}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
            >
              {Icon && <Icon className="w-5 h-5 mr-2" />}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="mt-4"
      >
        {activeTabContent}
      </div>
    </div>
  );
};

Tabs.displayName = 'Tabs';
