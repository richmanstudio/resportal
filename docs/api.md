# API

Base URL: `http://localhost:4000/api`

Errors use a stable envelope and keep the top-level `message` field for client compatibility:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {}
  },
  "message": "Validation failed"
}
```

## Auth

- `POST /auth/register` creates a user, default organization and returns tokens.
- `POST /auth/login` returns tokens for an existing user.
- `POST /auth/refresh` rotates an access token from the refresh cookie or body token.
- `POST /auth/password-reset/request` accepts `{ "email": "user@example.com" }` and returns a neutral accepted response.
- `POST /auth/password-reset/confirm` accepts `{ "token": "...", "password": "new-password" }`, consumes a reset token and updates the password.
- `POST /auth/email-verification/request` accepts an optional email and returns a neutral accepted response.
- `POST /auth/email-verification/confirm` accepts `{ "token": "..." }`, consumes a verification token and marks the user email as verified.
- `POST /auth/invites/accept` accepts `{ "token": "...", "password": "optional-for-new-users" }`, accepts an organization invite and returns tokens.
- `POST /auth/logout` clears the refresh cookie.
- `GET /auth/me` returns the authenticated user and memberships.
- `PATCH /auth/me` updates the authenticated user's profile. Body supports `{ "fullName": "Name" }` and avatar upload via `{ "avatarBase64": "...", "avatarMimeType": "image/png" }` for PNG/JPEG/WebP images.

## Onboarding

- `GET /onboarding/summary` returns counts, `demoDataCreated`, and completion flags for first-run setup: clients, cases, deadlines, tasks, documents and events.
- `POST /onboarding/demo-data` creates a demo client, case, deadline, task, calendar event and optional demo document. Body: `{ "includeDocuments": true }`. Demo data can be created only once per organization; repeated requests return `409`.

## Global Search

- `GET /search?q=<text>` searches cases, clients and documents in the active organization.

## Organizations

- `GET /organizations` returns organizations available to the current user.
- `POST /organizations` creates a new organization owned by the current user.
- `GET /organizations/:organizationId/members` returns members for the active organization. `:organizationId` must match `x-organization-id`.
- `POST /organizations/:organizationId/invite` accepts `{ "email": "user@example.com", "fullName": "User Name", "role": "lawyer" }`, verifies that a registered active user with the same email and full name exists, and immediately adds that user to the organization. `:organizationId` must match `x-organization-id`.
- `PATCH /organizations/:organizationId/members/:memberId` updates a member role/status. Owners cannot be changed.
- `DELETE /organizations/:organizationId/members/:memberId` removes a member from the organization. Owners cannot be removed.

## Clients

Requires `Authorization: Bearer <token>` and `x-organization-id`.

- `GET /clients`
- `GET /clients?search=<text>&type=<individual|legal_entity|entrepreneur>`
- `POST /clients`
- `GET /clients/:id` returns the full client card, including linked cases and documents.
- `PATCH /clients/:id`
- `DELETE /clients/:id`

## Cases

Requires `Authorization: Bearer <token>` and `x-organization-id`.

- `GET /cases`
- `GET /cases?search=<text>&status=<draft|active|suspended|finished|archived>`
- `POST /cases`
- `GET /cases/:id`
- `PATCH /cases/:id`
- `DELETE /cases/:id`

## Case Parties

- `GET /case-parties/case/:caseId`
- `POST /case-parties/case/:caseId`
- `PATCH /case-parties/:id`
- `DELETE /case-parties/:id`

## Deadlines

- `GET /deadlines`
- `GET /deadlines?due=<overdue|today|week>&status=<active|completed|overdue|cancelled>&caseId=<uuid>`
- `POST /deadlines`
- `PATCH /deadlines/:id`
- `PATCH /deadlines/:id/complete`
- `POST /deadlines/reminders/send` sends email reminders for upcoming active/overdue deadlines. Body supports `{ "daysBefore": [0, 1, 3, 7] }`. Requires admin-level access.

## Tasks

- `GET /tasks`
- `GET /tasks?due=<overdue|today|week>&status=<todo|in_progress|review|done|cancelled>&caseId=<uuid>`
- `POST /tasks`
- `PATCH /tasks/:id`
- `PATCH /tasks/:id/complete`

## Calendar Events

- `GET /events`
- `POST /events`

## Documents

- `GET /documents`
- `GET /documents?search=<text>&type=<documentType>&status=<draft|ready|signed|sent|active>&caseId=<uuid>`
- `POST /documents/upload` accepts JSON with `contentBase64`.
- `POST /documents/generate` creates a DOCX from a system template.
- `PATCH /documents/:id` updates document metadata/status. Supported statuses: `draft`, `ready`, `signed`, `sent`. `active` is supported as a legacy status.
- `GET /documents/:id/download` downloads the stored file.
- `DELETE /documents/:id` deletes document metadata and the stored file. Requires admin-level access.

## Billing

- `GET /billing/plans` returns Free, Solo, Team and Firm plan cards in RUB, including limits, feature lists and the `recommended` marker for Team.
- `GET /billing/subscription` returns the current organization tariff and limits.
- `POST /billing/checkout` creates a YooKassa payment and returns a hosted payment URL.
- `POST /billing/portal` is intentionally not enabled until recurring YooKassa payments are added.
- `POST /webhooks/yookassa` accepts YooKassa `payment.succeeded` notifications and activates the paid plan for 30 days.

Frontend purchase flow:

- `/settings` shows plan cards. Paid plan buttons open `/settings/billing/:plan` first.
- `/settings/billing/:plan` shows detailed plan information and creates the YooKassa payment only after the second confirmation button.
- YooKassa must redirect users back to `BILLING_RETURN_URL`.

YooKassa setup:

- Required environment variables: `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`, `BILLING_RETURN_URL`.
- YooKassa Basic Auth requires both the shop identifier and the secret key. `YOOKASSA_SECRET_KEY` alone is not enough for live API requests.
- YooKassa HTTP notifications must be configured in the merchant cabinet for `payment.succeeded`.
- Production notification URL: `https://респортал.рф/api/webhooks/yookassa` (`https://xn--80ajtkeedfm.xn--p1ai/api/webhooks/yookassa`).
- Production return URL: `https://респортал.рф/settings?billing=return` (`https://xn--80ajtkeedfm.xn--p1ai/settings?billing=return`).
- Payment activation is verified by fetching the payment from YooKassa by payment id and reading trusted payment metadata.

## Members And Roles

Role rules:

- `viewer`: read-only access.
- `assistant`: can create clients, parties, documents, deadlines, tasks and events.
- `lawyer`: can create and update cases and generate DOCX.
- `admin` and `owner`: can invite members and perform destructive operations.

## Audit Log

- `GET /audit-logs?limit=<1..100>&entityType=<type>&entityId=<id>` returns recent audit events for owners/admins.

The API records important actions in `AuditLog`:

- `auth.register`
- `auth.login`
- `organization.create`
- `organization.member.invite`
- `organization.member.update`
- `organization.member.delete`
- `client.create`
- `client.update`
- `client.delete`
- `case.create`
- `case.update`
- `case.archive`
- `case_party.create`
- `case_party.update`
- `case_party.delete`
- `deadline.create`
- `deadline.update`
- `deadline.complete`
- `task.create`
- `task.update`
- `task.complete`
- `document.upload`
- `document.update`
- `document.download`
- `document.generate`
- `auth.password_reset.request`
- `auth.email_verification.request`
- `user.profile.update`
- `onboarding.demo_data.create`
- `billing.checkout.create`
- `billing.webhook.received`
- `billing.subscription.activate`
