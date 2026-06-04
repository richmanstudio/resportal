import { ArrowRight, CheckCircle2, FileText, Scale, ShieldCheck, Table2 } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { MarketingShell } from "../components/MarketingShell";
import { seoLandings } from "./seoLandingData";

export function SeoLandingPage() {
  const { slug } = useParams();
  const page = seoLandings.find((item) => item.slug === slug);

  if (!page) return <Navigate to="/" replace />;

  return (
    <MarketingShell>
      <section className="mx-auto max-w-[1220px] px-5 pb-16 pt-20">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div className="marketing-reveal">
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-blue-600 text-white shadow-[0_18px_42px_rgba(37,99,235,0.22)]">
              <Scale size={30} />
            </div>
            <h1 className="mt-8 text-[46px] font-bold leading-[1.05] tracking-[-0.03em] md:text-[72px]">{page.title}</h1>
            <p className="mt-7 max-w-2xl text-xl leading-8 text-slate-600">{page.lead}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#0b2744] px-8 py-5 text-lg font-semibold text-white shadow-[0_18px_42px_rgba(11,39,68,0.25)]">
                Попробовать бесплатно <ArrowRight size={20} />
              </Link>
              <Link to="/pricing" className="inline-flex items-center justify-center rounded-[18px] bg-white px-8 py-5 text-lg font-semibold text-[#0b2744] shadow-[0_14px_36px_rgba(11,39,68,0.08)]">
                Тарифы
              </Link>
            </div>
          </div>
          <div className="marketing-reveal marketing-delay-1 rounded-[34px] bg-[#c9e3ff] p-7 shadow-[0_26px_90px_rgba(11,39,68,0.10)]">
            <div className="rounded-[28px] bg-white/88 p-6">
              <div className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Почему это важно</div>
              <p className="mt-5 text-2xl font-bold leading-snug text-[#0b2744]">{page.pain}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-5 pb-20">
        <div className="grid gap-5 lg:grid-cols-3">
          <article className="marketing-reveal rounded-[30px] bg-white p-7 shadow-[0_20px_70px_rgba(11,39,68,0.07)]">
            <ShieldCheck size={30} className="text-blue-600" />
            <h2 className="mt-8 text-2xl font-bold">Что закрывает</h2>
            <div className="mt-5 space-y-3">
              {page.benefits.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <CheckCircle2 size={18} className="text-emerald-600" /> {item}
                </div>
              ))}
            </div>
          </article>
          <article className="marketing-reveal rounded-[30px] bg-white p-7 shadow-[0_20px_70px_rgba(11,39,68,0.07)]">
            <FileText size={30} className="text-blue-600" />
            <h2 className="mt-8 text-2xl font-bold">Сценарии</h2>
            <div className="mt-5 space-y-3">
              {page.scenarios.map((item) => (
                <div key={item} className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">{item}</div>
              ))}
            </div>
          </article>
          <article className="marketing-reveal rounded-[30px] bg-[#0b2744] p-7 text-white shadow-[0_20px_70px_rgba(11,39,68,0.12)]">
            <Table2 size={30} className="text-blue-300" />
            <h2 className="mt-8 text-2xl font-bold">Ключевой результат</h2>
            <p className="mt-5 text-base leading-7 text-blue-100">Юрист видит не набор разрозненных записей, а рабочий контекст: что за дело, кто клиент, какой срок ближайший и где лежат документы.</p>
          </article>
        </div>

        <div className="marketing-reveal mt-8 overflow-hidden rounded-[30px] bg-white shadow-[0_20px_70px_rgba(11,39,68,0.07)] ring-1 ring-slate-200/70">
          <div className="grid bg-[#0b2744] px-6 py-4 text-sm font-bold text-white md:grid-cols-3">
            <div>Альтернатива</div>
            <div>Где ломается</div>
            <div>Как решает РЕСПОРТАЛ</div>
          </div>
          {page.comparison.map((row) => (
            <div key={row.alternative} className="grid gap-3 border-t border-slate-100 px-6 py-5 text-sm leading-6 md:grid-cols-3">
              <div className="font-bold text-[#0b2744]">{row.alternative}</div>
              <div className="text-slate-600">{row.problem}</div>
              <div className="font-semibold text-blue-700">{row.resportal}</div>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
