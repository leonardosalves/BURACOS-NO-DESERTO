import React from 'react';
import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

type DashAlertTone = 'primary' | 'success' | 'warning' | 'danger' | 'info';

type DashAlertProps = {
  tone?: DashAlertTone;
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
};

const icons: Record<DashAlertTone, React.ElementType> = {
  primary: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  danger: XCircle,
  info: Info,
};

export function DashAlert({
  tone = 'primary',
  title,
  children,
  dismissible,
  onDismiss,
  className = '',
}: DashAlertProps) {
  const Icon = icons[tone];
  return (
    <div className={`dash-alert dash-alert-${tone} ${className}`.trim()} role="alert">
      <Icon className="dash-alert-icon shrink-0" />
      <div className="dash-alert-body min-w-0">
        {title && <p className="dash-alert-title">{title}</p>}
        <div className="dash-alert-text">{children}</div>
      </div>
      {dismissible && (
        <button type="button" className="dash-alert-close" onClick={onDismiss} aria-label="Fechar">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}