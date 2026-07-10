import React from "react";
import {
  Toaster,
  ToastBar,
  resolveValue,
  toast,
  type Toast,
} from "react-hot-toast";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";

function toneFromToast(t: Toast): string {
  if (t.type === "success") return "success";
  if (t.type === "error") return "danger";
  if (t.type === "loading") return "loading";
  if (t.icon === "⚠️" || t.className?.includes("warning")) return "warning";
  if (t.icon === "📍" || t.icon === "🗺️") return "info";
  return "primary";
}

function ToneIcon({ tone }: { tone: string }) {
  const cls = "dash-toast-icon shrink-0";
  if (tone === "success") return <CheckCircle2 className={cls} aria-hidden />;
  if (tone === "danger") return <XCircle className={cls} aria-hidden />;
  if (tone === "warning") return <AlertTriangle className={cls} aria-hidden />;
  if (tone === "loading")
    return <Loader2 className={`${cls} animate-spin`} aria-hidden />;
  if (tone === "info") return <Info className={cls} aria-hidden />;
  return <Sparkles className={cls} aria-hidden />;
}

export function DashToaster() {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      containerClassName="dash-toast-container"
      toastOptions={{
        duration: 4200,
        className: "dash-toast",
      }}
    >
      {(t) => {
        const tone = toneFromToast(t);
        const message = resolveValue(t.message, t);
        return (
          <ToastBar
            toast={t}
            style={{
              background: "transparent",
              boxShadow: "none",
              border: "none",
              padding: 0,
            }}
          >
            {() => (
              <div
                className={`dash-toast-card dash-toast-${tone} ${
                  t.visible ? "dash-toast-visible" : "dash-toast-hidden"
                }`}
                role="status"
                aria-live="polite"
              >
                <ToneIcon tone={tone} />
                <p className="dash-toast-message">{message}</p>
                {t.type !== "loading" ? (
                  <button
                    type="button"
                    className="dash-toast-dismiss"
                    aria-label="Fechar aviso"
                    onClick={() => toast.dismiss(t.id)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>
            )}
          </ToastBar>
        );
      }}
    </Toaster>
  );
}
