import React from 'react';

export type DashTabItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
};

type DashTabsProps = {
  tabs: DashTabItem[];
  active: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pill';
  className?: string;
};

export function DashTabs({ tabs, active, onChange, variant = 'underline', className = '' }: DashTabsProps) {
  return (
    <div className={`dash-ui-tabs dash-ui-tabs-${variant} ${className}`.trim()} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`dash-ui-tab ${active === tab.id ? 'dash-ui-tab-active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}