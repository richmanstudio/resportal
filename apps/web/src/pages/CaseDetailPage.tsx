import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Archive, ArrowLeft, CalendarDays, CheckCircle2, Clock, Download, Edit3, FileText, Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";
import { casePartyCreateSchema, legalCaseUpdateSchema } from "@resportal/shared";
import { Panel } from "../components/Panel";
import { Badge, IconTile, isOverdue } from "../components/Premium";
import { Toast } from "../components/Toast";
import { apiFetch, downloadDocument } from "../lib/api";
import { useWorkspace } from "../lib/workspace";

type CaseStatus = "draft" | "active" | "suspended" | "finished" | "archived";
type CaseSide = "plaintiff" | "defendant" | "third_party" | "applicant" | "interested_party";
type PartyType = "plaintiff" | "defendant" | "third_party" | "court" | "other";
type TabId = "overview" | "parties" | "documents" | "deadlines" | "tasks" | "events" | "activity";
type CaseFormInput = z.input<typeof legalCaseUpdateSchema>;
type PartyFormInput = z.input<typeof casePartyCreateSchema>;

type Client = { id: string; fullName: string };
type Party = {
  id: string;
  name: string;
  type: PartyType;
  inn?: string;
  ogrn?: string;
  address?: string;
  representative?: string;
  phone?: string;
  email?: string;
  notes?: string;
};
type DocumentItem = { id: string; title: string; originalFileName: string; size: number; createdAt: string };
type Deadline = { id: string; title: string; deadlineAt: string; priority: string; status: string };
type Task = { id: string; title: string; priority: string; status: string; dueAt?: string };
type EventItem = { id: string; title: string; type: string; startAt: string; location?: string };
type AuditLog = { id: string; action: string; entityType: string; createdAt: string; user?: { fullName: string; email: string } };

type LegalCaseDetail = {
  id: string;
  clientId: string;
  title: string;
  caseNumber?: string;
  courtName?: string;
  judgeName?: string;
  category?: string;
  status: CaseStatus;
  side: CaseSide;
  claimAmount?: string | number | null;
  description?: string;
  result?: string;
  updatedAt: string;
  client: Client;
  parties: Party[];
  documents: DocumentItem[];
  deadlines: Deadline[];
  tasks: Task[];
  events: EventItem[];
};

const statusLabels: Record<CaseStatus, string> = {
  draft: "Черновик",
  active: "В работе",
  suspended: "Приостановлено",
  finished: "Завершено",
  archived: "Архив"
};

const sideLabels: Record<CaseSide, string> = {
  plaintiff: "Истец",
  defendant: "Ответчик",
  third_party: "Третье лицо",
  applicant: "Заявитель",
  interested_party: "Заинтересованное лицо"
};

const partyTypeLabels: Record<PartyType, string> = {
  plaintiff: "Истец",
  defendant: "Ответчик",
  third_party: "Третье лицо",
  court: "Суд",
  other: "Другое"
};

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Обзор" },
  { id: "parties", label: "Стороны" },
  { id: "documents", label: "Документы" },
  { id: "deadlines", label: "Сроки" },
  { id: "tasks", label: "Задачи" },
  { id: "events", label: "События" },
  { id: "activity", label: "Активность" }
];

const emptyValues: CaseFormInput = {
  title: "",
  clientId: "",
  caseNumber: "",
  courtName: "",
  judgeName: "",
  category: "",
  status: "active",
  side: "plaintiff",
  claimAmount: undefined,
  description: "",
  result: ""
};

const emptyPartyValues: PartyFormInput = {
  type: "other",
  name: "",
  inn: "",
  ogrn: "",
  address: "",
  representative: "",
  phone: "",
  email: "",
  notes: ""
};

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString("ru-RU") : "Без даты";
}

function formatDateTime(value?: string) {
  return value ? new Date(value).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Без даты";
}

