import { AlertTriangle, Check, Clock, Edit3, Filter, Plus, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { deadlineCreateSchema, taskCreateSchema } from "@resportal/shared";
import { Panel } from "../components/Panel";
import { Badge, EmptyState, IconTile, PageHeader, cx, formatDate, isOverdue } from "../components/Premium";
import { Toast } from "../components/Toast";
import { apiFetch } from "../lib/api";
import { useWorkspace } from "../lib/workspace";

type DueFilter = "" | "overdue" | "today" | "week";
type TaskStatus = "todo" | "in_progress" | "review" | "done" | "cancelled";
type TaskPriority = "low" | "medium" | "high" | "urgent";
type DeadlineStatus = "active" | "completed" | "overdue" | "cancelled";
type DeadlinePriority = "low" | "medium" | "high" | "critical";
type LegalCase = { id: string; title: string; caseNumber?: string };
type Task = { id: string; title: string; priority: TaskPriority; status: TaskStatus; dueAt?: string; caseId?: string; assignedToId?: string; case?: LegalCase };
type Deadline = { id: string; title: string; priority: DeadlinePriority; status: DeadlineStatus; deadlineAt: string; caseId: string; responsibleUserId?: string; basis?: string; case?: LegalCase };
type Member = { id: string; role: string; user: { id: string; fullName: string; email: string } };

const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  review: "На проверке",
  done: "Готово",
  cancelled: "Отменено"
};

const deadlineStatusLabels: Record<DeadlineStatus, string> = {
  active: "Активен",
  completed: "Завершен",
  overdue: "Просрочен",
  cancelled: "Отменен"
};

const dueLabels: Record<Exclude<DueFilter, "">, string> = {
  overdue: "Просроченные",
  today: "Сегодня",
  week: "7 дней"
};

