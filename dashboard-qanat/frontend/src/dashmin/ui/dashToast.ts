import toast from 'react-hot-toast';

type DashToastTone = 'success' | 'error' | 'warning' | 'info' | 'primary';

const toneClass: Record<DashToastTone, string> = {
  success: 'dash-toast dash-toast-success',
  error: 'dash-toast dash-toast-danger',
  warning: 'dash-toast dash-toast-warning',
  info: 'dash-toast dash-toast-info',
  primary: 'dash-toast dash-toast-primary',
};

function show(message: string, tone: DashToastTone, duration = 4000) {
  return toast(message, {
    duration,
    className: toneClass[tone],
    style: {
      background: 'var(--dash-card)',
      color: '#fff',
      border: '1px solid var(--dash-border)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      fontSize: '12px',
      fontWeight: 600,
    },
  });
}

export const dashToast = {
  success: (msg: string) => show(msg, 'success'),
  error: (msg: string) => show(msg, 'error'),
  warning: (msg: string) => show(msg, 'warning'),
  info: (msg: string) => show(msg, 'info'),
  primary: (msg: string) => show(msg, 'primary'),
};