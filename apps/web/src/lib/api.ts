const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:4000/api";

export type Membership = {
  role: "owner" | "admin" | "lawyer" | "assistant" | "viewer";
  organization: {
    id: string;
    name: string;
    tariffPlan: "solo" | "team" | "firm";
    tariffStatus?: "trial" | "active" | "past_due" | "cancelled";
    tariffCurrentPeriodEnd?: string;
  };
};

export type Workspace = {
  user: { id: string; email: string; fullName: string; avatarUrl?: string | null };
  membership: Membership;
  memberships: Membership[];
  organizationId: string;
};

export function getToken() {
  return localStorage.getItem("resportal.accessToken");
}

export function setSession(accessToken: string, organizationId?: string) {
  localStorage.setItem("resportal.accessToken", accessToken);
  if (organizationId) localStorage.setItem("resportal.organizationId", organizationId);
}

export function clearSession() {
  localStorage.removeItem("resportal.accessToken");
  localStorage.removeItem("resportal.organizationId");
}

async function refreshAccessToken() {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include"
  });

  if (!response.ok) {
    clearSession();
    return null;
  }

  const data = (await response.json()) as { accessToken: string };
  setSession(data.accessToken);
  return data.accessToken;
}

export async function apiFetch<T>(path: string, options: RequestInit & { organizationId?: string } = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.organizationId) headers.set("x-organization-id", options.organizationId);

  let response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include"
  });

  if (response.status === 401 && path !== "/auth/refresh") {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      headers.set("Authorization", `Bearer ${nextToken}`);
      response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
        credentials: "include"
      });
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: "Ошибка запроса" }));
    throw new Error(body.message ?? "Ошибка запроса");
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function loadWorkspace(): Promise<Workspace> {
  const data = await apiFetch<{ user: Workspace["user"]; memberships: Membership[] }>("/auth/me");
  const storedOrganizationId = localStorage.getItem("resportal.organizationId");
  const membership = data.memberships.find((item) => item.organization.id === storedOrganizationId) ?? data.memberships[0];

  if (!membership) throw new Error("Нет доступной организации");
  localStorage.setItem("resportal.organizationId", membership.organization.id);

  return {
    user: data.user,
    membership,
    memberships: data.memberships,
    organizationId: membership.organization.id
  };
}

export async function fileToBase64(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  return dataUrl.split(",")[1] ?? "";
}

export async function downloadDocument(documentId: string, fileName: string, organizationId: string) {
  const token = getToken();
  const response = await fetch(`${API_URL}/documents/${documentId}/download`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-organization-id": organizationId
    }
  });

  if (!response.ok) throw new Error("Не удалось скачать документ");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
