import type { ComponentType, ReactNode } from "react";
import { ArrowRight, FileSearch, Loader2 } from "lucide-react";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type Tone = "blue" | "orange" | "rose" | "violet" | "green" | "slate" | "red";

const toneClasses: Record<Tone, string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  orange: "bg-orange-50 text-orange-700 ring-orange-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  red: "bg-red-50 text-red-700 ring-red-100"
};

const iconToneClasses: Record<Tone, string> = {
  blue: "bg-blue-600 text-white shadow-blue-600/25",
  orange: "bg-orange-500 text-white shadow-orange-500/25",
  rose: "bg-rose-500 text-white shadow-rose-500/25",
  violet: "bg-violet-600 text-white shadow-violet-600/25",
  green: "bg-emerald-600 text-white shadow-emerald-600/25",
  slate: "bg-slate-900 text-white shadow-slate-900/20",
  red: "bg-red-500 text-white shadow-red-500/25"
};

export function Badge(props: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cx("inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ring-1", toneClasses[props.tone ?? "slate"], props.className)}>
      {props.children}
    </span>
  );
}

export function IconTile(props: { icon: ComponentType<{ size?: number; className?: string }>; tone?: Tone; className?: string }) {
  const Icon = props.icon;
  return (
    <div className={cx("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-lg", iconToneClasses[props.tone ?? "blue"], props.className)}>
      <Icon size={22} />
    </div>
  );
}

export function PageHeader(props: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <h1 className="text-[32px] font-semibold leading-tight tracking-normal text-slate-950 md:text-[38px]">{props.title}</h1>
        {props.description ? <p className="mt-2 text-base leading-7 text-slate-500">{props.description}</p> : null}
      </div>
      {props.action ? <div className="shrink-0">{props.action}</div> : null}
    </div>
  );
}

export function EmptyState(props: { title: string; description: string; actionLabel?: string; onAction?: () => void; icon?: ComponentType<{ size?: number; className?: string }>; tone?: Tone }) {
  const Icon = props.icon ?? FileSearch;
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
      <div className={cx("mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] ring-1", toneClasses[props.tone ?? "blue"])}>
        <Icon size={28} />
      </div>
      <div className="text-lg font-semibold text-slate-950">{props.title}</div>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{props.description}</p>
      {props.actionLabel && props.onAction ? (
        <button className="premium-button-blue mt-5" onClick={props.onAction}>
          {props.actionLabel}
          <ArrowRight size={17} />
        </button>
      ) : null}
    </div>
  );
}

export function LoadingRows(props: { rows?: number; columns?: number }) {
  const rows = Array.from({ length: props.rows ?? 4 });
  const columns = Array.from({ length: props.columns ?? 4 });
  return (
    <div className="space-y-3 p-5">
      {rows.map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
          {columns.map((__, columnIndex) => (
            <div key={columnIndex} className="skeleton h-10" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function InlineLoading(props: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
      <Loader2 size={16} className="animate-spin" />
      {props.label ?? "Загрузка"}
    </span>
  );
}

export function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString("ru-RU") : "Без даты";
}

export function formatDateTime(value?: string) {
  return value ? new Date(value).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Без даты";
}

export function isOverdue(value?: string) {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}