function daysUntil(value?: string) {
  if (!value) return null;
  const target = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function buildTimeline(legalCase: LegalCaseDetail) {
  return [
    ...legalCase.events.map((event) => ({ id: `event-${event.id}`, date: event.startAt, title: event.title, meta: event.location ?? event.type, tone: "blue" as const, icon: CalendarDays })),
    ...legalCase.deadlines.map((deadline) => ({ id: `deadline-${deadline.id}`, date: deadline.deadlineAt, title: deadline.title, meta: `${deadline.priority} · ${deadline.status}`, tone: isOverdue(deadline.deadlineAt) && deadline.status !== "completed" ? "red" as const : "orange" as const, icon: Clock })),
    ...legalCase.tasks.filter((task) => task.dueAt).map((task) => ({ id: `task-${task.id}`, date: task.dueAt!, title: task.title, meta: `${task.priority} · ${task.status}`, tone: isOverdue(task.dueAt) && task.status !== "done" ? "red" as const : "rose" as const, icon: CheckCircle2 })),
    ...legalCase.documents.map((document) => ({ id: `document-${document.id}`, date: document.createdAt, title: document.title, meta: document.originalFileName, tone: "slate" as const, icon: FileText }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function normalizeValues(values: CaseFormInput) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, typeof value === "string" && value.trim() === "" ? undefined : value])
  );
}

function normalizeOptionalStrings(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, typeof value === "string" && value.trim() === "" ? undefined : value])
  );
}

