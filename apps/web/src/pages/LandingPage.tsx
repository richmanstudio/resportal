import { ArrowRight, Bell, BriefcaseBusiness, CheckCircle2, Clock, FileText, Info, Scale, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MarketingShell } from "../components/MarketingShell";

const solutionCards = [
  { title: "Реестр дел", text: "Номера, суды, клиенты, статусы и ответственные в одной юридической базе.", icon: BriefcaseBusiness },
  { title: "Процессуальные сроки", text: "Сроки заметнее обычных задач: просрочка, приоритет и ближайшие действия.", icon: Clock },
  { title: "Документы", text: "Архив файлов с типами, статусами, привязкой к делу и датами создания.", icon: FileText },
  { title: "Клиенты", text: "Физлица, юрлица, контакты, представители и связь со всеми делами.", icon: Users },
  { title: "Задачи", text: "Поручения, дедлайны, приоритеты и контроль исполнения по каждому делу.", icon: CheckCircle2 },
  { title: "Команда", text: "Роли, рабочие пространства и управляемый доступ для юридической фирмы.", icon: ShieldCheck }
];

export function LandingPage() {
  return (
    <MarketingShell>
      <section className="relative mx-auto max-w-[1220px] px-5 pb-16 pt-16 md:pb-24 md:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="marketing-reveal">
            <h1 className="max-w-4xl text-[48px] font-bold leading-[1.05] tracking-[-0.03em] text-[#0b2744] md:text-[72px] lg:text-[78px]">
              <span className="block text-blue-700">РЕСПОРТАЛ</span>
              <span className="mt-3 block">юридическая операционная система</span>
            </h1>
            <p className="mt-7 max-w-2xl text-xl leading-8 text-slate-600">
              Дела, клиенты, процессуальные сроки, задачи и документы в одном спокойном рабочем пространстве для юриста и команды.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#0b2744] px-8 py-5 text-lg font-semibold text-white shadow-[0_18px_42px_rgba(11,39,68,0.25)] transition duration-300 hover:-translate-y-1">
                Попробовать бесплатно <ArrowRight size={20} />
              </Link>
              <Link to="/how-to-start" className="inline-flex items-center justify-center rounded-[18px] bg-white/78 px-8 py-5 text-lg font-semibold text-[#0b2744] shadow-[0_14px_36px_rgba(11,39,68,0.08)] transition duration-300 hover:-translate-y-1 hover:bg-white">
                Как начать
              </Link>
            </div>
          </div>

          <div className="marketing-reveal marketing-delay-1 relative min-h-[520px]">
            <div className="absolute left-0 top-7 h-[420px] w-[86%] rounded-[34px] bg-[#c9e3ff]" />
            <div className="absolute right-0 top-0 h-[470px] w-[82%] rounded-[34px] border border-white/70 bg-white/72 p-5 shadow-[0_32px_100px_rgba(11,39,68,0.14)] backdrop-blur-xl">
              <div className="rounded-[28px] bg-[#0b2744] p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-blue-100">Фокус дня</div>
                    <div className="mt-2 text-2xl font-bold">Сегодня</div>
                  </div>
                  <Scale size={34} />
                </div>
                <div className="mt-8 grid grid-cols-3 gap-3">
                  <HeroMetric value="2" label="дела" />
                  <HeroMetric value="1" label="срок" />
                  <HeroMetric value="4" label="задачи" />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <HeroRow title="Подать уточнённый расчёт" meta="сегодня, 18:00" tone="urgent" />
                <HeroRow title="Заседание по делу А40-1245" meta="завтра, 10:30" tone="blue" />
                <HeroRow title="Проверить проект ходатайства" meta="в работе" tone="green" />
              </div>
            </div>
            <div className="marketing-float absolute bottom-5 left-8 rounded-[24px] bg-white px-5 py-4 shadow-[0_22px_70px_rgba(11,39,68,0.14)]">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white"><Bell size={20} /></span>
                <div>
                  <div className="text-sm font-bold">Сроки под контролем</div>
                  <div className="text-xs font-semibold text-slate-500">без шума и ручных таблиц</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-5 py-10" id="audience">
        <div className="marketing-reveal rounded-[34px] bg-[#c9e3ff] p-6 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="text-[38px] font-bold leading-[1.1] tracking-[-0.03em] md:text-[56px]">
                Подходит частным юристам, командам и фирмам
              </h2>
              <p className="mt-6 text-lg leading-8 text-[#173a5e]">
                РЕСПОРТАЛ не пытается быть “всем для всех”. Он собирает ежедневные юридические действия вокруг дела, срока, клиента и документа.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["Solo", "Личная практика и контроль собственных дел"],
                ["Team", "Командная работа, роли и распределение задач"],
                ["Firm", "Единая операционная база юридической фирмы"]
              ].map(([title, text]) => (
                <div key={title} className="rounded-[26px] border border-white bg-white p-7 shadow-[0_18px_54px_rgba(11,39,68,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_72px_rgba(11,39,68,0.15)]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white">{title.slice(0, 1)}</div>
                  <div className="mt-8 text-2xl font-bold">{title}</div>
                  <p className="mt-4 text-[15px] leading-7 text-[#173a5e]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-5 pt-24">
        <div className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="marketing-reveal rounded-[30px] bg-white/82 p-8 shadow-[0_24px_80px_rgba(11,39,68,0.08)]">
            <div className="rounded-[24px] bg-blue-600 p-7 text-white">
              <div className="rounded-[22px] bg-white p-5 text-[#0b2744] shadow-[0_20px_55px_rgba(11,39,68,0.16)]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500">Операционный день</span>
                  <Sparkles size={18} className="text-blue-600" />
                </div>
                <div className="mt-5 space-y-3">
                  <HeroRow title="Просроченные сроки" meta="0" tone="green" />
                  <HeroRow title="Новые документы" meta="3" tone="blue" />
                  <HeroRow title="Задачи без ответственного" meta="1" tone="urgent" />
                </div>
              </div>
            </div>
          </div>
          <div className="marketing-reveal marketing-delay-1">
            <h2 className="text-[40px] font-bold leading-[1.08] tracking-[-0.03em] md:text-[58px]">Не CRM ради CRM, а рабочий ритм юриста</h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Интерфейс устроен вокруг того, что юрист делает каждый день: проверяет сроки, ведёт дела, общается с клиентами, готовит документы и закрывает задачи.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-5 pt-28">
        <h2 className="marketing-reveal text-[40px] font-bold leading-[1.1] tracking-[-0.03em] md:text-[58px]">Разделы продукта</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {solutionCards.map((card, index) => (
            <div key={card.title} className={`marketing-reveal rounded-[28px] p-8 shadow-[0_20px_70px_rgba(11,39,68,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_86px_rgba(11,39,68,0.13)] ${index === 0 ? "bg-[#0b2744] text-white" : "bg-white text-[#0b2744]"}`}>
              <card.icon size={32} className={index === 0 ? "text-blue-300" : "text-blue-600"} />
              <h3 className="mt-10 text-2xl font-bold leading-tight">{card.title}</h3>
              <p className={`mt-5 text-lg leading-7 ${index === 0 ? "text-blue-100" : "text-slate-600"}`}>{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-5 pt-28">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="marketing-reveal overflow-hidden rounded-[34px] border border-slate-200 bg-white p-4 shadow-[0_26px_90px_rgba(11,39,68,0.12)]">
            <div className="rounded-[26px] bg-slate-950 p-5 text-white">
              <div className="grid gap-4 md:grid-cols-3">
                <HeroMetric value="12" label="дел" />
                <HeroMetric value="3" label="срока" />
                <HeroMetric value="24" label="документа" />
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
                <div className="rounded-[22px] bg-white p-5 text-[#0b2744]">
                  <div className="text-sm font-bold text-slate-500">Карточка дела</div>
                  <div className="mt-4 space-y-3">
                    <HeroRow title="А40-1245/2026" meta="в работе" tone="blue" />
                    <HeroRow title="Ходатайство к заседанию" meta="готов" tone="green" />
                    <HeroRow title="Срок подачи позиции" meta="завтра" tone="urgent" />
                  </div>
                </div>
                <div className="rounded-[22px] bg-white/10 p-5 ring-1 ring-white/10">
                  <div className="text-sm font-bold text-blue-100">Безопасность</div>
                  <div className="mt-4 space-y-3 text-sm font-semibold text-slate-200">
                    <div>Роли и доступы</div>
                    <div>Audit log действий</div>
                    <div>Лимиты хранения</div>
                    <div>Email-подтверждение</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="marketing-reveal marketing-delay-1">
            <h2 className="text-[40px] font-bold leading-[1.08] tracking-[-0.03em] md:text-[58px]">Показываем продукт, а не обещания</h2>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Первый экран внутри сервиса сразу ведет к рабочему дню: дела, сроки, документы, задачи и ближайшие события. Это важно для покупки: юрист должен увидеть не “систему”, а порядок в практике.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-5 pt-28">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["Безопасность", "JWT-сессии, роли, audit log, лимиты загрузки и контролируемые типы документов."],
            ["Оферта и политика", "Правовые документы доступны в публичном разделе и должны быть финально утверждены перед масштабной продажей."],
            ["Поддержка", "Канал help@resportal.ru указан в интерфейсе и публичных страницах, чтобы пользователь понимал, куда обращаться."]
          ].map(([title, text]) => (
            <div key={title} className="marketing-reveal rounded-[28px] bg-white p-8 shadow-[0_20px_70px_rgba(11,39,68,0.08)]">
              <ShieldCheck size={30} className="text-blue-600" />
              <h3 className="mt-8 text-2xl font-bold text-[#0b2744]">{title}</h3>
              <p className="mt-4 text-base leading-7 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-5 pt-28">
        <div className="marketing-reveal rounded-[34px] bg-white p-6 shadow-[0_24px_90px_rgba(11,39,68,0.09)] ring-1 ring-slate-200/70 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Коммерческий смысл</div>
              <h2 className="mt-4 text-[38px] font-bold leading-[1.08] tracking-[-0.03em] text-[#0b2744] md:text-[54px]">
                Не терять дела, сроки и документы в таблицах, чатах и папках
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                РЕСПОРТАЛ продает не “CRM”, а спокойный контроль юридической практики: что происходит сегодня, где ближайший срок и в каком деле лежит нужный документ.
              </p>
            </div>
            <div className="overflow-hidden rounded-[26px] ring-1 ring-slate-200">
              <div className="grid bg-[#0b2744] px-5 py-4 text-sm font-bold text-white md:grid-cols-3">
                <div>Инструмент</div>
                <div>Проблема</div>
                <div>РЕСПОРТАЛ</div>
              </div>
              {[
                ["Excel", "не напоминает о сроках и не хранит документы в контексте", "дело, срок, документ и клиент связаны"],
                ["Notion", "нужно самому строить модель, права и шаблоны", "юридическая структура готова сразу"],
                ["Обычная CRM", "заточена под продажи, а не судебную работу", "центр продукта — дело и процессуальный срок"]
              ].map(([tool, problem, solution]) => (
                <div key={tool} className="grid gap-3 border-t border-slate-100 px-5 py-4 text-sm leading-6 md:grid-cols-3">
                  <div className="font-bold text-[#0b2744]">{tool}</div>
                  <div className="text-slate-600">{problem}</div>
                  <div className="font-semibold text-blue-700">{solution}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-5 py-24">
        <div className="marketing-reveal rounded-[34px] bg-[#0b2744] px-6 py-14 text-center text-white md:px-16">
          <h2 className="text-[36px] font-bold tracking-[-0.02em] md:text-[50px]">Начните с бесплатной версии</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-blue-100">
            Создайте первые дела, проверьте контроль сроков и оплатите тариф через YooKassa, когда бесплатных лимитов станет мало.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/register" className="inline-flex rounded-[18px] bg-blue-600 px-10 py-5 text-lg font-semibold text-white shadow-[0_18px_42px_rgba(37,99,235,0.28)] transition duration-300 hover:-translate-y-1">Зарегистрироваться</Link>
            <Link to="/pricing" className="inline-flex rounded-[18px] bg-white/10 px-10 py-5 text-lg font-semibold text-white ring-1 ring-white/20 transition duration-300 hover:-translate-y-1 hover:bg-white/14">Посмотреть тарифы</Link>
          </div>
        </div>
      </section>
      <PrivacyNotice />
    </MarketingShell>
  );
}

function PrivacyNotice() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem("resportal_privacy_notice_seen") === "true") {
      return;
    }

    const timer = window.setTimeout(() => setIsVisible(true), 650);
    return () => window.clearTimeout(timer);
  }, []);

  function acceptNotice() {
    window.localStorage.setItem("resportal_privacy_notice_seen", "true");
    setIsVisible(false);
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 z-[80] mx-auto max-w-[520px] rounded-[10px] bg-[#657993] p-4 text-white shadow-[0_22px_70px_rgba(11,39,68,0.26)] ring-1 ring-white/10 transition duration-500 sm:left-6 sm:right-auto ${isVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-5 opacity-0"}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/18">
          <Info size={14} />
        </div>
        <div className="min-w-0 flex-1 text-xs font-semibold leading-5">
          Мы используем cookies и технические данные для работы сайта и улучшения сервиса. Подробнее — в{" "}
          <Link to="/company/privacy" className="underline decoration-white/60 underline-offset-2 hover:decoration-white">
            правовых документах
          </Link>
          . Также сайт использует Яндекс.Метрику для сбора статистики посещений и улучшения интерфейса.
        </div>
        <button
          className="shrink-0 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-[#657993] shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50"
          onClick={acceptNotice}
          type="button"
        >
          Ясно
        </button>
      </div>
    </div>
  );
}

function HeroMetric(props: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 text-center ring-1 ring-white/10">
      <div className="text-2xl font-bold">{props.value}</div>
      <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-100">{props.label}</div>
    </div>
  );
}

function HeroRow(props: { title: string; meta: string; tone: "urgent" | "blue" | "green" }) {
  const toneClass = props.tone === "urgent" ? "bg-rose-50 text-rose-700" : props.tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700";

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="font-semibold">{props.title}</span>
      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${toneClass}`}>{props.meta}</span>
    </div>
  );
}
