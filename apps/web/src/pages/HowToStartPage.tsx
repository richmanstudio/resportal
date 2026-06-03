import { ArrowRight, CheckCircle2, FileText, Scale, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { MarketingShell } from "../components/MarketingShell";

const steps = [
  {
    title: "Создайте аккаунт",
    text: "После регистрации у пользователя появляется бесплатная версия без выбранного платного тарифа.",
    icon: UserRound
  },
  {
    title: "Заполните профиль",
    text: "Добавьте ФИО и аватар, чтобы рабочее пространство выглядело как настоящий личный кабинет.",
    icon: CheckCircle2
  },
  {
    title: "Создайте первую базу",
    text: "Добавьте клиента, дело, срок, задачу и документ вручную или один раз заполните демо-данными.",
    icon: FileText
  },
  {
    title: "Работайте с фокусом дня",
    text: "Дашборд покажет сегодняшние заседания, сроки, активные задачи и последние изменения.",
    icon: Scale
  }
];

export function HowToStartPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-[1220px] px-5 pb-16 pt-20">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div className="marketing-reveal">
            <h1 className="text-[48px] font-bold leading-[1.05] tracking-[-0.03em] md:text-[72px]">
              Как начать работу в РЕСПОРТАЛЕ
            </h1>
            <p className="mt-7 max-w-2xl text-xl leading-8 text-slate-600">
              Сервис можно освоить за один рабочий день: сначала профиль и базовые сущности, затем ежедневный контроль дел, сроков и задач.
            </p>
          </div>
          <div className="marketing-reveal marketing-delay-1 rounded-[34px] bg-[#c9e3ff] p-7 shadow-[0_26px_90px_rgba(11,39,68,0.10)]">
            <div className="rounded-[28px] bg-white/86 p-6">
              <div className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Первый день</div>
              <div className="mt-4 text-3xl font-bold">От пустого аккаунта до рабочего дашборда</div>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {["Профиль", "Клиент", "Дело", "Срок"].map((item, index) => (
                  <div key={item} className="rounded-2xl bg-blue-50 p-4">
                    <div className="text-2xl font-bold text-blue-700">{index + 1}</div>
                    <div className="mt-2 text-sm font-semibold">{item}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-5 pb-20">
        <div className="grid gap-5 md:grid-cols-2">
          {steps.map((step, index) => (
            <div key={step.title} className="marketing-reveal rounded-[30px] bg-white/84 p-7 shadow-[0_20px_70px_rgba(11,39,68,0.07)]">
              <div className="flex items-start gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-blue-600 text-white shadow-[0_14px_34px_rgba(37,99,235,0.22)]">
                  <step.icon size={24} />
                </div>
                <div>
                  <div className="text-sm font-bold text-blue-700">Шаг {index + 1}</div>
                  <h2 className="mt-2 text-2xl font-bold">{step.title}</h2>
                  <p className="mt-3 text-base leading-7 text-slate-600">{step.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="marketing-reveal mt-10 rounded-[34px] bg-[#0b2744] p-8 text-white md:p-12">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-[34px] font-bold leading-tight md:text-[46px]">Готовы проверить рабочий сценарий?</h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-blue-100">Начните бесплатно, а платный тариф подключите позже, когда биллинг будет готов.</p>
            </div>
            <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-blue-600 px-8 py-5 text-lg font-semibold text-white transition duration-300 hover:-translate-y-1">
              Создать аккаунт <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