export function CaseDetailPage() {
  const { id } = useParams();
  const { workspace } = useWorkspace();
  const [legalCase, setLegalCase] = useState<LegalCaseDetail | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<CaseFormInput>({
    resolver: zodResolver(legalCaseUpdateSchema),
    defaultValues: emptyValues
  });
  const partyForm = useForm<PartyFormInput>({
    resolver: zodResolver(casePartyCreateSchema),
    defaultValues: emptyPartyValues
  });

  const metrics = useMemo(() => {
    if (!legalCase) return [];
    return [
      { label: "Стороны", value: legalCase.parties.length },
      { label: "Документы", value: legalCase.documents.length },
      { label: "Сроки", value: legalCase.deadlines.length },
      { label: "Задачи", value: legalCase.tasks.length }
    ];
  }, [legalCase]);

  const caseIntelligence = useMemo(() => {
    if (!legalCase) return null;
    const openDeadlines = legalCase.deadlines.filter((item) => item.status !== "completed" && item.status !== "cancelled");
    const openTasks = legalCase.tasks.filter((item) => item.status !== "done" && item.status !== "cancelled");
    const overdueDeadlines = openDeadlines.filter((item) => isOverdue(item.deadlineAt));
    const overdueTasks = openTasks.filter((item) => isOverdue(item.dueAt));
    const nextHearing = legalCase.events
      .filter((item) => new Date(item.startAt).getTime() >= Date.now())
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];
    const nextDeadline = openDeadlines.sort((a, b) => new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime())[0];
    const timeline = buildTimeline(legalCase);
    const riskLevel = overdueDeadlines.length || overdueTasks.length ? "critical" : nextDeadline && (daysUntil(nextDeadline.deadlineAt) ?? 99) <= 3 ? "attention" : "calm";
    const nextAction = overdueDeadlines[0]
      ? `Закрыть просроченный срок: ${overdueDeadlines[0].title}`
      : overdueTasks[0]
        ? `Закрыть просроченную задачу: ${overdueTasks[0].title}`
        : nextDeadline
          ? `Проверить ближайший срок: ${nextDeadline.title}`
          : openTasks[0]
            ? `Продвинуть задачу: ${openTasks[0].title}`
            : "Добавить следующий процессуальный шаг";

    return { openDeadlines, openTasks, overdueDeadlines, overdueTasks, nextHearing, nextDeadline, timeline, riskLevel, nextAction };
  }, [legalCase]);

  function resetForm(nextCase: LegalCaseDetail) {
    form.reset({
      title: nextCase.title,
      clientId: nextCase.clientId,
      caseNumber: nextCase.caseNumber ?? "",
      courtName: nextCase.courtName ?? "",
      judgeName: nextCase.judgeName ?? "",
      category: nextCase.category ?? "",
      status: nextCase.status,
      side: nextCase.side,
      claimAmount: nextCase.claimAmount === null || nextCase.claimAmount === undefined ? undefined : Number(nextCase.claimAmount),
      description: nextCase.description ?? "",
      result: nextCase.result ?? ""
    });
  }

  async function load() {
    if (!id) return;
    setIsLoading(true);
    try {
      const organizationId = workspace.organizationId;
      const [nextCase, nextClients, nextAuditLogs] = await Promise.all([
        apiFetch<LegalCaseDetail>(`/cases/${id}`, { organizationId }),
        apiFetch<Client[]>("/clients", { organizationId }),
        apiFetch<AuditLog[]>(`/audit-logs?entityType=LegalCase&entityId=${id}&limit=20`, { organizationId }).catch(() => [])
      ]);
      setLegalCase(nextCase);
      setClients(nextClients);
      setAuditLogs(nextAuditLogs);
      resetForm(nextCase);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить дело");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id, workspace.organizationId]);

  async function saveOverview(values: CaseFormInput) {
    if (!id) return;
    setError("");
    try {
      const updated = await apiFetch<LegalCaseDetail>(`/cases/${id}`, {
        method: "PATCH",
        organizationId: workspace.organizationId,
        body: JSON.stringify(normalizeValues(values))
      });
      setLegalCase((current) => (current ? { ...current, ...updated } : updated));
      resetForm({ ...(legalCase ?? updated), ...updated });
      setMessage("Дело обновлено");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить дело");
    }
  }

  async function archiveCase() {
    if (!id || !window.confirm(`Архивировать дело "${legalCase?.title}"?`)) return;
    setError("");
    try {
      await apiFetch(`/cases/${id}`, {
        method: "DELETE",
        organizationId: workspace.organizationId
      });
      setLegalCase((current) => (current ? { ...current, status: "archived" } : current));
      setMessage("Дело перенесено в архив");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось архивировать дело");
    }
  }

  function startCreateParty() {
    setEditingParty(null);
    partyForm.reset(emptyPartyValues);
  }

  function startEditParty(party: Party) {
    setEditingParty(party);
    partyForm.reset({
      type: party.type,
      name: party.name,
      inn: party.inn ?? "",
      ogrn: party.ogrn ?? "",
      address: party.address ?? "",
      representative: party.representative ?? "",
      phone: party.phone ?? "",
      email: party.email ?? "",
      notes: party.notes ?? ""
    });
  }

  async function saveParty(values: PartyFormInput) {
    if (!id) return;
    setError("");
    try {
      const path = editingParty ? `/case-parties/${editingParty.id}` : `/case-parties/case/${id}`;
      const method = editingParty ? "PATCH" : "POST";
      const party = await apiFetch<Party>(path, {
        method,
        organizationId: workspace.organizationId,
        body: JSON.stringify(normalizeOptionalStrings(values))
      });

      setLegalCase((current) => {
        if (!current) return current;
        const parties = editingParty
          ? current.parties.map((item) => (item.id === party.id ? party : item))
          : [...current.parties, party];
        return { ...current, parties };
      });
      setMessage(editingParty ? "Сторона обновлена" : "Сторона добавлена");
      startCreateParty();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить сторону");
    }
  }

  async function deleteParty(party: Party) {
    if (!window.confirm(`Удалить сторону "${party.name}"?`)) return;
    setError("");
    try {
      await apiFetch(`/case-parties/${party.id}`, {
        method: "DELETE",
        organizationId: workspace.organizationId
      });
      setLegalCase((current) => (current ? { ...current, parties: current.parties.filter((item) => item.id !== party.id) } : current));
      if (editingParty?.id === party.id) startCreateParty();
      setMessage("Сторона удалена");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить сторону");
    }
  }

  if (isLoading) {
    return <div className="text-sm text-slate-600">Загружаем карточку дела...</div>;
  }

  if (!legalCase) {
    return (
      <div className="space-y-4">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700" to="/cases"><ArrowLeft size={18} /> К реестру дел</Link>
        <Toast message={error || "Дело не найдено"} tone="error" onClose={() => setError("")} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toast message={message} tone="success" onClose={() => setMessage("")} />
      <Toast message={error} tone="error" onClose={() => setError("")} />

      <div className="space-y-3">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700" to="/cases"><ArrowLeft size={18} /> К реестру дел</Link>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-950">{legalCase.caseNumber ?? "б/н"} · {legalCase.title}</h1>
            <div className="mt-2 text-sm text-slate-500">{legalCase.client.fullName} · {legalCase.courtName ?? "Суд не указан"}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="w-fit rounded-md bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">{statusLabels[legalCase.status]}</span>
            {legalCase.status !== "archived" ? (
              <button className="focus-ring flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700" onClick={() => void archiveCase()}>
                <Archive size={16} /> В архив
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {caseIntelligence ? (
        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className={`rounded-[24px] border p-5 shadow-panel ${caseIntelligence.riskLevel === "critical" ? "border-red-200 bg-red-50" : caseIntelligence.riskLevel === "attention" ? "border-orange-200 bg-orange-50" : "border-emerald-200 bg-emerald-50"}`}>
            <div className="flex items-start gap-4">
              <IconTile icon={caseIntelligence.riskLevel === "critical" ? AlertTriangle : Sparkles} tone={caseIntelligence.riskLevel === "critical" ? "red" : caseIntelligence.riskLevel === "attention" ? "orange" : "green"} />
              <div className="min-w-0">
                <Badge tone={caseIntelligence.riskLevel === "critical" ? "red" : caseIntelligence.riskLevel === "attention" ? "orange" : "green"}>
                  {caseIntelligence.riskLevel === "critical" ? "Есть риск" : caseIntelligence.riskLevel === "attention" ? "Требует внимания" : "Под контролем"}
                </Badge>
                <h2 className="mt-3 text-xl font-semibold text-slate-950">{caseIntelligence.nextAction}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Открыто задач: {caseIntelligence.openTasks.length}. Открыто сроков: {caseIntelligence.openDeadlines.length}. Просрочено: {caseIntelligence.overdueTasks.length + caseIntelligence.overdueDeadlines.length}.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="premium-button-blue" onClick={() => setActiveTab("deadlines")}>Сроки</button>
              <button className="premium-button-ghost" onClick={() => setActiveTab("tasks")}>Задачи</button>
              <button className="premium-button-ghost" onClick={() => setActiveTab("documents")}>Документы</button>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Ближайшее заседание</div>
                <div className="mt-2 font-semibold text-slate-950">{caseIntelligence.nextHearing?.title ?? "Не назначено"}</div>
                <div className="mt-1 text-sm text-slate-500">{formatDateTime(caseIntelligence.nextHearing?.startAt)}</div>
              </div>
              <div className="rounded-[18px] bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Ближайший срок</div>
                <div className="mt-2 font-semibold text-slate-950">{caseIntelligence.nextDeadline?.title ?? "Нет открытых сроков"}</div>
                <div className="mt-1 text-sm text-slate-500">{formatDate(caseIntelligence.nextDeadline?.deadlineAt)}</div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
            <div className="text-sm text-slate-500">{metric.label}</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{metric.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`h-11 shrink-0 border-b-2 px-3 text-sm font-semibold ${activeTab === tab.id ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-900"}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <>
        <Panel title="Обзор дела">
          <form className="grid gap-4 p-5 lg:grid-cols-2" onSubmit={form.handleSubmit(saveOverview)}>
            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-slate-700">Название дела</span>
              <input className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-ring" {...form.register("title")} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Клиент</span>
              <select className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-ring" {...form.register("clientId")}>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.fullName}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">№ дела</span>
              <input className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-ring" {...form.register("caseNumber")} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Суд</span>
              <input className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-ring" {...form.register("courtName")} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Судья</span>
              <input className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-ring" {...form.register("judgeName")} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Статус</span>
              <select className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-ring" {...form.register("status")}>
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Сторона клиента</span>
              <select className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-ring" {...form.register("side")}>
                {Object.entries(sideLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Категория</span>
              <input className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-ring" {...form.register("category")} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Цена иска</span>
              <input className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-ring" type="number" {...form.register("claimAmount", { setValueAs: (value) => (value === "" ? undefined : Number(value)) })} />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-slate-700">Описание</span>
              <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring" {...form.register("description")} />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-slate-700">Результат</span>
              <textarea className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-ring" {...form.register("result")} />
            </label>
            <div className="lg:col-span-2">
              <button className="focus-ring flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white">
                <Save size={18} /> Сохранить обзор
              </button>
            </div>
          </form>
        </Panel>
        <Panel title="Таймлайн дела" action={`${caseIntelligence?.timeline.length ?? 0} событий`}>
          {caseIntelligence && caseIntelligence.timeline.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {caseIntelligence.timeline.slice(0, 8).map((item) => (
                <div key={item.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[150px_1fr] sm:items-start">
                  <div className="text-sm font-semibold text-slate-500">{formatDateTime(item.date)}</div>
                  <div className="flex gap-3">
                    <IconTile icon={item.icon} tone={item.tone} className="h-10 w-10 rounded-2xl" />
                    <div>
                      <div className="font-semibold text-slate-950">{item.title}</div>
                      <div className="mt-1 text-sm text-slate-500">{item.meta}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-slate-500">Пока нет событий, сроков, задач или документов по делу.</div>
          )}
        </Panel>
        </>
      ) : null}

      {activeTab === "parties" ? (
        <Panel title="Стороны дела" action={`${legalCase.parties.length} записей`}>
          <form className="grid gap-4 border-b border-slate-200 p-5 lg:grid-cols-2" onSubmit={partyForm.handleSubmit(saveParty)}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Наименование</span>
              <input className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-ring" {...partyForm.register("name")} />
              {partyForm.formState.errors.name ? <span className="mt-1 block text-xs text-red-600">{partyForm.formState.errors.name.message}</span> : null}
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Тип стороны</span>
              <select className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-ring" {...partyForm.register("type")}>
                {Object.entries(partyTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Представитель</span>
              <input className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-ring" {...partyForm.register("representative")} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-ring" {...partyForm.register("email", { setValueAs: (value) => (value === "" ? undefined : value) })} />
              {partyForm.formState.errors.email ? <span className="mt-1 block text-xs text-red-600">{partyForm.formState.errors.email.message}</span> : null}
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Телефон</span>
              <input className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-ring" {...partyForm.register("phone")} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">ИНН</span>
              <input className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-ring" {...partyForm.register("inn")} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">ОГРН</span>
              <input className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-ring" {...partyForm.register("ogrn")} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Адрес</span>
              <input className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-ring" {...partyForm.register("address")} />
            </label>
            <div className="flex flex-wrap gap-3 lg:col-span-2">
              <button className="focus-ring flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white">
                {editingParty ? <Edit3 size={18} /> : <Plus size={18} />}
                {editingParty ? "Сохранить сторону" : "Добавить сторону"}
              </button>
              {editingParty ? (
                <button type="button" className="focus-ring flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold" onClick={startCreateParty}>
                  <X size={18} /> Отменить
                </button>
              ) : null}
            </div>
          </form>
          <List items={legalCase.parties} empty="Стороны пока не добавлены" render={(party) => (
            <div className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_150px_220px_auto] lg:items-center">
              <div>
                <div className="font-semibold">{party.name}</div>
                <div className="text-sm text-slate-500">{party.representative ?? "Представитель не указан"}</div>
                <div className="mt-1 text-xs text-slate-400">{party.inn ? `ИНН ${party.inn}` : "ИНН не указан"}{party.ogrn ? ` · ОГРН ${party.ogrn}` : ""}</div>
              </div>
              <span className="w-fit rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{partyTypeLabels[party.type]}</span>
              <span className="text-sm text-slate-500">{party.email ?? party.phone ?? "Контакты не указаны"}</span>
              <div className="flex gap-2 lg:justify-end">
                <button className="focus-ring flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold" onClick={() => startEditParty(party)}>
                  <Edit3 size={16} /> Изменить
                </button>
                <button className="focus-ring flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-600" onClick={() => void deleteParty(party)}>
                  <Trash2 size={16} /> Удалить
                </button>
              </div>
            </div>
          )} />
        </Panel>
      ) : null}

      {activeTab === "documents" ? (
        <Panel title="Документы" action={`${legalCase.documents.length} файлов`}>
          <List items={legalCase.documents} empty="Документы пока не добавлены" render={(document) => (
            <div className="flex flex-col gap-3 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-slate-400" />
                <div><div className="font-semibold">{document.title}</div><div className="text-slate-500">{document.originalFileName} · {Math.ceil(document.size / 1024)} КБ</div></div>
              </div>
              <button className="flex items-center gap-2 text-blue-600" onClick={() => void downloadDocument(document.id, document.originalFileName, workspace.organizationId)}>
                <Download size={18} /> Скачать
              </button>
            </div>
          )} />
        </Panel>
      ) : null}

      {activeTab === "deadlines" ? (
        <Panel title="Процессуальные сроки" action={`${legalCase.deadlines.length} всего`}>
          <List items={legalCase.deadlines} empty="Сроки пока не добавлены" render={(deadline) => (
            <div className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto_auto]">
              <div className="font-semibold">{deadline.title}</div>
              <span className="w-fit rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-700">{deadline.priority}</span>
              <span className="text-sm text-slate-500">{formatDate(deadline.deadlineAt)}</span>
            </div>
          )} />
        </Panel>
      ) : null}

      {activeTab === "tasks" ? (
        <Panel title="Задачи" action={`${legalCase.tasks.length} всего`}>
          <List items={legalCase.tasks} empty="Задачи пока не добавлены" render={(task) => (
            <div className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto_auto]">
              <div className="font-semibold">{task.title}</div>
              <span className="w-fit rounded-md bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">{task.priority}</span>
              <span className="text-sm text-slate-500">{formatDate(task.dueAt)}</span>
            </div>
          )} />
        </Panel>
      ) : null}

      {activeTab === "events" ? (
        <Panel title="События" action={`${legalCase.events.length} всего`}>
          <List items={legalCase.events} empty="События пока не добавлены" render={(event) => (
            <div className="grid gap-2 px-5 py-4 sm:grid-cols-[180px_1fr_auto]">
              <div className="font-semibold text-blue-700">{new Date(event.startAt).toLocaleString("ru-RU")}</div>
              <div><div className="font-semibold">{event.title}</div><div className="text-sm text-slate-500">{event.type}</div></div>
              <div className="text-sm text-slate-600">{event.location ?? "Место не указано"}</div>
            </div>
          )} />
        </Panel>
      ) : null}

      {activeTab === "activity" ? (
        <Panel title="История активности" action={`${auditLogs.length} событий`}>
          {auditLogs.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">По этому делу пока нет доступных событий журнала.</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {auditLogs.map((log) => (
                <div key={log.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="font-semibold text-slate-950">{log.action}</div>
                    <div className="text-sm text-slate-500">{log.user?.fullName ?? log.user?.email ?? "Система"}</div>
                  </div>
                  <div className="text-sm font-semibold text-slate-500">{new Date(log.createdAt).toLocaleString("ru-RU")}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      ) : null}
    </div>
  );
}

function List<T extends { id: string }>(props: { items: T[]; empty: string; render: (item: T) => ReactNode }) {
  if (props.items.length === 0) {
    return <div className="px-5 py-10 text-center text-sm text-slate-500">{props.empty}</div>;
  }

  return <div className="divide-y divide-slate-200">{props.items.map((item) => <div key={item.id}>{props.render(item)}</div>)}</div>;
}
