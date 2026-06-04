# Database

The Prisma schema lives in `apps/api/prisma/schema.prisma`.

The first schema covers:

- User
- Organization
- OrganizationMember
- OrganizationInvite
- AuthToken
- Client
- LegalCase
- CaseParty
- CaseDocument
- CaseEvent
- Deadline
- Task
- DocumentTemplate
- GeneratedDocument
- PaymentRecord
- AuditLog

Run migrations:

```bash
npm run prisma:migrate
```

## Document Storage And Backups

Development storage uses the local `storage/<organizationId>` directory created by the API process. Production should use the S3/MinIO variables from `.env.example` and keep object backups separate from PostgreSQL backups.

Minimum production policy before public launch:

- run PostgreSQL daily backups and keep at least 7 daily restore points;
- run object storage backups for the document bucket on the same schedule;
- test restoring one database backup and one document object before taking paid users;
- keep document deletion auditable through `AuditLog`;
- keep `DOCUMENT_MAX_UPLOAD_MB` aligned with the paid storage limits.
