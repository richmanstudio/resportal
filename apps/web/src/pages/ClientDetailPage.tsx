import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, BriefcaseBusiness, Building2, FileText, IdCard, Mail, MapPin, Phone, Save, ShieldCheck, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";
import { clientCreateSchema } from "@resportal/shared";
import { Panel } from "../components/Panel";
import { Badge, EmptyState, IconTile, InlineLoading, PageHeader, formatDate } from "../components/Premium";
import { Toast } from "../components/Toast";
import { apiFetch } from "../lib/api";
import { useWorkspace } from "../lib/workspace";

type ClientType = "individual" | "legal_entity" | "entrepreneur";
type ClientCase = {
  id: string;
  title: string;
  caseNumber?: string;
  courtName?: string;
  status: string;
  updatedAt: string;
};
type ClientDocument = {
  id: string;
  title: string;
  type: string;
  status: string;
  originalFileName: string;
  size: number;
  createdAt: string;
  case?: { id: string; title: string; caseNumber?: string };
};
type ClientDetail = {
  id: string;
  type: ClientType;
  fullName: string;
  shortName?: string;
  inn?: string;
  ogrn?: string;
  kpp?: string;
  passportData?: string;
  address?: string;
  phone?: string;
  email?: string;
  representativeName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  cases: ClientCase[];
  documents: ClientDocument[];
};
type ClientFormInput = z.input<typeof clientCreateSchema>;

const clientTypeLabels: Record<ClientType, string> = {
  individual: "Физлицо",
  legal_entity: "Юрлицо",
  entrepreneur: "ИП"
};

function normalizeClientValues(values: ClientFormInput) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, typeof value === "string" && value.trim() === "" ? undefined : value])
  );
}

function clientInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatSize(size: number) {
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} КБ`;
  return `${(size / 1024 / 1024).toFixed(1)} МБ`;
}

export function ClientDetailPage() {
  const { id } = useParams();
  const { workspace } = useWorkspace();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<ClientFormInput>({
    resolver: zodResolver(clientCreateSchema),
    defaultValues: {
      type: "individual",
      fullName: "",
      shortName: "",
      inn: "",
      ogrn: "",
      kpp: "",
      passportData: "",
      address: "",
      phone: "",
      email: "",
      representativeName: "",
      notes: ""
    }
  });

  async function load() {
    if (!id) return;
    setIsLoading(true);
    try {
      const next = await apiFetch<ClientDetail>(`/clients/${id}`, { organizationId: workspace.organizationId });
      setClient(next);
      form.reset({
        type: next.type,
        fullName: next.fullName,
        shortName: next.shortName ?? "",
        inn: next.inn ?? "",
        ogrn: next.ogrn ?? "",
        kpp: next.kpp ?? "",
        passportData: next.passportData ?? "",
        address: next.address ?? "",
        phone: next.phone ?? "",
        email: next.email ?? "",
        representativeName: next.representativeName ?? "",
        notes: next.notes ?? ""
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить клиента");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id, workspace.organizationId]);

  async function save(values: ClientFormInput) {
    if (!id) return;
    setError("");
    try {
      const updated = await apiFetch<ClientDetail>(`/clients/${id}`, {
        method: "PATCH",
        organizationId: workspace.organizationId,
        body: JSON.stringify(normalizeClientValues(values))
      });
      setClient((current) => current ? { ...current, ...updated } : updated);
      setMessage("Карточка клиента обновлена");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить клиента");
    }
  }

  const type = form.watch("type");
  const isPerson = type === "individual";
  const summary = useMemo(() => {
    if (!client) return [];
    return [
      { label: "Дела", value: client.cases.length, icon: BriefcaseBusiness, tone: "blue" as const },
      { label: "Документы", value: client.documents.length, icon: FileText, tone: "green" as const },
      { label: "Тип", value: clientTypeLabels[client.type], icon: client.type === "individual" ? UserRound : Building2, tone: "violet" as const }
    ];
  }, [client]);

  if (isLoading && !client) {
    return <div className="flex min-h-[420px] items-center justify-center"><InlineLoading label="Загружаем карточку клиента" /></div>;
  }

  if (!client) {
    return (
      <div className="space-y-6">
        <Link to="/clients" className="premium-button-ghost w-fit"><ArrowLeft size={18} /> К клиентам</Link>
        <EmptyState title="Клиент не найден" description="Карточка недоступна или была удалена." icon={UserRound} tone="red" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <Toast message={message} tone="success" onClose={() => setMessage("")} />
      <Toast message={error} tone="error" onClose={() => setError("")} />

      <Link to="/clients" className="premium-button-ghost w-fit"><ArrowLeft size={18} /> К клиентской базе</Link>

      <section className="overflow-hidden rounded-[28px] bg-slate-950 text-white shadow-[0_28px_90px_rgba(15,23,42,0.24)]">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="flex items-start gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[26px] bg-white/10 text-xl font-bold ring-1 ring-white/12">
              {clientInitials(client.fullName)}
            </div>
            <div>
              <Badge tone={client.type === "individual" ? "violet" : "blue"}>{clientTypeLabels[client.type]}</Badge>
              <h1 className="mt-4 text-[34px] font-semibold leading-tight tracking-normal md:text-[44px]">{client.fullName}</h1>
              <div className="mt-3 flex flex-wrap gap-3 text-sm font-medium text-slate-300">
                <span>{client.inn ? `ИНН ${client.inn}` : "ИНН не указан"}</span>
                <span>{client.email ?? "email не указан"}</span>
                <span>{client.phone ?? "телефон не указан"}</span>
              </div>
            </div>
          </div>
          <div className="rounded-[22px] bg-white/8 px-5 py-4 text-sm leading-6 text-slate-200 ring-1 ring-white/10">
            Обновлено: {formatDate(client.updatedAt)}
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {summary.map((item) => (
          <div key={item.label} className="premium-panel p-5">
            <div className="flex items-center gap-4">
              <IconTile icon={item.icon} tone={item.tone} />
              <div>
                <div className="text-sm font-semibold text-slate-500">{item.label}</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{item.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Panel title="Детальная информация" description="Заполняйте карточку так, чтобы по клиенту хватало данных для дел, документов и связи.">
          <form className="grid gap-4 p-6 md:grid-cols-2" onSubmit={form.handleSubmit(save)}>
            <Field label={isPerson ? "ФИО" : "Полное наименование"} error={form.formState.errors.fullName?.message}>
              <input className="premium-input" {...form.register("fullName")} />
            </Field>
            <Field label="Тип клиента">
              <select className="premium-select" {...form.register("type")}>
                <option value="individual">Физлицо</option>
                <option value="legal_entity">Юрлицо</option>
                <option value="entrepreneur">ИП</option>
              </select>
            </Field>
            {!isPerson ? (
              <Field label="Краткое название">
                <input className="premium-input" {...form.register("shortName")} />
              </Field>
            ) : null}
            <Field label="ИНН">
              <input className="premium-input" {...form.register("inn")} />
            </Field>
            {!isPerson ? (
              <>
                <Field label="ОГРН / ОГРНИП">
                  <input className="premium-input" {...form.register("ogrn")} />
                </Field>
                <Field label="КПП">
                  <input className="premium-input" {...form.register("kpp")} />
                </Field>
              </>
            ) : (
              <Field label="Паспортные данные">
                <input className="premium-input" {...form.register("passportData")} />
              </Field>
            )}
            <Field label="Email" error={form.formState.errors.email?.message}>
              <input className="premium-input" type="email" {...form.register("email", { setValueAs: (value) => (value === "" ? undefined : value) })} />
            </Field>
            <Field label="Телефон">
              <input className="premium-input" {...form.register("phone")} />
            </Field>
            <Field label="Представитель">
              <input className="premium-input" {...form.register("representativeName")} />
            </Field>
            <Field label="Адрес">
              <input className="premium-input" {...form.register("address")} />
            </Field>
            <label className="block md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Заметки по клиенту</span>
              <textarea className="premium-input mt-2 min-h-32 resize-y leading-6" {...form.register("notes")} />
            </label>
            <div className="md:col-span-2">
              <button className="premium-button-blue" disabled={form.formState.isSubmitting}>
                <Save size={18} />
                {form.formState.isSubmitting ? "Сохраняем..." : "Сохранить карточку"}
              </button>
            </div>
          </form>
        </Panel>

        <div className="space-y-6">
          <Panel title="Контакты и реквизиты">
            <div className="grid gap-3 p-5">
              <InfoRow icon={Mail} label="Email" value={client.email ?? "Не указан"} />
              <InfoRow icon={Phone} label="Телефон" value={client.phone ?? "Не указан"} />
              <InfoRow icon={MapPin} label="Адрес" value={client.address ?? "Не указан"} />
              <InfoRow icon={IdCard} label={isPerson ? "Паспорт" : "ОГРН / КПП"} value={isPerson ? client.passportData ?? "Не указано" : [client.ogrn, client.kpp].filter(Boolean).join(" / ") || "Не указано"} />
              <InfoRow icon={ShieldCheck} label="Представитель" value={client.representativeName ?? "Не указан"} />
            </div>
          </Panel>

          <Panel title="Связанные документы" action={`${client.documents.length}`}>
            {client.documents.length === 0 ? (
              <EmptyState title="Документов нет" description="Загрузите документы и привяжите их к клиенту или делу." icon={FileText} tone="green" />
            ) : (
              <div className="divide-y divide-slate-100">
                {client.documents.slice(0, 6).map((document) => (
                  <div key={document.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950">{document.title}</div>
                        <div className="mt-1 text-sm text-slate-500">{document.originalFileName} · {formatSize(document.size)}</div>
                        <div className="mt-1 text-xs font-medium text-slate-400">{document.case?.caseNumber ?? document.case?.title ?? "Без дела"}</div>
                      </div>
                      <Badge tone="slate">{document.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      <Panel title="Связанные дела" action={`${client.cases.length}`}>
        {client.cases.length === 0 ? (
          <EmptyState title="Дел пока нет" description="Создайте дело и выберите этого клиента, чтобы оно появилось в карточке." icon={BriefcaseBusiness} tone="blue" />
        ) : (
          <div className="overflow-x-auto">
            <table className="premium-table min-w-[760px]">
              <thead>
                <tr>
                  <th>№ дела</th>
                  <th>Название</th>
                  <th>Суд</th>
                  <th>Статус</th>
                  <th>Обновлено</th>
                </tr>
              </thead>
              <tbody>
                {client.cases.map((legalCase) => (
                  <tr key={legalCase.id} className="premium-row">
                    <td className="font-semibold text-blue-700"><Link to={`/cases/${legalCase.id}`}>{legalCase.caseNumber ?? "б/н"}</Link></td>
                    <td className="font-semibold text-slate-950"><Link to={`/cases/${legalCase.id}`}>{legalCase.title}</Link></td>
                    <td className="text-slate-600">{legalCase.courtName ?? "Не указан"}</td>
                    <td><Badge tone={legalCase.status === "finished" ? "green" : "blue"}>{legalCase.status}</Badge></td>
                    <td className="text-slate-500">{formatDate(legalCase.updatedAt)}</td>
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

function Field(props: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{props.label}</span>
      <span className="mt-2 block">{props.children}</span>
      {props.error ? <span className="mt-1 block text-xs font-semibold text-red-600">{props.error}</span> : null}
    </label>
  );
}

function InfoRow(props: { icon: LucideIcon; label: string; value: string }) {
  const Icon = props.icon;
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{props.label}</div>
        <div className="mt-1 break-words text-sm font-semibold text-slate-800">{props.value}</div>
      </div>
    </div>
  );
}
