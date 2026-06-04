import { ArrowLeft, CheckCircle2, CreditCard, FileText, LockKeyhole, ShieldCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Panel } from "../components/Panel";
import { Badge, IconTile, PageHeader } from "../components/Premium";
import { Toast } from "../components/Toast";
import { apiFetch } from "../lib/api";
import { useWorkspace } from "../lib/workspace";

type PaidPlanId = "solo" | "team" | "firm";
type Plan = {
  plan: "free" | PaidPlanId;
  title: string;
  price: number;
  usersLimit: number;
  activeCasesLimit: number;
  storageLimit: number;
  recommended?: boolean;
  description: string;
  features: string[];
};
type Subscription = {
  tariffPlan: string;
  tariffStatus: string;
  tariffCurrentPeriodEnd?: string;
  usersLimit: number;
  activeCasesLimit: number;
  storageLimit: number;
  paymentProvider?: string;
};

const planDetails: Record<PaidPlanId, { audience: string; outcomes: string[]; operationalNotes: string[] }> = {
  solo: {
    audience: "Для частнопрактикующего юриста, которому нужно вести дела, клиентов, сроки, задачи и документы без командной сложности.",
    outcomes: [
      "Снимает лимит бесплатной версии до рабочего уровня личной практики.",
      "Подходит для стабильного ведения до 30 активных дел.",
      "Дает 5 ГБ под документы и юридические материалы."
    ],
    operationalNotes: [
      "Один пользователь в рабочем пространстве.",
      "Доступ активируется на 30 дней после успешного платежа.",
      "После окончания периода данные сохраняются, но снова действуют бесплатные лимиты."
    ]
  },
  team: {
    audience: "Для небольшой юридической команды, где есть распределение задач, роли, приглашения и общий контроль сроков.",
    outcomes: [
      "До 5 пользователей с ролями и приглашениями.",
      "До 150 активных дел для командной практики.",
      "30 ГБ хранилища под документы, позиции и вложения."
    ],
    operationalNotes: [
      "Подходит для владельца, админа, юристов и ассистентов.",
      "Доступ активируется на 30 дней после успешного платежа.",
      "Повторная оплата продлевает рабочий период еще на 30 дней."
    ]
  },
  firm: {
    audience: "Для юридической фирмы с несколькими юристами, большим портфелем дел и повышенными требованиями к объему документов.",
    outcomes: [
      "До 20 пользователей в одной организации.",
      "До 500 активных дел и 100 ГБ документов.",
      "Приоритетная поддержка и запас по лимитам для роста."
    ],
    operationalNotes: [
      "Подходит для фирмы с несколькими практиками или офисами.",
      "Доступ активируется на 30 дней после успешного платежа.",
      "При повторной оплате период продлевается без потери текущих данных."
    ]
  }
};

function isPaidPlan(value: string | undefined): value is PaidPlanId {
  return value === "solo" || value === "team" || value === "firm";
}

function formatStorage(value: number) {
  if (value >= 1024) return `${Math.round(value / 1024)} ГБ`;
  return `${value} МБ`;
}

function hasPaidSubscription(subscription: Subscription | null) {
  if (!subscription?.tariffCurrentPeriodEnd) return false;
  return subscription.tariffStatus === "active" && new Date(subscription.tariffCurrentPeriodEnd) > new Date();
}

