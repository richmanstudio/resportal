import "./types";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./lib/config";
import { errorHandler } from "./lib/http";
import { authRouter } from "./modules/auth/auth.routes";
import { auditRouter } from "./modules/audit/audit.routes";
import { billingRouter } from "./modules/billing/billing.routes";
import { billingWebhookRouter } from "./modules/billing/webhook.routes";
import { casePartiesRouter } from "./modules/case-parties/case-parties.routes";
import { casesRouter } from "./modules/cases/cases.routes";
import { clientsRouter } from "./modules/clients/clients.routes";
import { deadlinesRouter } from "./modules/deadlines/deadlines.routes";
import { documentsRouter } from "./modules/documents/documents.routes";
import { eventsRouter } from "./modules/events/events.routes";
import { organizationsRouter } from "./modules/organizations/organizations.routes";
import { onboardingRouter } from "./modules/onboarding/onboarding.routes";
import { searchRouter } from "./modules/search/search.routes";
import { tasksRouter } from "./modules/tasks/tasks.routes";
import { rateLimit } from "./middleware/rate-limit";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.webOrigin,
      credentials: true
    })
  );
  app.use(express.json({ limit: "8mb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "resportal-api" });
  });

  app.use("/api/auth", rateLimit({ windowMs: 60_000, max: 30 }), authRouter);
  app.use("/api/webhooks", billingWebhookRouter);
  app.use("/api/organizations", organizationsRouter);
  app.use("/api/onboarding", onboardingRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/audit-logs", auditRouter);
  app.use("/api/billing", billingRouter);
  app.use("/api/clients", clientsRouter);
  app.use("/api/cases", casesRouter);
  app.use("/api/case-parties", casePartiesRouter);
  app.use("/api/deadlines", deadlinesRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/events", eventsRouter);
  app.use("/api/documents", documentsRouter);
  app.use(errorHandler);

  return app;
}
