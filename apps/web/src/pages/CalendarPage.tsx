import { CalendarDays, MapPin, Plus } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Panel } from "../components/Panel";
import { Badge, EmptyState, LoadingRows, PageHeader, cx, formatDateTime } from "../components/Premium";
import { apiFetch } from "../lib/api";
import { useWorkspace } from "../lib/workspace";

type LegalCase = { id: string; title: string; caseNumber?: string };
type EventType = "hearing" | "meeting" | "call" | "other" | "deadline" | "document_received" | "document_sent" | "payment";
type EventItem = { id: string; title: string; startAt: string; location?: string; type: EventType; case?: LegalCase };

const eventTypeLabels: Record<EventType, string> = {
  hearing: "Заседание",
  meeting: "Встреча",
  call: "Звонок",
  other: "Другое",
  deadline: "Срок",
  document_received: "Документ получен",
  document_sent: "Документ отправлен",
  payment: "Оплата"
};

const eventTypeStyles: Record<EventType, string> = {
  hearing: "border-blue-200 bg-blue-50 text-blue-800",
  meeting: "border-violet-200 bg-violet-50 text-violet-800",
  call: "border-emerald-200 bg-emerald-50 text-emerald-800",
  other: "border-slate-200 bg-slate-50 text-slate-700",
  deadline: "border-orange-200 bg-orange-50 text-orange-800",
  document_received: "border-cyan-200 bg-cyan-50 text-cyan-800",
  document_sent: "border-indigo-200 bg-indigo-50 text-indigo-800",
  payment: "border-emerald-200 bg-emerald-50 text-emerald-800"
};

export function CalendarPage() {
  const { workspace } = useWorkspace();
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      const organizationId = workspace.organizationId;
      const [nextCases, nextEvents] = await Promise.all([
        apiFetch<LegalCase[]>("/cases", { organizationId }),
        apiFetch<EventItem[]>("/events", { organizationId })
      ]);
      setCases(nextCases);
      setEvents(nextEvents);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [workspace.organizationId]);

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiFetch("/events", {
      method: "POST",
      organizationId: workspace.organizationId,
      body: JSON.stringify({
        title: form.get("title"),
        caseId: form.get("caseId"),
        type: form.get("type"),
        startAt: form.get("startAt"),
        location: form.get("location") || undefined
      })
    });
    event.currentTarget.reset();
    await load();
  }

  const groupedEvents = useMemo(() => {
    return events.reduce<Record<string, EventItem[]>>((acc, event) => {
      const key = new Date(event.startAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
      acc[key] = [...(acc[key] ?? []), event];
      return acc;
    }, {});
  }, [events]);

  return (
    <div className="space-y-7">
      <PageHeader
        title="Календарь"
        description="Заседания, встречи, звонки и контрольные события по делам в одном расписании."
        action={<Badge tone="blue">{events.length} событий</Badge>}
      />

      <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
        <Panel title="Новое событие" description="Создайте запись календаря и привяжите ее к делу.">
          <form className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2" onSubmit={createEvent}>
            <input required name="title" placeholder="Название" className="premium-input md:col-span-2 xl:col-span-1 2xl:col-span-2" />
            <select required name="caseId" className="premium-select">
              <option value="">Дело</option>
              {cases.map((item) => <option key={item.id} value={item.id}>{item.caseNumber ?? item.title}</option>)}
            </select>
            <select name="type" className="premium-select">
              <option value="hearing">Заседание</option>
              <option value="meeting">Встреча</option>
              <option value="call">Звонок</option>
              <option value="other">Другое</option>
            </select>
            <input required name="startAt" type="datetime-local" className="premium-input" />
            <input name="location" placeholder="Место" className="premium-input" />
            <button className="premium-button-blue md:col-span-2 xl:col-span-1 2xl:col-span-2">
              <Plus size={18} /> Создать событие
            </button>
          </form>
        </Panel>

        <Panel title="Повестка" action={isLoading ? "Загрузка..." : `${events.length} событий`}>
          {isLoading ? <LoadingRows rows={5} columns={3} /> : events.length === 0 ? (
            <EmptyState title="Календарь пуст" description="Добавьте первое заседание, встречу или звонок, чтобы видеть рабочий день по датам." icon={CalendarDays} tone="blue" />
          ) : (
            <div className="space-y-5 p-5">
              {Object.entries(groupedEvents).map(([date, items]) => (
                <div key={date} className="grid gap-3 lg:grid-cols-[132px_1fr]">
                  <div className="pt-3 text-sm font-bold text-slate-500">{date}</div>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className={cx("rounded-[20px] border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lift", eventTypeStyles[item.type])}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="text-sm font-bold uppercase tracking-[0.12em] opacity-70">{formatDateTime(item.startAt)}</div>
                            <div className="mt-2 text-base font-semibold">{item.title}</div>
                            <div className="mt-1 text-sm opacity-75">{item.case?.caseNumber ?? item.case?.title ?? "Без дела"}</div>
                          </div>
                          <Badge tone={item.type === "hearing" ? "blue" : item.type === "meeting" ? "violet" : item.type === "call" ? "green" : "slate"}>
                            {eventTypeLabels[item.type]}
                          </Badge>
                        </div>
                        {item.location ? (
                          <div className="mt-4 flex items-center gap-2 text-sm font-semibold opacity-75">
                            <MapPin size={16} />
                            {item.location}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