export function BillingPlanPage() {
  const { plan: planParam } = useParams();
  const { workspace, refreshWorkspace } = useWorkspace();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [nextPlans, nextSubscription] = await Promise.all([
          apiFetch<Plan[]>("/billing/plans", { organizationId: workspace.organizationId }),
          apiFetch<Subscription>("/billing/subscription", { organizationId: workspace.organizationId })
        ]);
        setPlans(nextPlans);
        setSubscription(nextSubscription);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось загрузить тариф");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [workspace.organizationId]);

  const selectedPlan = useMemo(() => plans.find((item) => item.plan === planParam), [planParam, plans]);
  const paidPlan = isPaidPlan(planParam) ? planParam : null;

  if (!paidPlan) return <Navigate to="/settings" replace />;

  const details = planDetails[paidPlan];
  const isCurrentPlan = hasPaidSubscription(subscription) && subscription?.tariffPlan === paidPlan;

  async function checkout() {
    if (!paidPlan) return;
    setIsPaying(true);
    setError("");
    try {
      const result = await apiFetch<{ url: string }>("/billing/checkout", {
        method: "POST",
        organizationId: workspace.organizationId,
        body: JSON.stringify({ plan: paidPlan })
      });
      await refreshWorkspace();
      window.location.href = result.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось открыть оплату");
      setIsPaying(false);
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title={selectedPlan ? `Тариф ${selectedPlan.title}` : "Тариф"}
        description="Проверьте лимиты, условия доступа и состав тарифа перед переходом к оплате YooKassa."
        action={
          <Link className="premium-button-ghost" to="/settings">
            <ArrowLeft size={18} />
            Назад
          </Link>
        }
      />
      <Toast message={error} tone="error" onClose={() => setError("")} />

      <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Panel
          title={selectedPlan ? `${selectedPlan.title}: что входит` : "Загружаем тариф"}
          description={isLoading ? "Получаем актуальные лимиты и цену." : details.audience}
        >
          {selectedPlan ? (
            <div className="grid gap-5 p-6 lg:grid-cols-3">
              <div className="rounded-[18px] bg-slate-50 p-5">
                <IconTile icon={Users} tone="blue" className="mb-4 h-11 w-11" />
                <div className="text-sm font-semibold text-slate-500">Пользователи</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{selectedPlan.usersLimit}</div>
              </div>
              <div className="rounded-[18px] bg-slate-50 p-5">
                <IconTile icon={FileText} tone="violet" className="mb-4 h-11 w-11" />
                <div className="text-sm font-semibold text-slate-500">Активные дела</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{selectedPlan.activeCasesLimit}</div>
              </div>
              <div className="rounded-[18px] bg-slate-50 p-5">
                <IconTile icon={ShieldCheck} tone="green" className="mb-4 h-11 w-11" />
                <div className="text-sm font-semibold text-slate-500">Документы</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{formatStorage(selectedPlan.storageLimit)}</div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-sm font-semibold text-slate-500">Загружаем...</div>
          )}

          <div className="grid gap-6 border-t border-slate-100 p-6 lg:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Ключевые возможности</h2>
              <div className="mt-4 space-y-3">
                {(selectedPlan?.features ?? details.outcomes).map((item) => (
                  <div key={item} className="flex gap-3 text-sm leading-6 text-slate-600">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Как работает доступ</h2>
              <div className="mt-4 space-y-3">
                {details.operationalNotes.map((item) => (
                  <div key={item} className="flex gap-3 text-sm leading-6 text-slate-600">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-blue-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <aside className="premium-panel h-fit p-6">
          {isCurrentPlan ? <Badge tone="green">Текущий тариф</Badge> : selectedPlan?.recommended ? <Badge tone="blue">Чаще выбирают</Badge> : null}
          <h2 className="mt-4 text-2xl font-semibold text-slate-950">{selectedPlan?.title ?? paidPlan.toUpperCase()}</h2>
          <div className="mt-4 flex items-end gap-2">
            <div className="text-4xl font-semibold text-slate-950">{selectedPlan ? selectedPlan.price.toLocaleString("ru-RU") : "..." } ₽</div>
            <div className="pb-1 text-sm font-semibold text-slate-500">за 30 дней</div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-500">{selectedPlan?.description ?? details.audience}</p>
          <button className="premium-button-blue mt-6 w-full disabled:cursor-not-allowed disabled:bg-slate-300" onClick={() => void checkout()} disabled={isPaying || !selectedPlan}>
            <CreditCard size={18} />
            {isPaying ? "Открываем YooKassa..." : isCurrentPlan ? "Продлить доступ" : "Перейти к оплате"}
          </button>
          <div className="mt-4 flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            <LockKeyhole size={18} className="mt-0.5 shrink-0 text-slate-500" />
            <span>Оплата проходит на стороне YooKassa. РЕСПОРТАЛ получает только статус платежа и активирует доступ.</span>
          </div>
        </aside>
      </section>
    </div>
  );
}
