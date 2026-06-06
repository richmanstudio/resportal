import { Activity, Building2, CreditCard, KeyRound, MailCheck, Plus, ShieldCheck, UserPlus, Users } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Panel } from "../components/Panel";
import { Badge, IconTile, PageHeader } from "../components/Premium";
import { Toast } from "../components/Toast";
import { apiFetch } from "../lib/api";
import { useWorkspace } from "../lib/workspace";

type Member = { id: string; role: string; status: string; user: { email: string; fullName: string } };
type Plan = { plan: "free" | "solo" | "team" | "firm"; title: string; price: number; usersLimit: number; activeCasesLimit: number; storageLimit: number; recommended?: boolean; description: string; features: string[] };
type Subscription = { tariffPlan: string; tariffStatus: string; tariffCurrentPeriodEnd?: string; usersLimit: number; activeCasesLimit: number; storageLimit: number; paymentProvider?: string };
type AuditLog = { id: string; action: string; entityType: string; createdAt: string; user?: { fullName: string; email: string } };

function hasPaidSubscription(subscription: Subscription | null) {
  const currentPeriodEnd = subscription?.tariffCurrentPeriodEnd;
  return subscription?.tariffStatus === "active" && currentPeriodEnd ? new Date(currentPeriodEnd) > new Date() : false;
}

function canViewAudit(role: string) {
  return role === "owner" || role === "admin";
}

