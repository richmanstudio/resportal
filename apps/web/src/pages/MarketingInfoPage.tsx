import { Navigate, useLocation } from "react-router-dom";
import { MarketingShell } from "../components/MarketingShell";
import { marketingPages } from "./marketingData";

export function MarketingInfoPage() {
  const { pathname } = useLocation();
  const page = marketingPages[pathname];

  if (!page) {
    return <Navigate to="/" replace />;
  }

  return (
    <MarketingShell>
      <section className="mx-auto max-w-[1220px] px-5 pb-16 pt-20">
        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div className="marketing-reveal">
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-blue-600 text-white shadow-[0_18px_42px_rgba(37,99,235,0.22)]">
              <page.icon size={30} />
            </div>
            <h1 className="mt-8 text-[48px] font-bold leading-[1.05] tracking-[-0.03em] md:text-[72px]">{page.title}</h1>
            <p className="mt-7 max-w-2xl text-xl leading-8 text-slate-600">{page.description}</p>
          </div>
          <div className="marketing-reveal marketing-delay-1 rounded-[34px] bg-[#c9e3ff] p-7 shadow-[0_26px_90px_rgba(11,39,68,0.10)]">
            <div className="rounded-[28px] bg-white/86 p-6">
              <div className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Что внутри</div>
              <div className="mt-5 grid gap-3">
                {page.bullets.map((bullet, index) => (
                  <div key={bullet} className="flex items-center gap-4 rounded-2xl bg-blue-50 px-4 py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{index + 1}</span>
                    <span className="font-semibold">{bullet}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-5 pb-24">
        <div className="grid gap-5 md:grid-cols-3">
          {page.sections.map((section) => (
            <article key={section.title} className="marketing-reveal rounded-[30px] bg-white/84 p-7 shadow-[0_20px_70px_rgba(11,39,68,0.07)] transition duration-300 hover:-translate-y-1">
              <h2 className="text-2xl font-bold">{section.title}</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">{section.text}</p>
            </article>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
