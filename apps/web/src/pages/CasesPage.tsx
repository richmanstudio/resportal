import { BriefcaseBusiness, Filter, Plus, Search } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Panel } from "../components/Panel";
import { Badge, EmptyState, LoadingRows, PageHeader, formatDate } from "../components/Premium";
import { Toast } from "../components/Toast";
import { apiFetch } from "../lib/api";
import { useWorkspace } from "../lib/workspace";

type CaseStatus = "draft" | "active" | "suspended" | "finished" | "archived";
type Client = { id: string; fullName: string };
type LegalCase = { id: string; title: string; caseNumber?: string; courtName?: string; status: CaseStatus; updatedAt: string; client?: Client };

const statusLabels: Record<CaseStatus, string> = {
  draft: "Черновик",
  active: "В работе",
  suspended: "Приостановлено",
  finished: "Завершено",
  archived: "Архив"
};

function statusTone(status: CaseStatus) {
  if (status === "finished") return "green" as const;
  if (status === "archived") return "slate" as const;
  if (status === "suspended") return "orange" as const;
  return "blue" as const;
}

export function CasesPage() {
  const { workspace } = useWorkspace();
  const navigate = useNavigate();
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | CaseStatus>("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter) params.set("status", statusFilter);
    const value = params.toString();
    return value ? `?${value}` : "";
  }, [search, statusFilter]);

  async function load() {
    setIsLoading(true);
    try {
      const organizationId = workspace.organizationId;
      const [nextCases, nextClients] = await Promise.all([
        apiFetch<LegalCase[]>(`/cases${queryString}`, { organizationId }),
        apiFetch<Client[]>("/clients", { organizationId })
      ]);
      setCases(nextCases);
      setClients(nextClients);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить дела");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [workspace.organizationId, queryString]);

  async function createCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const legalCase = await apiFetch<LegalCase>("/cases", {
        method: "POST",
        organizationId: workspace.organizationId,
        body: JSON.stringify({
          title: form.get("title"),
          clientId: form.get("clientId"),
          caseNumber: form.get("caseNumber") || undefined,
          courtName: form.get("courtName") || undefined,
          status: "active",
          side: form.get("side")
        })
      });
      event.currentTarget.reset();
      setMessage("Дело создано");
      navigate(`/cases/${legalCase.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать дело");
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="Дела"
        description="Профессиональный реестр судебных и внесудебных проектов: номера, клиенты, суды, статусы и актуальность."
        action={<Badge tone="blue">{cases.length} записей</Badge>}
      />

      <Toast message={message} tone="success" onClose={() => setMessage("")} />
      <Toast message={error} tone="error" onClose={() => setError("")} />

      <Panel title="Создать дело" description="Быстро заведите карточку и перейдите к деталям дела.">
        <form className="grid gap-3 p-6 lg:grid-cols-[1.2fr_1fr_160px_1fr_190px_auto]" onSubmit={createCase}>
          <input name="title" required placeholder="Название дела" className="premium-input" />
          <select name="clientId" required className="premium-select">
            <option value="">Клиент</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.fullName}</option>
            ))}
          </select>
          <input name="caseNumber" placeholder="№ дела" className="premium-input" />
          <input name="courtName" placeholder="Суд" className="premium-input" />
          <select name="side" className="premium-select">
            <option value="plaintiff">Истец</option>
            <option value="defendant">Ответчик</option>
            <option value="third_party">Третье лицо</option>
            <option value="applicant">Заявитель</option>
          </select>
          <button className="premium-button-blue">
            <Plus size={18} /> Создать
          </button>
        </form>
      </Panel>

      <Panel title="Реестр дел" action={isLoading ? "Загрузка..." : `${cases.length} дел`}>
        <div className="grid gap-3 border-b border-slate-100 p-5 md:grid-cols-[1fr_240px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по делу, номеру, клиенту или суду"
              className="premium-input pl-11"
            />
          </label>
          <label className="relative block">
            <Filter className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "" | CaseStatus)} className="premium-select pl-11">
              <option value="">Все статусы</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        {isLoading ? <LoadingRows rows={5} columns={5} /> : cases.length === 0 ? (
          <EmptyState
            title="Дела не найдены"
            description="Если это новая база, создайте первое дело. Если вы применили фильтр, измените параметры поиска."
            actionLabel="Создать первое дело"
            onAction={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            icon={BriefcaseBusiness}
            tone="blue"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="premium-table min-w-[920px]">
              <thead>
                <tr>
                  <th>№ дела</th>
                  <th>Наименование</th>
                  <th>Клиент</th>
                  <th>Суд</th>
                  <th>Статус</th>
                  <th>Обновлено</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((item) => (
                  <tr key={item.id} className="premium-row">
                    <td className="font-semibold">
                      <Link className="text-blue-700 hover:text-blue-900" to={`/cases/${item.id}`}>{item.caseNumber ?? "б/н"}</Link>
                    </td>
                    <td>
                      <Link className="font-semibold text-slate-950 hover:text-blue-700" to={`/cases/${item.id}`}>{item.title}</Link>
                    </td>
                    <td className="text-slate-600">{item.client?.fullName ?? "Клиент не указан"}</td>
                    <td className="text-slate-600">{item.courtName ?? "Не указан"}</td>
                    <td><Badge tone={statusTone(item.status)}>{statusLabels[item.status]}</Badge></td>
                    <td className="text-slate-500">{formatDate(item.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
