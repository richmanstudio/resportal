import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Edit3, Filter, Plus, Search, Trash2, User, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { clientCreateSchema } from "@resportal/shared";
import { Panel } from "../components/Panel";
import { Badge, EmptyState, IconTile, LoadingRows, PageHeader } from "../components/Premium";
import { Toast } from "../components/Toast";
import { apiFetch } from "../lib/api";
import { useWorkspace } from "../lib/workspace";

type ClientType = "individual" | "legal_entity" | "entrepreneur";
type Client = {
  id: string;
  fullName: string;
  type: ClientType;
  phone?: string;
  email?: string;
  inn?: string;
  shortName?: string;
  address?: string;
  representativeName?: string;
  notes?: string;
};
type ClientFormInput = z.input<typeof clientCreateSchema>;

const clientTypeLabels: Record<ClientType, string> = {
  individual: "Физлицо",
  legal_entity: "Юрлицо",
  entrepreneur: "ИП"
};

const emptyClientValues: ClientFormInput = {
  fullName: "",
  type: "individual",
  inn: "",
  email: "",
  phone: "",
  shortName: "",
  address: "",
  representativeName: "",
  notes: ""
};

function normalizeClientValues(values: ClientFormInput) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, typeof value === "string" && value.trim() === "" ? undefined : value])
  );
}