function dateInputValue(value?: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function optional(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? text : undefined;
}

function priorityTone(priority: TaskPriority | DeadlinePriority) {
  if (priority === "urgent" || priority === "critical") return "red" as const;
  if (priority === "high") return "rose" as const;
  if (priority === "medium") return "orange" as const;
  return "slate" as const;
}

export function TasksPage() {
  const { workspace } = useWorkspace();
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  const [taskDueFilter, setTaskDueFilter] = useState<DueFilter>("");
  const [deadlineDueFilter, setDeadlineDueFilter] = useState<DueFilter>("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const taskQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (taskDueFilter) params.set("due", taskDueFilter);
    const value = params.toString();
    return value ? `?${value}` : "";
  }, [taskDueFilter]);

  const deadlineQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (deadlineDueFilter) params.set("due", deadlineDueFilter);
    const value = params.toString();
    return value ? `?${value}` : "";
  }, [deadlineDueFilter]);

  async function load() {
    const organizationId = workspace.organizationId;
    try {
      const [nextCases, nextTasks, nextDeadlines, nextMembers] = await Promise.all([
        apiFetch<LegalCase[]>("/cases", { organizationId }),
        apiFetch<Task[]>(`/tasks${taskQuery}`, { organizationId }),
        apiFetch<Deadline[]>(`/deadlines${deadlineQuery}`, { organizationId }),
        apiFetch<Member[]>(`/organizations/${organizationId}/members`, { organizationId }).catch(() => [])
      ]);
      setCases(nextCases);
      setTasks(nextTasks);
      setDeadlines(nextDeadlines);
      setMembers(nextMembers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить задачи и сроки");
    }
  }

  useEffect(() => {
    void load();
  }, [workspace.organizationId, taskQuery, deadlineQuery]);

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const input = taskCreateSchema.parse({
      title: form.get("title"),
      caseId: optional(form.get("caseId")),
      priority: form.get("priority"),
      status: form.get("status") || "todo",
      dueAt: optional(form.get("dueAt")),
      assignedToId: optional(form.get("assignedToId"))
    });

    try {
      await apiFetch(editingTask ? `/tasks/${editingTask.id}` : "/tasks", {
        method: editingTask ? "PATCH" : "POST",
        organizationId: workspace.organizationId,
        body: JSON.stringify(input)
      });
      event.currentTarget.reset();
      setEditingTask(null);
      setMessage(editingTask ? "Задача обновлена" : "Задача создана");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить задачу");
    }
  }

  async function saveDeadline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const input = deadlineCreateSchema.parse({
      title: form.get("title"),
      caseId: form.get("caseId"),
      priority: form.get("priority"),
      status: form.get("status") || "active",
      deadlineAt: form.get("deadlineAt"),
      basis: optional(form.get("basis")),
      responsibleUserId: optional(form.get("responsibleUserId"))
    });

    try {
      await apiFetch(editingDeadline ? `/deadlines/${editingDeadline.id}` : "/deadlines", {
        method: editingDeadline ? "PATCH" : "POST",
        organizationId: workspace.organizationId,
        body: JSON.stringify(input)
      });
      event.currentTarget.reset();
      setEditingDeadline(null);
      setMessage(editingDeadline ? "Срок обновлен" : "Срок создан");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить срок");
    }
  }

  async function completeTask(task: Task) {
    await apiFetch(`/tasks/${task.id}/complete`, { method: "PATCH", organizationId: workspace.organizationId, body: "{}" });
    setMessage("Задача завершена");
    await load();
  }

  async function completeDeadline(deadline: Deadline) {
    await apiFetch(`/deadlines/${deadline.id}/complete`, { method: "PATCH", organizationId: workspace.organizationId, body: "{}" });
    setMessage("Срок завершен");
    await load();
  }

  const overdueCount = tasks.filter((task) => isOverdue(task.dueAt) && task.status !== "done").length + deadlines.filter((deadline) => isOverdue(deadline.deadlineAt) && deadline.status !== "completed").length;

  return (
    <div className="space-y-7">
      <PageHeader
        title="Задачи и сроки"
        description="Рабочие поручения и процессуальные дедлайны разделены, чтобы критические сроки не терялись в обычном списке задач."
        action={<Badge tone={overdueCount ? "red" : "green"}>{overdueCount ? `${overdueCount} просрочено` : "Просрочек нет"}</Badge>}
      />
      <Toast message={message} tone="success" onClose={() => setMessage("")} />
      <Toast message={error} tone="error" onClose={() => setError("")} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={editingTask ? "Редактировать задачу" : "Создать задачу"}>
          <form className="grid gap-3 p-6 sm:grid-cols-2 xl:grid-cols-3" onSubmit={saveTask}>
            <input key={editingTask?.id ?? "new-task-title"} required name="title" defaultValue={editingTask?.title ?? ""} placeholder="Задача" className="premium-input sm:col-span-2 xl:col-span-3" />
            <select key={editingTask?.id ?? "new-task-case"} name="caseId" defaultValue={editingTask?.caseId ?? ""} className="premium-select">
              <option value="">Без дела</option>
              {cases.map((item) => <option key={item.id} value={item.id}>{item.caseNumber ?? item.title}</option>)}
            </select>
            <select key={editingTask?.id ?? "new-task-priority"} name="priority" defaultValue={editingTask?.priority ?? "medium"} className="premium-select">
              <option value="low">Низкий</option><option value="medium">Средний</option><option value="high">Высокий</option><option value="urgent">Срочно</option>
            </select>
            <select key={editingTask?.id ?? "new-task-status"} name="status" defaultValue={editingTask?.status ?? "todo"} className="premium-select">
              {Object.entries(taskStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <input key={editingTask?.id ?? "new-task-due"} name="dueAt" type="date" defaultValue={dateInputValue(editingTask?.dueAt)} className="premium-input" />
            <select key={editingTask?.id ?? "new-task-assignee"} name="assignedToId" defaultValue={editingTask?.assignedToId ?? ""} className="premium-select">
              <option value="">Ответственный</option>
              {members.map((member) => <option key={member.id} value={member.user.id}>{member.user.fullName}</option>)}
            </select>
            <div className="flex gap-2 sm:col-span-2 xl:col-span-3">
              <button className="premium-button-blue">{editingTask ? "Сохранить задачу" : "Создать задачу"}</button>
              {editingTask ? <button type="button" className="premium-button-ghost" onClick={() => setEditingTask(null)}><X size={18} /> Отменить</button> : null}
            </div>
          </form>
        </Panel>

        <Panel title={editingDeadline ? "Редактировать процессуальный срок" : "Создать процессуальный срок"}>
          <form className="grid gap-3 p-6 sm:grid-cols-2 xl:grid-cols-3" onSubmit={saveDeadline}>
            <input key={editingDeadline?.id ?? "new-deadline-title"} required name="title" defaultValue={editingDeadline?.title ?? ""} placeholder="Срок" className="premium-input sm:col-span-2 xl:col-span-3" />
            <select key={editingDeadline?.id ?? "new-deadline-case"} required name="caseId" defaultValue={editingDeadline?.caseId ?? ""} className="premium-select">
              <option value="">Дело</option>
              {cases.map((item) => <option key={item.id} value={item.id}>{item.caseNumber ?? item.title}</option>)}
            </select>
            <select key={editingDeadline?.id ?? "new-deadline-priority"} name="priority" defaultValue={editingDeadline?.priority ?? "medium"} className="premium-select">
              <option value="low">Низкий</option><option value="medium">Средний</option><option value="high">Высокий</option><option value="critical">Критичный</option>
            </select>
            <select key={editingDeadline?.id ?? "new-deadline-status"} name="status" defaultValue={editingDeadline?.status ?? "active"} className="premium-select">
              {Object.entries(deadlineStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <input key={editingDeadline?.id ?? "new-deadline-date"} required name="deadlineAt" type="date" defaultValue={dateInputValue(editingDeadline?.deadlineAt)} className="premium-input" />
            <select key={editingDeadline?.id ?? "new-deadline-responsible"} name="responsibleUserId" defaultValue={editingDeadline?.responsibleUserId ?? ""} className="premium-select">
              <option value="">Ответственный</option>
              {members.map((member) => <option key={member.id} value={member.user.id}>{member.user.fullName}</option>)}
            </select>
            <div className="flex gap-2 sm:col-span-2 xl:col-span-3">
              <button className="premium-button">{editingDeadline ? "Сохранить срок" : "Создать срок"}</button>
              {editingDeadline ? <button type="button" className="premium-button-ghost" onClick={() => setEditingDeadline(null)}><X size={18} /> Отменить</button> : null}
            </div>
          </form>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Задачи" action={`${tasks.length} всего`}>
          <FilterBar value={taskDueFilter} onChange={setTaskDueFilter} />
          {tasks.length === 0 ? (
            <EmptyState title="Задачи не найдены" description="Создайте поручение по делу или сбросьте фильтр по срокам." icon={Check} tone="rose" />
          ) : (
            <div className="space-y-3 p-5">
              {tasks.map((task) => (
                <div key={task.id} className={cx("rounded-[18px] border p-4 transition hover:-translate-y-0.5 hover:shadow-lift", isOverdue(task.dueAt) && task.status !== "done" ? "border-red-200 bg-red-50/60" : "border-slate-200 bg-white")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <IconTile icon={Check} tone={task.status === "done" ? "green" : "rose"} className="h-10 w-10" />
                      <div>
                        <div className="font-semibold text-slate-950">{task.title}</div>
                        <div className="mt-1 text-sm text-slate-500">{task.case?.caseNumber ?? task.case?.title ?? "Без дела"}</div>
                      </div>
                    </div>
                    <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={task.status === "done" ? "green" : "slate"}>{taskStatusLabels[task.status]}</Badge>
                      <Badge tone={isOverdue(task.dueAt) && task.status !== "done" ? "red" : "slate"}>{formatDate(task.dueAt)}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <button className="premium-button-ghost h-9 px-3" onClick={() => setEditingTask(task)}><Edit3 size={16} /></button>
                      {task.status !== "done" ? <button className="premium-button-ghost h-9 px-3 text-emerald-700" onClick={() => void completeTask(task)}><Check size={16} /></button> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Процессуальные сроки" action={`${deadlines.length} всего`}>
          <FilterBar value={deadlineDueFilter} onChange={setDeadlineDueFilter} />
          {deadlines.length === 0 ? (
            <EmptyState title="Сроки не найдены" description="Добавьте процессуальный срок по делу, чтобы он был заметнее обычных задач." icon={Clock} tone="orange" />
          ) : (
            <div className="space-y-3 p-5">
              {deadlines.map((deadline) => {
                const overdue = isOverdue(deadline.deadlineAt) && deadline.status !== "completed";
                return (
                  <div key={deadline.id} className={cx("rounded-[18px] border p-4 transition hover:-translate-y-0.5 hover:shadow-lift", overdue ? "border-red-200 bg-red-50/70" : "border-orange-200 bg-orange-50/50")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <IconTile icon={overdue ? AlertTriangle : Clock} tone={overdue ? "red" : "orange"} className="h-10 w-10" />
                        <div>
                          <div className="font-semibold text-slate-950">{deadline.title}</div>
                          <div className="mt-1 text-sm text-slate-500">{deadline.case?.caseNumber ?? deadline.case?.title}</div>
                        </div>
                      </div>
                      <Badge tone={priorityTone(deadline.priority)}>{deadline.priority}</Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={overdue || deadline.status === "overdue" ? "red" : deadline.status === "completed" ? "green" : "orange"}>{deadlineStatusLabels[deadline.status]}</Badge>
                        <Badge tone={overdue ? "red" : "orange"}>{formatDate(deadline.deadlineAt)}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <button className="premium-button-ghost h-9 px-3" onClick={() => setEditingDeadline(deadline)}><Edit3 size={16} /></button>
                        {deadline.status !== "completed" ? <button className="premium-button-ghost h-9 px-3 text-emerald-700" onClick={() => void completeDeadline(deadline)}><Check size={16} /></button> : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function FilterBar(props: { value: DueFilter; onChange: (value: DueFilter) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-4">
      <Filter size={17} className="text-slate-400" />
      <button className={cx("h-9 rounded-2xl px-3 text-sm font-semibold transition", props.value === "" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")} onClick={() => props.onChange("")}>Все</button>
      {Object.entries(dueLabels).map(([value, label]) => (
        <button key={value} className={cx("h-9 rounded-2xl px-3 text-sm font-semibold transition", props.value === value ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")} onClick={() => props.onChange(value as DueFilter)}>
          {label}
        </button>
      ))}
    </div>
  );
}
