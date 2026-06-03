# Database

The Prisma schema lives in `apps/api/prisma/schema.prisma`.

The first schema covers:

- User
- Organization
- OrganizationMember
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