export function ClientsPage() {
  const { workspace } = useWorkspace();
  const [clients, setClients] = useState<Client[]>([]);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | ClientType>("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ClientFormInput>({
    resolver: zodResolver(clientCreateSchema),
    defaultValues: emptyClientValues
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (typeFilter) params.set("type", typeFilter);
    const value = params.toString();
    return value ? `?${value}` : "";
  }, [search, typeFilter]);

  async function load() {
    setIsLoading(true);
    try {
      setClients(await apiFetch<Client[]>(`/clients${queryString}`, { organizationId: workspace.organizationId }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить клиентов");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [workspace.organizationId, queryString]);

  function startCreate() {
    setEditingClient(null);
    form.reset(emptyClientValues);
  }

  function startEdit(client: Client) {
    setEditingClient(client);
    form.reset({
      fullName: client.fullName,
      type: client.type,
      inn: client.inn ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      shortName: client.shortName ?? "",
      address: client.address ?? "",
      representativeName: client.representativeName ?? "",
      notes: client.notes ?? ""
    });
  }

  async function saveClient(values: ClientFormInput) {
    setError("");
    try {
      const payload = normalizeClientValues(values);
      if (editingClient) {
        await apiFetch(`/clients/${editingClient.id}`, {
          method: "PATCH",
          organizationId: workspace.organizationId,
          body: JSON.stringify(payload)
        });
        setMessage("Клиент обновлен");
      } else {
        await apiFetch("/clients", {
          method: "POST",
          organizationId: workspace.organizationId,
          body: JSON.stringify(payload)
        });
        setMessage("Клиент создан");
      }
      startCreate();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить клиента");
    }
  }

  async function deleteClient(client: Client) {
    if (!window.confirm(`Удалить клиента "${client.fullName}"?`)) return;
    setError("");
    try {
      await apiFetch(`/clients/${client.id}`, {
        method: "DELETE",
        organizationId: workspace.organizationId
      });
      if (editingClient?.id === client.id) startCreate();
      setMessage("Клиент удален");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить клиента");
    }
  }

  const individualCount = clients.filter((client) => client.type === "individual").length;
  const companyCount = clients.filter((client) => client.type !== "individual").length;

  return (
    <div className="space-y-7">
      <PageHeader
        title="Клиенты"
        description="Единая клиентская база для физических лиц, компаний, предпринимателей и связанных дел."
        action={<button className="premium-button-blue" onClick={startCreate}><Plus size={18} /> Новый клиент</button>}
      />

      <Toast message={message} tone="success" onClose={() => setMessage("")} />
      <Toast message={error} tone="error" onClose={() => setError("")} />

      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <Panel title={editingClient ? "Редактировать клиента" : "Новый клиент"} description="Форма ограничена по ширине, чтобы ее было удобно сканировать.">
          <form className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2" onSubmit={form.handleSubmit(saveClient)}>
            <label className="block md:col-span-2 xl:col-span-1 2xl:col-span-2">
              <span className="text-sm font-semibold text-slate-700">ФИО или название</span>
              <input className="premium-input mt-2" {...form.register("fullName")} />
              {form.formState.errors.fullName ? <span className="mt-1 block text-xs font-semibold text-red-600">{form.formState.errors.fullName.message}</span> : null}
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Тип</span>
              <select className="premium-select mt-2" {...form.register("type")}>
                <option value="individual">Физлицо</option>
                <option value="legal_entity">Юрлицо</option>
                <option value="entrepreneur">ИП</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">ИНН</span>
              <input className="premium-input mt-2" {...form.register("inn")} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Email</span>
              <input className="premium-input mt-2" {...form.register("email", { setValueAs: (value) => (value === "" ? undefined : value) })} />
              {form.formState.errors.email ? <span className="mt-1 block text-xs font-semibold text-red-600">{form.formState.errors.email.message}</span> : null}
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Телефон</span>
              <input className="premium-input mt-2" {...form.register("phone")} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Представитель</span>
              <input className="premium-input mt-2" {...form.register("representativeName")} />
            </label>
            <label className="block md:col-span-2 xl:col-span-1 2xl:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Адрес</span>
              <input className="premium-input mt-2" {...form.register("address")} />
            </label>
            <div className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-1 2xl:col-span-2">
              <button className="premium-button-blue">
                {editingClient ? <Edit3 size={18} /> : <Plus size={18} />}
                {editingClient ? "Сохранить" : "Создать"}
              </button>
              {editingClient ? (
                <button type="button" className="premium-button-ghost" onClick={startCreate}>
                  <X size={18} /> Отменить
                </button>
              ) : null}
            </div>
          </form>
        </Panel>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="premium-panel p-5">
              <div className="flex items-center gap-4">
                <IconTile icon={User} tone="violet" />
                <div>
                  <div className="text-sm font-semibold text-slate-500">Физлица</div>
                  <div className="mt-1 text-3xl font-semibold text-slate-950">{individualCount}</div>
                </div>
              </div>
            </div>
            <div className="premium-panel p-5">
              <div className="flex items-center gap-4">
                <IconTile icon={Building2} tone="blue" />
                <div>
                  <div className="text-sm font-semibold text-slate-500">Юрлица и ИП</div>
                  <div className="mt-1 text-3xl font-semibold text-slate-950">{companyCount}</div>
                </div>
              </div>
            </div>
          </div>

          <Panel title="Клиентская база" action={isLoading ? "Загрузка..." : `${clients.length} записей`}>
            <div className="grid gap-3 border-b border-slate-100 p-5 md:grid-cols-[1fr_220px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Поиск по имени, ИНН, email или телефону"
                  className="premium-input pl-11"
                />
              </label>
              <label className="relative block">
                <Filter className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as "" | ClientType)} className="premium-select pl-11">
                  <option value="">Все типы</option>
                  <option value="individual">Физлицо</option>
                  <option value="legal_entity">Юрлицо</option>
                  <option value="entrepreneur">ИП</option>
                </select>
              </label>
            </div>

            {isLoading ? <LoadingRows rows={4} columns={3} /> : clients.length === 0 ? (
              <EmptyState title="Клиенты не найдены" description="Добавьте первого клиента или измените фильтры, если база уже заполнена." icon={User} tone="violet" />
            ) : (
              <div className="grid gap-3 p-5 2xl:grid-cols-2">
                {clients.map((client) => (
                  <div key={client.id} className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lift">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-sm font-bold text-violet-700 ring-1 ring-violet-100">
                          {client.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-950">{client.fullName}</div>
                          <div className="mt-1 text-sm text-slate-500">{client.inn ? `ИНН ${client.inn}` : "ИНН не указан"}</div>
                        </div>
                      </div>
                      <Badge tone={client.type === "individual" ? "violet" : "blue"}>{clientTypeLabels[client.type]}</Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-500">{client.email ?? client.phone ?? "Контакты не указаны"}</span>
                      <div className="flex gap-2">
                        <button className="premium-button-ghost h-9 px-3" onClick={() => startEdit(client)}>
                          <Edit3 size={16} />
                        </button>
                        <button className="premium-button-ghost h-9 px-3 text-red-600 hover:text-red-700" onClick={() => void deleteClient(client)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
