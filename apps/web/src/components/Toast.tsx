type ToastProps = {
  message: string;
  tone?: "success" | "error" | "info";
  onClose?: () => void;
};

export function Toast({ message, tone = "info", onClose }: ToastProps) {
  if (!message) return null;
  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-blue-200 bg-blue-50 text-blue-800"
  };

  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${styles[tone]}`}>
      <span>{message}</span>
      {onClose ? (
        <button className="ml-4 font-semibold" onClick={onClose}>
          Закрыть
        </button>
      ) : null}
    </div>
  );
}
