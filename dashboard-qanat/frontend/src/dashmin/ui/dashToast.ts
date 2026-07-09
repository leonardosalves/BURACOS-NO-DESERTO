import toast from "react-hot-toast";

type DashToastTone = "success" | "error" | "warning" | "info" | "primary";

function toneClass(tone: DashToastTone) {
  return `dash-toast dash-toast-${tone === "error" ? "danger" : tone}`;
}

export const dashToast = {
  success: (msg: string) =>
    toast.success(msg, { duration: 4200, className: toneClass("success") }),
  error: (msg: string) =>
    toast.error(msg, { duration: 5200, className: toneClass("error") }),
  warning: (msg: string) =>
    toast(msg, { duration: 4800, className: toneClass("warning"), icon: "⚠️" }),
  info: (msg: string) =>
    toast(msg, { duration: 4200, className: toneClass("info") }),
  primary: (msg: string) =>
    toast(msg, { duration: 4200, className: toneClass("primary") }),
};