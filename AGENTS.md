# AGENTS.md

1. Write code in TypeScript.
2. Do not use JavaScript unless there is a clear project reason.
3. Type all new entities and public contracts.
4. Do not leave TODO comments without a concrete reason.
5. After backend changes, run tests or at least `npm --workspace apps/api run build`.
6. After frontend changes, run `npm --workspace apps/web run build`.
7. Keep the existing project structure stable.
8. Document API endpoints in `docs/api.md`.
9. Validate all forms and API inputs with Zod.
10. Show user-facing errors in clear language.
11. Do not store secrets in code.
12. Add every required environment variable to `.env.example`.
13. Before adding a new library, make its purpose clear in the change.
14. Do not add AI features to the MVP.
15. Do not add court-system integrations to the MVP.
