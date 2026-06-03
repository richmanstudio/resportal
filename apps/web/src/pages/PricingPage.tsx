import { CheckCircle2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { MarketingShell } from "../components/MarketingShell";

const plans = [
  {
    name: "Free",
    price: "0 ₽",
    description: "Старт без оплаты, чтобы проверить рабочий сценарий на реальных данных.",
    limit: "до 3 дел",
    features: ["Ограниченное число дел", "Базовые клиенты и задачи", "Один рабочий профиль", "Демо-данные один раз"],
    highlight: false
  },
  {
    name: "Solo",
    price: "по подписке",
    description: "Для частного юриста, который ведет личную практику.",
    limit: "личная практика",
    features: ["Больше дел и документов", "Контроль сроков", "Личный дашборд", "Профиль и настройки"],
    highlight: false
  },
  {
    name: "Team",
    price: "по подписке",
    description: "Самый частый выбор для небольшой юридической команды.",
    limit: "команда",
    features: ["Несколько участников", "Роли и доступы", "Командные задачи", "Нагрузка и контроль"],
    highlight: true
  },
  {
    name: "Firm",
    price: "по подписке",
    description: "Для юридической фирмы с единым стандартом работы.",
    limit: "фирма",
    features: ["Расширенная команда", "Больше рабочих данных", "Процессы фирмы", "Приоритетная поддержка"],
    highlight: false
  }
];

export function PricingPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-[1220px] px-5 pb-16 pt-20 text-center">
        <div className="marketing-reveal mx-auto max-w-4xl">
          <h1 className="text-[48px] font-bold leading-[1.05] tracking-[-0.03em] md:text-[74px]">Тарифы РЕСПОРТАЛА</h1>
          <p className="mx-auto mt-7 max-w-3xl text-xl leading-8 text-slate-600">
            Сейчас пользователь начинает с бесплатной версии. Платные подписки будут подключены после финальной интеграции биллинга.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-5 pb-20">
        <div className="grid gap-5 lg:grid-cols-4">
          {plans.map((plan) => (
            <div key={plan.name} className={`marketing-reveal relative flex min-h-[520px] flex-col rounded-[30px] p-7 shadow-[0_22px_76px_rgba(11,39,68,0.10)] ring-1 transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_96px_rgba(11,39,68,0.16)] ${plan.highlight ? "bg-[#0b2744] text-white ring-[#0b2744]" : "bg-white text-[#0b2744] ring-slate-200/70"}`}>
              {plan.highlight ? (
                <div className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                  <Sparkles size={13} /> чаще выбирают
                </div>
              ) : null}
              <div className={`mb-8 flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold ${plan.highlight ? "bg-white text-[#0b2744]" : "bg-blue-600 text-white"}`}>{plan.name.slice(0, 1)}</div>
              <h2 className="text-3xl font-bold">{plan.name}</h2>
              <div className={`mt-3 w-fit rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${plan.highlight ? "bg-white/10 text-blue-100" : "bg-blue-50 text-blue-700"}`}>{plan.limit}</div>
              <div className={`mt-6 text-2xl font-bold ${plan.highlight ? "text-blue-100" : "text-blue-700"}`}>{plan.price}</div>
              <p className={`mt-4 min-h-[104px] text-[15px] leading-7 ${plan.highlight ? "text-blue-100" : "text-slate-600"}`}>{plan.description}</p>
              <div className="mt-7 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 text-sm font-semibold leading-6">
                    <CheckCircle2 size={18} className={plan.highlight ? "mt-0.5 text-blue-300" : "mt-0.5 text-emerald-600"} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <Link to="/register" className={`mt-auto inline-flex w-full justify-center rounded-[18px] px-5 py-4 text-sm font-bold transition duration-300 hover:-translate-y-0.5 ${plan.highlight ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}>
                Начать
              </Link>
            </div>
          ))}
        </div>

        <div className="marketing-reveal mt-10 rounded-[34px] bg-[#c9e3ff] p-8 md:p-12">
          <h2 className="text-[34px] font-bold leading-tight md:text-[46px]">Почему пока без оплаты?</h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#173a5e]">
            Подключение платежного провайдера требует отдельной проверки и аккуратной реализации платежного сценария. Поэтому тарифная логика уже описана в продукте, но оплату лучше включать после готовности биллинга.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
