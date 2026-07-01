import React from 'react';

type DashListGroupItem = {
  id: string;
  title: string;
  subtitle?: string;
  active?: boolean;
  badge?: React.ReactNode;
  onClick?: () => void;
};

type DashListGroupProps = {
  items: DashListGroupItem[];
  className?: string;
};

export function DashListGroup({ items, className = '' }: DashListGroupProps) {
  return (
    <ul className={`dash-list-group ${className}`.trim()}>
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className={`dash-list-group-item ${item.active ? 'active' : ''}`}
            onClick={item.onClick}
          >
            <div className="min-w-0 text-left">
              <p className="dash-list-group-title">{item.title}</p>
              {item.subtitle && <p className="dash-list-group-sub">{item.subtitle}</p>}
            </div>
            {item.badge}
          </button>
        </li>
      ))}
    </ul>
  );
}