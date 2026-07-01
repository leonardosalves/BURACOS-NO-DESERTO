import React from 'react';

type DashButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'info' | 'outline' | 'ghost';
type DashButtonSize = 'sm' | 'md' | 'lg';

type DashButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: DashButtonVariant;
  size?: DashButtonSize;
  children: React.ReactNode;
};

const sizeClass: Record<DashButtonSize, string> = {
  sm: 'dash-ui-btn-sm',
  md: 'dash-ui-btn-md',
  lg: 'dash-ui-btn-lg',
};

export function DashButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  type = 'button',
  ...rest
}: DashButtonProps) {
  return (
    <button
      type={type}
      className={`dash-ui-btn dash-ui-btn-${variant} ${sizeClass[size]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}