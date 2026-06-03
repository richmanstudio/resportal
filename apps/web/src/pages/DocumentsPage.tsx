import { Download, FileText, Filter, Search, UploadCloud } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Panel } from "../components/Panel";
import { Badge, EmptyState, LoadingRows, PageHeader, formatDate } from "../components/Premium";
import { Toast } from "../components/Toast";
import { apiFetch, downloadDocument, fileToBase64 } from "../lib/api";
import { useWorkspace } from "../lib/workspace";

type LegalCase = { id: string; title: string; caseNumber?: string };
type DocumentType = "claim" | "response" | "motion" | "appeal" | "cassation" | "court_act" | "evidence" | "contract" | "other";
type DocumentStatus = "draft" | "ready" | "signed" | "sent" | "active";
type DocumentItem = {
  id: string;
  title: string;
  type: DocumentType;
  originalFileName: string;
  size: number;
  createdAt: string;
  status: DocumentStatus;
  description?: string;
  case?: LegalCase;
  uploadedBy?: { id: string; fullName: string; email: string };
};

const documentTypeLabels: Record<DocumentType, string> = {
  claim: "Иск",
  response: "Отзыв",
  motion: "Ходатайство",
  appeal: "Апелляция",
  cassation: "Кассация",
  court_act: "Судебный акт",
  evidence: "Доказательство",
  contract: "Договор",
  other: "Другое"
};

const documentStatusLabels: Record<DocumentStatus, string> = {
  draft: "Черновик",
  ready: "Готов",
  signed: "Подписан",
  sent: "Отправлен",
  active: "Готов"
};

function formatSize(size: number) {
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} КБ`;
  return `${(size / 1024 / 1024).toFixed(1)} МБ`;
}

function statusTone(status: DocumentStatus) {
  if (status === "draft") return "slate" as const;
  if (status === "signed") return "green" as const;
  if (status === "sent") return "blue" as const;
  return "orange" as const;
}

export function DocumentsPage() {
  const { workspace } = useWorkspace();
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | DocumentType>("");
  const [statusFilter, setStatusFilter] = useState<"" | DocumentStatus>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  async function load() {
    setIsLoading(true);
    try {
      const organizationId = workspace.organizationId;
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      const query = params.toString();
      const [nextCases, nextDocuments] = await Promise.all([
        apiFetch<LegalCase[]>("/cases", { organizationId }),
        apiFetch<DocumentItem[]>(`/documents${query ? `?${query}` : ""}`, { organizationId })
      ]);
      setCases(nextCases);
      setDocuments(nextDocuments);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить документы");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load();
    }, search.trim() ? 220 : 0);

    return () => window.clearTimeout(timeout);
  }, [workspace.organizationId, search, typeFilter, statusFilter]);

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsUploading(true);
    const form = new FormData(event.currentTarget);
    const file = form.get("file");

    try {
      if (!(file instanceof File) || !file.name) {
        throw new Error("Выберите файл для загрузки");
      }

      await apiFetch("/documents/upload", {
        method: "POST",
        organizationId: workspace.organizationId,
        body: JSON.stringify({
          title: form.get("title"),
          caseId: form.get("caseId") || undefined,
          type: form.get("type"),
          originalFileName: file.name,
          mimeType: file.type || "application/octet-stream",
          contentBase64: await fileToBase64(file),
          description: form.get("description") || undefined
        })
      });

      event.currentTarget.reset();
      setMessage("Документ загружен");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить документ");
    } finally {
      setIsUploading(false);
    }
  }

  async function updateDocumentStatus(document: DocumentItem, status: DocumentStatus) {
    setError("");
    try {
      await apiFetch(`/documents/${document.id}`, {
        method: "PATCH",
        organizationId: workspace.organizationId,
        body: JSON.stringify({ status })
      });
      setMessage("Статус документа обновлен");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обновить статус документа");
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="Документы"
        description="Отдельный архив документов с типами, привязкой к делу, датами и рабочими статусами."
        action={<Badge tone="blue">{documents.length} файлов</Badge>}
      />
      <Toast message={message} tone="success" onClose={() => setMessage("")} />
      <Toast message={error} tone="error" onClose={() => setError("")} />

      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <Panel title="Загрузить документ" description="Файл сохранится в хранилище организации и появится в общем архиве.">
          <form className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2" onSubmit={uploadDocument}>
            <input required name="title" placeholder="Название документа" className="premium-input md:col-span-2 xl:col-span-1 2xl:col-span-2" />
            <select name="type" className="premium-select">
              {Object.entries(documentTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select name="caseId" className="premium-select">
              <option value="">Без привязки к делу</option>
              {cases.map((item) => <option key={item.id} value={item.id}>{item.caseNumber ?? item.title}</option>)}
            </select>
            <input required name="file" type="file" className="premium-input file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700 md:col-span-2 xl:col-span-1 2xl:col-span-2" />
            <input name="description" placeholder="Комментарий" className="premium-input md:col-span-2 xl:col-span-1 2xl:col-span-2" />
            <button className="premium-button-blue md:col-span-2 xl:col-span-1 2xl:col-span-2" disabled={isUploading}>
              <UploadCloud size={18} />
              {isUploading ? "Загружаем..." : "Загрузить документ"}
            </button>
          </form>
        </Panel>

        <Panel title="Список документов" action={isLoading ? "Загрузка..." : `${documents.length} документов`}>
          <div className="grid gap-3 border-b border-slate-100 p-5 md:grid-cols-[1fr_190px_190px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по документу, делу или файлу" className="premium-input pl-11" />
            </label>
            <label className="relative block">
              <Filter className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as "" | DocumentType)} className="premium-select pl-11">
                <option value="">Все типы</option>
                {Object.entries(documentTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "" | DocumentStatus)} className="premium-select">
              <option value="">Все статусы</option>
              {Object.entries(documentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          {isLoading ? <LoadingRows rows={5} columns={3} /> : documents.length === 0 ? (
            <EmptyState
              title="Документы пока не загружены"
              description="Загрузите первый файл: договор, иск, судебный акт, доказательство или ходатайство."
              icon={FileText}
              tone="blue"
            />
          ) : (
            <div className="space-y-3 p-5">
              {documents.map((document) => {
                const status = document.status;
                return (
                  <div key={document.id} className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lift">
                    <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-950">{document.title}</div>
                          <div className="mt-1 text-xs font-medium text-slate-500">
                            {document.originalFileName} · {formatSize(document.size)} · {document.uploadedBy?.fullName ?? "Автор не указан"}
                          </div>
                          <div className="mt-2 text-sm font-medium text-slate-500">{document.case?.caseNumber ?? document.case?.title ?? "Без дела"}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 2xl:justify-end">
                        <Badge tone="blue">{documentTypeLabels[document.type]}</Badge>
                        <Badge tone={statusTone(status)}>{documentStatusLabels[status]}</Badge>
                        <Badge tone="slate">{formatDate(document.createdAt)}</Badge>
                        <select
                          value={status}
                          onChange={(event) => void updateDocumentStatus(document, event.target.value as DocumentStatus)}
                          className="h-9 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
                        >
                          {Object.entries(documentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        <button className="premium-button-ghost h-9 px-3" onClick={() => void downloadDocument(document.id, document.originalFileName, workspace.organizationId)}>
                          <Download size={16} />
                        </button>
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
