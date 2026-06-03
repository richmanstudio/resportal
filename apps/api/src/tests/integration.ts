const baseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:4000/api";

type RequestOptions = RequestInit & { token?: string; organizationId?: string };

async function request<T>(path: string, options: RequestOptions = {}) {
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
      email: `integration+${suffix}@resportal.test`,
      password: "Password123",
      fullName: "Integration Owner",
      organizationName: "Integration Org"
    })
  });

  const token = registered.body.accessToken;
  const organizationId = registered.body.organization.id;
  assert(token && organizationId, "registration did not return token and organization");

  const secondOrg = await request<{ id: string }>("/organizations", {
    method: "POST",
    token,
    body: JSON.stringify({ name: "Second Org", type: "solo" })
  });
  assert(secondOrg.body.id, "second organization was not created");

  const client = await request<{ id: string; fullName: string }>("/clients", {
    method: "POST",
    token,
    organizationId,
    body: JSON.stringify({ type: "individual", fullName: "Tenant Client", inn: "1234567890" })
  });
  assert(client.body.id, "client was not created");

  const search = await request<Array<{ id: string }>>("/clients?search=Tenant&type=individual", {
    token,
    organizationId
  });
  assert(search.body.some((item) => item.id === client.body.id), "client search did not find created client");

  const isolated = await request<Array<{ id: string }>>("/clients?search=Tenant", {
    token,
    organizationId: secondOrg.body.id
  });
  assert(!isolated.body.some((item) => item.id === client.body.id), "client leaked across organizations");

  const mismatch = await fetch(`${baseUrl}/organizations/${secondOrg.body.id}/members`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-organization-id": organizationId
    }
  });
  assert(mismatch.status === 400, "organization route/header mismatch must be rejected");

  const invite = await request<{ temporaryPassword: string }>("/organizations/" + organizationId + "/invite", {
    method: "POST",
    token,
    organizationId,
    body: JSON.stringify({
      email: `viewer.integration+${suffix}@resportal.test`,
      fullName: "Integration Viewer",
      role: "viewer"
    })
  });

  const viewer = await request<{ accessToken: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: `viewer.integration+${suffix}@resportal.test`,
      password: invite.body.temporaryPassword
    })
  });

  const denied = await fetch(`${baseUrl}/clients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${viewer.body.accessToken}`,
      "x-organization-id": organizationId
    },
    body: JSON.stringify({ type: "individual", fullName: "Forbidden Client" })
  });
  assert(denied.status === 403, "viewer must be denied client creation");

  console.log("Integration tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

export {};
