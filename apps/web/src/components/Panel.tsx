import type { ReactNode } from "react";

type PanelProps = {
  title: string;
  action?: ReactNode;
  description?: string;
  children: ReactNode;
};

export function Panel({ title, action, description, children }: PanelProps) {
  return (
    <section className="premium-panel overflow-hidden">
      <div className="premium-panel-header">
        <div>
          <h2 className="text-[15px] font-semibold tracking-normal text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0 text-sm font-semibold text-blue-600">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
