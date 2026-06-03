const baseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:4000/api";

type JsonRecord = Record<string, unknown>;

async function request<T>(path: string, options: RequestInit & { token?: string; organizationId?: string } = {}) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
  if (options.organizationId) headers.set("x-organization-id", options.organizationId);

  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const text = await response.text();
  const body = text ? (JSON.parse(text) as T) : (undefined as T);

  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} failed: ${response.status} ${text}`);
  }

  return { response, body };
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

async function main() {
  const suffix = crypto.randomUUID().slice(0, 8);
  const registered = await request<{ accessToken: string; organization: { id: string } }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: `smoke+${suffix}@resportal.test`,
      password: "Password123",
      fullName: "Smoke User",
      organizationName: "Smoke Org"
    })
  });

  const token = registered.body.accessToken;
  const organizationId = registered.body.organization.id;
  assert(token && organizationId, "registration did not return token and organization");

  const client = await request<{ id: string }>("/clients", {
    method: "POST",
    token,
    organizationId,
    body: JSON.stringify({ type: "individual", fullName: "Smoke Client" })
  });

  const legalCase = await request<{ id: string }>("/cases", {
    method: "POST",
    token,
    organizationId,
    body: JSON.stringify({
      clientId: client.body.id,
      title: "Smoke Case",
      caseNumber: "SMOKE-1",
      status: "active",
      side: "plaintiff"
    })
  });

  await request("/case-parties/case/" + legalCase.body.id, {
    method: "POST",
    token,
    organizationId,
    body: JSON.stringify({ type: "defendant", name: "Smoke Defendant" })
  });

  await request("/deadlines", {
    method: "POST",
    token,
    organizationId,
    body: JSON.stringify({ caseId: legalCase.body.id, title: "Smoke Deadline", deadlineAt: new Date(Date.now() + 86400000).toISOString() })
  });

  await request("/tasks", {
    method: "POST",
    token,
    organizationId,
    body: JSON.stringify({ caseId: legalCase.body.id, title: "Smoke Task", dueAt: new Date(Date.now() + 86400000).toISOString() })
  });

  await request("/events", {
    method: "POST",
    token,
    organizationId,
    body: JSON.stringify({ caseId: legalCase.body.id, title: "Smoke Hearing", type: "hearing", startAt: new Date(Date.now() + 86400000).toISOString() })
  });

  const uploaded = await request<{ id: string }>("/documents/upload", {
    method: "POST",
    token,
    organizationId,
    body: JSON.stringify({
      caseId: legalCase.body.id,
      title: "Smoke Upload",
      type: "evidence",
      originalFileName: "smoke.txt",
      mimeType: "text/plain",
      contentBase64: Buffer.from("smoke").toString("base64")
    })
  });
  assert(uploaded.body.id, "document upload failed");

  const generated = await request<{ document: { id: string } }>("/documents/generate", {
    method: "POST",
    token,
    organizationId,
    body: JSON.stringify({ caseId: legalCase.body.id, templateType: "attach_documents", title: "Smoke DOCX", inputData: { body: "Smoke body" } })
  });
  assert(generated.body.document.id, "DOCX generation failed");

  const viewerEmail = `viewer+${suffix}@resportal.test`;
  const invite = await request<{ temporaryPassword: string }>("/organizations/" + organizationId + "/invite", {
    method: "POST",
    token,
    organizationId,
    body: JSON.stringify({ email: viewerEmail, fullName: "Smoke Viewer", role: "viewer" })
  });

  const viewer = await request<{ accessToken: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: viewerEmail, password: invite.body.temporaryPassword })
  });

  const denied = await fetch(`${baseUrl}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${viewer.body.accessToken}`,
      "x-organization-id": organizationId
    },
    body: JSON.stringify({ title: "Forbidden task" })
  });
  assert(denied.status === 403, "viewer must be denied write access");

  const plans = await request<JsonRecord[]>("/billing/plans", { token, organizationId });
  assert(plans.body.length === 3, "billing plans were not returned");

  console.log("Smoke test passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

export {};
