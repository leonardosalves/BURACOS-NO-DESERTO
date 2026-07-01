import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { DashButton } from './DashButton';

type DashModalProps = {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
  onConfirm?: () => void;
  onCancel: () => void;
  hideActions?: boolean;
};

export function DashModal({
  open,
  title,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'primary',
  onConfirm,
  onCancel,
  hideActions,
}: DashModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="dash-modal-backdrop" onClick={onCancel} role="presentation">
      <div
        className={`dash-modal dash-modal-${tone}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dash-modal-title"
      >
        <div className="dash-modal-header">
          <h3 id="dash-modal-title" className="dash-modal-title">
            {title}
          </h3>
          <button type="button" className="dash-modal-close" onClick={onCancel} aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="dash-modal-body">{children}</div>
        {!hideActions && (
          <div className="dash-modal-footer">
            <DashButton variant="ghost" size="sm" onClick={onCancel}>
              {cancelLabel}
            </DashButton>
            {onConfirm && (
              <DashButton variant={tone === 'danger' ? 'danger' : tone === 'success' ? 'success' : 'primary'} size="sm" onClick={onConfirm}>
                {confirmLabel}
              </DashButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}