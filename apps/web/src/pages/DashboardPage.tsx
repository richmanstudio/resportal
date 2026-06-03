import { BriefcaseBusiness, CalendarDays, Check, Clock, FileText, FolderKanban, Gavel, Play, Scale, TrendingUp, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Panel } from "../components/Panel";
import { Badge, EmptyState, IconTile, InlineLoading, LoadingRows, PageHeader, formatDate, formatDateTime, isOverdue } from "../components/Premium";
import { apiFetch } from "../lib/api";
import { useWorkspace } from "../lib/workspace";

type LegalCase = { id: string; title: string; caseNumber?: string; courtName?: string; status: string; updatedAt: string; client?: { fullName: string } };
type Deadline = { id: string; title: string; deadlineAt: string; priority: string; status: string; case?: { title: string; caseNumber?: string } };
type Task = { id: string; title: string; dueAt?: string; priority: string; status: string; case?: { title: string; caseNumber?: string } };
type Event = { id: string; title: string; startAt: string; location?: string; case?: { title: string; caseNumber?: string } };
type Client = { id: string; fullName: string; type: string };
type OnboardingSummary = {
  demoDataCreated: boolean;
  completed: { client: boolean; case: boolean; deadline: boolean; task: boolean; document: boolean };
};

const metricCards = [
  { label: "Дела", tone: "blue" as const, icon: FolderKanban },
  { label: "Заседания", tone: "blue" as const, icon: Gavel },
  { label: "Сроки", tone: "orange" as const, icon: Clock },
  { label: "Задачи", tone: "rose" as const, icon: Check },
  { label: "Клиенты", tone: "violet" as const, icon: Users }
];

function isSameLocalDate(value: string | undefined, date: Date) {
  if (!value) return false;
  const target = new Date(value);
  return target.getFullYear() === date.getFullYear() && target.getMonth() === date.getMonth() && target.getDate() === date.getDate();
}