export function SettingsPage() {
  const { workspace, refreshWorkspace } = useWorkspace();
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const organizationId = workspace.organizationId;
    const shouldLoadAudit = canViewAudit(workspace.membership.role);
    const [nextMembers, nextPlans, nextSubscription, nextAuditLogs] = await Promise.all([
      apiFetch<Member[]>(`/organizations/${organizationId}/members`, { organizationId }),
      apiFetch<Plan[]>("/billing/plans", { organizationId }),
      apiFetch<Subscription>("/billing/subscription", { organizationId }),
      shouldLoadAudit ? apiFetch<AuditLog[]>("/audit-logs?limit=8", { organizationId }).catch(() => []) : Promise.resolve([])
    ]);
    setMembers(nextMembers);
    setPlans(nextPlans);
    setSubscription(nextSubscription);
    setAuditLogs(nextAuditLogs);
  }

  useEffect(() => {
    void load();
  }, [workspace.organizationId]);

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const organization = await apiFetch<{ id: string }>("/organizations", {
        method: "POST",
        body: JSON.stringify({ name: form.get("name"), type: "solo" })
      });
      localStorage.setItem("resportal.organizationId", organization.id);
      setMessage("Организация создана");
      await refreshWorkspace();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать организацию");
    }
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch<Member>(`/organizations/${workspace.organizationId}/invite`, {
        method: "POST",
        organizationId: workspace.organizationId,
        body: JSON.stringify({ email: form.get("email"), fullName: form.get("fullName"), role: form.get("role") })
      });
      event.currentTarget.reset();
      setMessage("Сотрудник добавлен в организацию");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить сотрудника");
    }
  }

  async function updateMember(member: Member, role: string) {
    setError("");
    try {
      await apiFetch<Member>(`/organizations/${workspace.organizationId}/members/${member.id}`, {
        method: "PATCH",
        organizationId: workspace.organizationId,
        body: JSON.stringify({ role, status: member.status === "suspended" ? "suspended" : "active" })
      });
      setMessage("Роль сотрудника обновлена");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось изменить роль");
    }
  }

  async function deleteMember(member: Member) {
    if (!window.confirm(`Удалить сотрудника "${member.user.fullName}" из организации?`)) return;
    setError("");
    try {
      await apiFetch(`/organizations/${workspace.organizationId}/members/${member.id}`, {
        method: "DELETE",
        organizationId: workspace.organizationId
      });
      setMessage("Сотрудник удален из организации");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить сотрудника");
    }
  }

  async function requestPasswordReset() {
    setError("");
    try {
      await apiFetch("/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email: workspace.user.email })
      });
      setMessage("Запрос на восстановление пароля принят");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось запросить восстановление пароля");
    }
  }

  async function requestEmailVerification() {
    setError("");
    try {
      await apiFetch("/auth/email-verification/request", {
        method: "POST",
        body: JSON.stringify({ email: workspace.user.email })
      });
      setMessage("Запрос на подтверждение email принят");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось запросить подтверждение email");
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="Настройки"
        description="Организация, подписка, участники команды и платежные действия в одном спокойном разделе."
        action={<Badge tone="slate">{workspace.membership.role}</Badge>}
      />
      <Toast message={message} tone="success" onClose={() => setMessage("")} />
      <Toast message={error} tone="error" onClose={() => setError("")} />

      <Panel title="Текущая организация">
        <div className="grid gap-4 p-6 sm:grid-cols-3">
          <div className="rounded-[18px] bg-slate-50 p-4">
            <IconTile icon={Building2} tone="blue" className="mb-4 h-10 w-10" />
            <div className="text-sm font-semibold text-slate-500">Название</div>
            <div className="mt-1 font-semibold text-slate-950">{workspace.membership.organization.name}</div>
          </div>
          <div className="rounded-[18px] bg-slate-50 p-4">
            <IconTile icon={CreditCard} tone="green" className="mb-4 h-10 w-10" />
            <div className="text-sm font-semibold text-slate-500">Версия</div>
            <div className="mt-1 font-semibold text-slate-950">{hasPaidSubscription(subscription) ? subscription?.tariffPlan : "Бесплатная"}</div>
          </div>
          <div className="rounded-[18px] bg-slate-50 p-4">
            <IconTile icon={Users} tone="violet" className="mb-4 h-10 w-10" />
            <div className="text-sm font-semibold text-slate-500">Ваша роль</div>
            <div className="mt-1 font-semibold text-slate-950">{workspace.membership.role}</div>
          </div>
        </div>
      </Panel>

      <Panel title="Подписка" description="Планы выглядят как продуктовые пакеты, без грубой платежной админки.">
        <div className="grid gap-4 p-6 xl:grid-cols-4">
          {plans.map((plan) => (
            <div key={plan.plan} className={`relative rounded-[20px] border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lift ${plan.recommended ? "border-blue-400 ring-4 ring-blue-100" : "border-slate-200"}`}>
              {plan.recommended ? <div className="absolute -top-3 left-5 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-blue-600/20">Чаще выбирают</div> : null}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">{plan.title}</div>
            <div className="mt-1 text-3xl font-semibold text-slate-950">{plan.price === 0 ? "0 ₽" : `${plan.price.toLocaleString("ru-RU")} ₽`}</div>
            <div className="text-sm font-medium text-slate-500">{plan.price === 0 ? "навсегда" : "за 30 дней доступа"}</div>
                </div>
                {(plan.plan === "free" && !hasPaidSubscription(subscription)) || (hasPaidSubscription(subscription) && subscription?.tariffPlan === plan.plan) ? <Badge tone="green">Текущий</Badge> : null}
              </div>
              <p className="mt-3 min-h-[44px] text-sm leading-6 text-slate-500">{plan.description}</p>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              {plan.plan === "free" ? (
                <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-500">Доступна без оплаты</div>
              ) : (
                <Link
                  className="premium-button-blue mt-5 w-full"
                  to={`/settings/billing/${plan.plan}`}
                >
                  Купить подписку
                </Link>
              )}
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 px-6 py-4">
          <div className="text-sm leading-6 text-slate-500">
            Оплата сейчас работает как разовый платеж YooKassa за 30 дней доступа. Рекуррентное управление появится после отдельного подключения автосписаний.
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button className="premium-button-ghost opacity-60" disabled>
              Управление автосписаниями пока недоступно
            </button>
            <span className="text-sm text-slate-500">
              {hasPaidSubscription(subscription) ? `Статус: ${subscription?.tariffStatus}` : "Сейчас вы в бесплатной урезанной версии"} {subscription?.paymentProvider ? `• ${subscription.paymentProvider}` : ""}
            </span>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Безопасность доступа" description="Базовые production-процессы доступа и контроль действий организации.">
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <div className="rounded-[18px] bg-slate-50 p-4">
              <IconTile icon={ShieldCheck} tone="green" className="mb-4 h-10 w-10" />
              <div className="font-semibold text-slate-950">JWT и refresh-сессия</div>
              <div className="mt-1 text-sm leading-6 text-slate-500">Доступ разделен на короткий access token и refresh cookie.</div>
            </div>
            {canViewAudit(workspace.membership.role) ? (
              <div className="rounded-[18px] bg-slate-50 p-4">
                <IconTile icon={Activity} tone="blue" className="mb-4 h-10 w-10" />
                <div className="font-semibold text-slate-950">Журнал действий</div>
                <div className="mt-1 text-sm leading-6 text-slate-500">Ключевые операции пишутся в audit log организации.</div>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3 border-t border-slate-100 px-6 py-4">
            <button className="premium-button-ghost" onClick={() => void requestPasswordReset()}><KeyRound size={18} /> Восстановить пароль</button>
            <button className="premium-button-ghost" onClick={() => void requestEmailVerification()}><MailCheck size={18} /> Подтвердить email</button>
          </div>
        </Panel>

        {canViewAudit(workspace.membership.role) ? (
          <Panel title="Журнал действий" action={`${auditLogs.length} событий`}>
            {auditLogs.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-500">Событий пока нет.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <div key={log.id} className="grid gap-3 px-6 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <div className="font-semibold text-slate-950">{log.action}</div>
                      <div className="text-sm text-slate-500">{log.entityType} · {log.user?.fullName ?? log.user?.email ?? "Система"}</div>
                    </div>
                    <div className="text-sm font-semibold text-slate-400">{new Date(log.createdAt).toLocaleString("ru-RU")}</div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        ) : null}
      </div>

      <Panel title="Создать организацию">
        <form className="grid gap-3 p-6 md:grid-cols-[1fr_auto]" onSubmit={createOrganization}>
          <input required name="name" placeholder="Название организации" className="premium-input" />
          <button className="premium-button-blue"><Plus size={18} /> Создать бесплатное пространство</button>
          <div className="text-sm text-slate-500 md:col-span-2">Подписка покупается отдельно. Новое пространство стартует в бесплатной урезанной версии.</div>
        </form>
      </Panel>

      <Panel title="Добавить сотрудника">
        <div className="border-b border-slate-100 px-6 py-4 text-sm text-slate-500">
          Укажите email и ФИО уже зарегистрированного пользователя. Если данные совпадут с аккаунтом, сотрудник сразу появится в организации.
        </div>
        <form className="grid gap-3 p-6 md:grid-cols-[1fr_1fr_160px_auto]" onSubmit={invite}>
          <input required name="fullName" placeholder="ФИО" className="premium-input" />
          <input required name="email" type="email" placeholder="Email" className="premium-input" />
          <select name="role" className="premium-select">
            <option value="lawyer">Юрист</option><option value="assistant">Помощник</option><option value="viewer">Наблюдатель</option><option value="admin">Админ</option>
          </select>
          <button className="premium-button"><UserPlus size={18} /> Добавить</button>
        </form>
      </Panel>

      <Panel title="Сотрудники и роли">
        <div className="divide-y divide-slate-100">
          {members.map((member) => (
            <div key={member.id} className="grid gap-3 px-6 py-4 transition hover:bg-slate-50/80 lg:grid-cols-[1fr_180px_140px_auto] lg:items-center">
              <div><div className="font-semibold">{member.user.fullName}</div><div className="text-sm text-slate-500">{member.user.email}</div></div>
              {member.role === "owner" ? (
                <span className="text-sm font-medium text-slate-700">owner</span>
              ) : (
                <select value={member.role} onChange={(event) => void updateMember(member, event.target.value)} className="premium-select">
                  <option value="admin">Админ</option>
                  <option value="lawyer">Юрист</option>
                  <option value="assistant">Помощник</option>
                  <option value="viewer">Наблюдатель</option>
                </select>
              )}
              <Badge tone={member.status === "active" ? "green" : "slate"}>{member.status}</Badge>
              <button
                className="premium-button-ghost text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={member.role === "owner"}
                onClick={() => void deleteMember(member)}
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
