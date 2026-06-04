import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type ToastProps = {
  message: string;
  tone?: "success" | "error" | "info";
  onClose?: () => void;
};

export function Toast({ message, tone = "info", onClose }: ToastProps) {
  if (!message) return null;

  const icons = {
    success: CheckCircle2,
    error: AlertTriangle,
    info: Info
  };
  const styles = {
    success: "border-emerald-200 bg-white text-emerald-900 shadow-emerald-950/12",
    error: "border-red-200 bg-white text-red-900 shadow-red-950/14",
    info: "border-blue-200 bg-white text-blue-900 shadow-blue-950/12"
  };
  const iconStyles = {
    success: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    error: "bg-red-50 text-red-600 ring-red-100",
    info: "bg-blue-50 text-blue-600 ring-blue-100"
  };
  const Icon = icons[tone];

  return (
    <div className="pointer-events-none fixed inset-x-3 top-[46%] z-[120] flex -translate-y-1/2 justify-center px-2 sm:top-[38%]">
      <div
        className={`toast-pop pointer-events-auto flex w-full max-w-xl items-start gap-3 rounded-[22px] border px-4 py-4 text-sm shadow-[0_24px_80px_rgba(15,23,42,0.20)] ring-1 ring-black/5 backdrop-blur-xl ${styles[tone]}`}
        role="alert"
        aria-live={tone === "error" ? "assertive" : "polite"}
      >
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ${iconStyles[tone]}`}>
          <Icon size={20} />
        </span>
        <span className="min-w-0 flex-1 pt-2 font-semibold leading-6">{message}</span>
      {onClose ? (
        <button className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" onClick={onClose} aria-label="Закрыть уведомление">
          <X size={18} />
        </button>
      ) : null}
      </div>
    </div>
  );
}