export function DashboardPage() {
  const { workspace } = useWorkspace();
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  async function load() {
    setIsLoading(true);
    try {
      const organizationId = workspace.organizationId;
      const [nextCases, nextDeadlines, nextTasks, nextEvents, nextClients, nextOnboarding] = await Promise.all([
        apiFetch<LegalCase[]>("/cases", { organizationId }),
        apiFetch<Deadline[]>("/deadlines", { organizationId }),
        apiFetch<Task[]>("/tasks", { organizationId }),
        apiFetch<Event[]>("/events", { organizationId }),
        apiFetch<Client[]>("/clients", { organizationId }),
        apiFetch<OnboardingSummary>("/onboarding/summary", { organizationId })
      ]);
      setCases(nextCases);
      setDeadlines(nextDeadlines);
      setTasks(nextTasks);
      setEvents(nextEvents);
      setClients(nextClients);
      setOnboarding(nextOnboarding);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [workspace.organizationId]);

  const today = new Date();
  const todayLabel = today.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  const openTasks = tasks.filter((item) => item.status !== "done" && item.status !== "cancelled");
  const activeDeadlines = deadlines.filter((item) => item.status === "active" || item.status === "overdue");
  const todayEvents = events.filter((item) => isSameLocalDate(item.startAt, today));
  const todayDeadlines = activeDeadlines.filter((item) => isSameLocalDate(item.deadlineAt, today));
  const todayTasks = openTasks.filter((item) => isSameLocalDate(item.dueAt, today));
  const todayItems = [...todayEvents.slice(0, 2), ...todayDeadlines.slice(0, 2), ...todayTasks.slice(0, 2)].slice(0, 5);
  const overdueCount = [...openTasks.map((item) => item.dueAt), ...activeDeadlines.map((item) => item.deadlineAt)].filter(isOverdue).length;
  const onboardingItems = [
    { label: "Добавить клиента", done: onboarding?.completed.client ?? clients.length > 0 },
    { label: "Создать дело", done: onboarding?.completed.case ?? cases.length > 0 },
    { label: "Поставить срок", done: onboarding?.completed.deadline ?? deadlines.length > 0 },
    { label: "Создать задачу", done: onboarding?.completed.task ?? tasks.length > 0 },
    { label: "Загрузить документ", done: onboarding?.completed.document ?? false }
  ];
  const onboardingDone = onboardingItems.filter((item) => item.done).length;
  const isDemoCreated = onboarding?.demoDataCreated ?? false;

  async function createDemoData() {
    setIsDemoLoading(true);
    try {
      await apiFetch("/onboarding/demo-data", {
        method: "POST",
        organizationId: workspace.organizationId,
        body: JSON.stringify({ includeDocuments: true })
      });
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Демо-данные уже добавлены");
    } finally {
      setIsDemoLoading(false);
    }
  }

  const metrics = [
    { value: cases.length, delta: `${cases.filter((item) => item.status === "active").length} в работе` },
    { value: events.length, delta: `${events.slice(0, 3).length} ближайших` },
    { value: activeDeadlines.length, delta: overdueCount ? `${overdueCount} просрочено` : "под контролем" },
    { value: openTasks.length, delta: `${tasks.filter((item) => item.status === "done").length} выполнено` },
    { value: clients.length, delta: "в базе" }
  ];

  const workload = useMemo(() => {
    const total = Math.max(1, cases.length + activeDeadlines.length + openTasks.length);
    return [
      { label: "Дела", value: cases.length, width: (cases.length / total) * 100, color: "bg-blue-600" },
      { label: "Сроки", value: activeDeadlines.length, width: (activeDeadlines.length / total) * 100, color: "bg-orange-500" },
      { label: "Задачи", value: openTasks.length, width: (openTasks.length / total) * 100, color: "bg-rose-500" }
    ];
  }, [activeDeadlines.length, cases.length, openTasks.length]);

  return (
    <div className="space-y-7">
      <PageHeader
        title={`Добрый день, ${workspace.user.fullName.split(" ")[0] ?? "юрист"}`}
        description={`Сегодня ${todayLabel}. Ниже — дела, сроки и действия, которые требуют внимания.`}
      />

      <section className="premium-panel overflow-hidden">
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              <Badge tone={onboardingDone === onboardingItems.length ? "green" : "blue"}>{onboardingDone}/{onboardingItems.length} шагов</Badge>
              <span className="text-sm font-semibold text-slate-500">Первый запуск</span>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-950">Запустите рабочее пространство за несколько минут</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Создайте базовые сущности вручную или заполните демо-данными, чтобы увидеть продукт в реальном сценарии.</p>
          </div>
          {isDemoCreated ? (
            <div className="rounded-[18px] bg-emerald-50 px-5 py-4 text-sm font-semibold leading-6 text-emerald-700">
              Демо-данные уже добавлены. Теперь попробуйте создать собственное дело, клиента, срок или документ.
            </div>
          ) : (
            <button className="premium-button-blue" onClick={() => void createDemoData()} disabled={isDemoLoading}>
              <Play size={18} />
              {isDemoLoading ? "Создаем демо..." : "Заполнить демо-данными"}
            </button>
          )}
        </div>
        <div className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-5">
          {onboardingItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${item.done ? "bg-emerald-600 text-white" : "bg-white text-slate-400 ring-1 ring-slate-200"}`}>
                <Check size={14} />
              </span>
              <span className="text-sm font-semibold text-slate-700">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((metric, index) => (
          <div key={metric.label} className="premium-panel p-5 transition duration-200 hover:-translate-y-1 hover:shadow-lift">
            <div className="flex items-start justify-between gap-4">
              <IconTile icon={metric.icon} tone={metric.tone} />
              <Badge tone={index === 2 && overdueCount ? "red" : metric.tone}>{metrics[index].delta}</Badge>
            </div>
            <div className="mt-6 text-sm font-semibold text-slate-500">{metric.label}</div>
            <div className="mt-1 text-[34px] font-semibold leading-none text-slate-950">{metrics[index].value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="overflow-hidden rounded-[22px] bg-slate-950 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
          <div className="grid gap-6 p-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <Scale size={24} />
              </div>
              <h2 className="mt-5 text-2xl font-semibold">Сегодня</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Операционный фокус дня: заседания, процессуальные сроки и задачи без лишнего шума.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <TodayStat label="заседания" value={todayEvents.length} />
                <TodayStat label="сроки" value={todayDeadlines.length} />
                <TodayStat label="задачи" value={todayTasks.length} />
              </div>
            </div>
            <div className="space-y-3">
              {todayItems.map((item) => (
                <div key={item.id} className="rounded-[18px] border border-white/10 bg-white/[0.06] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{"startAt" in item ? item.title : item.title}</div>
                      <div className="mt-1 text-xs text-slate-400">{"case" in item ? item.case?.caseNumber ?? item.case?.title ?? "Без дела" : "Без дела"}</div>
                    </div>
                    <span className="text-xs font-semibold text-blue-200">
                      {"startAt" in item ? formatDateTime(item.startAt) : formatDate("deadlineAt" in item ? item.deadlineAt : item.dueAt)}
                    </span>
                  </div>
                </div>
              ))}
              {!isLoading && todayItems.length === 0 ? (
                <div className="rounded-[18px] border border-white/10 bg-white/[0.06] p-5 text-sm text-slate-300">На сегодня нет срочных действий.</div>
              ) : null}
              {isLoading ? <InlineLoading label="Собираем повестку" /> : null}
            </div>
          </div>
        </section>

        <Panel title="Аналитика нагрузки" action={<TrendingUp size={18} />}>
          <div className="space-y-5 p-6">
            {workload.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">{item.label}</span>
                  <span className="font-semibold text-slate-400">{item.value}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.max(item.width, item.value ? 8 : 0)}%` }} />
                </div>
              </div>
            ))}
            <div className="rounded-[18px] bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              {overdueCount ? `Есть ${overdueCount} просроченных элемента. Лучше начать день с них.` : "Просрочек нет. Нагрузка выглядит управляемой."}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Ближайшие заседания" action={<Link to="/calendar">Календарь</Link>}>
          {isLoading ? <LoadingRows rows={3} columns={3} /> : events.length === 0 ? (
            <EmptyState title="Заседаний пока нет" description="Добавьте событие в календарь, чтобы видеть судебную повестку прямо на дашборде." icon={CalendarDays} tone="blue" />
          ) : (
            <div className="divide-y divide-slate-100">
              {events.slice(0, 5).map((event) => (
                <div key={event.id} className="grid gap-3 px-6 py-4 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                  <div className="rounded-2xl bg-blue-50 px-3 py-2 text-center text-xs font-bold text-blue-700">{formatDateTime(event.startAt)}</div>
                  <div>
                    <div className="font-semibold text-slate-950">{event.title}</div>
                    <div className="mt-1 text-sm text-slate-500">{event.case?.caseNumber ?? event.case?.title ?? "Без дела"}</div>
                  </div>
                  <div className="text-sm font-medium text-slate-500">{event.location ?? "Место не указано"}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Активные задачи" action={<Link to="/tasks">Все задачи</Link>}>
          {isLoading ? <LoadingRows rows={3} columns={3} /> : openTasks.length === 0 ? (
            <EmptyState title="Задач нет" description="Когда появятся поручения по делам, они будут собраны здесь с приоритетами и сроками." icon={Check} tone="rose" />
          ) : (
            <div className="divide-y divide-slate-100">
              {openTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="grid gap-3 px-6 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div>
                    <div className="font-semibold text-slate-950">{task.title}</div>
                    <div className="mt-1 text-sm text-slate-500">{task.case?.caseNumber ?? task.case?.title ?? "Без дела"}</div>
                  </div>
                  <Badge tone={task.priority === "urgent" || task.priority === "high" ? "rose" : "orange"}>{task.priority}</Badge>
                  <span className={`text-sm font-semibold ${isOverdue(task.dueAt) ? "text-red-600" : "text-slate-500"}`}>{formatDate(task.dueAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.8fr]">
        <Panel title="Последние дела" action={<Link to="/cases">Реестр</Link>}>
          {isLoading ? <LoadingRows rows={5} columns={4} /> : cases.length === 0 ? (
            <EmptyState title="Реестр дел пуст" description="Создайте первое дело, чтобы связать клиентов, документы, задачи и судебные события." actionLabel="Создать первое дело" onAction={() => (window.location.href = "/cases")} icon={BriefcaseBusiness} tone="blue" />
          ) : (
            <div className="overflow-x-auto">
              <table className="premium-table min-w-[760px]">
                <thead>
                  <tr>
                    <th>№ дела</th>
                    <th>Наименование</th>
                    <th>Клиент</th>
                    <th>Статус</th>
                    <th>Обновлено</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.slice(0, 6).map((item) => (
                    <tr key={item.id} className="premium-row">
                      <td className="font-semibold text-blue-700"><Link to={`/cases/${item.id}`}>{item.caseNumber ?? "б/н"}</Link></td>
                      <td className="font-semibold text-slate-950"><Link to={`/cases/${item.id}`}>{item.title}</Link></td>
                      <td className="text-slate-600">{item.client?.fullName ?? "Клиент не указан"}</td>
                      <td><Badge tone={item.status === "finished" ? "green" : "blue"}>{item.status}</Badge></td>
                      <td className="text-slate-500">{formatDate(item.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Клиенты" action={<Link to="/clients">База</Link>}>
          {isLoading ? <LoadingRows rows={4} columns={2} /> : clients.length === 0 ? (
            <EmptyState title="Клиентов пока нет" description="Добавьте доверителей и контрагентов, чтобы видеть их в делах и документах." icon={Users} tone="violet" />
          ) : (
            <div className="divide-y divide-slate-100">
              {clients.slice(0, 6).map((client) => (
                <div key={client.id} className="flex items-center justify-between gap-3 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-sm font-bold text-violet-700 ring-1 ring-violet-100">
                      {client.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-950">{client.fullName}</div>
                      <div className="text-xs font-medium text-slate-500">{client.type}</div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="px-6 py-4">
                <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                  <FileText size={17} />
                  Документы и дела будут привязываться к клиентской карточке.
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function TodayStat(props: { label: string; value: number }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.06] p-3">
      <div className="text-xl font-semibold">{props.value}</div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{props.label}</div>
    </div>
  );
}
