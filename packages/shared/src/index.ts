import { z } from "zod";

export const emailSchema = z.string().email().max(255);
export const passwordSchema = z.string().min(8).max(128);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().min(2).max(160),
  organizationName: z.string().min(2).max(180)
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1)
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema
});

export const passwordResetSchema = z.object({
  token: z.string().min(16).max(512),
  password: passwordSchema
});

export const emailVerificationRequestSchema = z.object({
  email: emailSchema.optional()
});

export const emailVerificationSchema = z.object({
  token: z.string().min(16).max(512)
});

export const inviteAcceptSchema = z.object({
  token: z.string().min(16).max(512),
  password: passwordSchema.optional()
});

export const userProfileUpdateSchema = z.object({
  fullName: z.string().min(2).max(160).optional(),
  avatarUrl: z.string().url().max(1000).optional().or(z.literal("")),
  avatarBase64: z.string().max(1_400_000).optional().or(z.literal("")),
  avatarMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional()
}).refine((input) => !input.avatarBase64 || input.avatarMimeType, {
  message: "Avatar MIME type is required",
  path: ["avatarMimeType"]
});

export const organizationCreateSchema = z.object({
  name: z.string().min(2).max(180),
  type: z.enum(["solo", "firm"]).default("solo"),
  inn: z.string().max(12).optional(),
  ogrn: z.string().max(15).optional(),
  address: z.string().max(500).optional()
});

export const clientCreateSchema = z.object({
  type: z.enum(["individual", "legal_entity", "entrepreneur"]).default("individual"),
  fullName: z.string().min(2).max(220),
  shortName: z.string().max(160).optional(),
  inn: z.string().max(12).optional(),
  ogrn: z.string().max(15).optional(),
  kpp: z.string().max(9).optional(),
  passportData: z.string().max(500).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().max(255).optional(),
  representativeName: z.string().max(180).optional(),
  notes: z.string().max(2000).optional()
});

export const clientUpdateSchema = clientCreateSchema.partial();

export const clientListQuerySchema = z.object({
  search: z.string().max(120).optional(),
  type: z.enum(["individual", "legal_entity", "entrepreneur"]).optional()
});

export const legalCaseCreateSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(2).max(240),
  caseNumber: z.string().max(100).optional(),
  courtName: z.string().max(240).optional(),
  judgeName: z.string().max(160).optional(),
  category: z.string().max(120).optional(),
  status: z.enum(["draft", "active", "suspended", "finished", "archived"]).default("draft"),
  side: z.enum(["plaintiff", "defendant", "third_party", "applicant", "interested_party"]).default("plaintiff"),
  claimAmount: z.coerce.number().nonnegative().optional(),
  description: z.string().max(4000).optional(),
  result: z.string().max(2000).optional(),
  responsibleUserId: z.string().uuid().optional()
});

export const legalCaseUpdateSchema = legalCaseCreateSchema.partial();

export const legalCaseListQuerySchema = z.object({
  search: z.string().max(120).optional(),
  status: z.enum(["draft", "active", "suspended", "finished", "archived"]).optional()
});

export const casePartyCreateSchema = z.object({
  type: z.enum(["plaintiff", "defendant", "third_party", "court", "other"]).default("other"),
  name: z.string().min(2).max(220),
  inn: z.string().max(12).optional(),
  ogrn: z.string().max(15).optional(),
  address: z.string().max(500).optional(),
  representative: z.string().max(180).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().max(255).optional(),
  notes: z.string().max(1000).optional()
});

export const casePartyUpdateSchema = casePartyCreateSchema.partial();

export const deadlineCreateSchema = z.object({
  caseId: z.string().uuid(),
  title: z.string().min(2).max(220),
  description: z.string().max(2000).optional(),
  deadlineAt: z.coerce.date(),
  status: z.enum(["active", "completed", "overdue", "cancelled"]).default("active"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  responsibleUserId: z.string().uuid().optional(),
  basis: z.string().max(1000).optional()
});

export const deadlineUpdateSchema = deadlineCreateSchema.partial();

export const deadlineListQuerySchema = z.object({
  status: z.enum(["active", "completed", "overdue", "cancelled"]).optional(),
  caseId: z.string().uuid().optional(),
  due: z.enum(["overdue", "today", "week"]).optional()
});

export const deadlineReminderSendSchema = z.object({
  daysBefore: z.array(z.coerce.number().int().min(0).max(30)).default([0, 1, 3, 7])
});

export const taskCreateSchema = z.object({
  caseId: z.string().uuid().optional(),
  title: z.string().min(2).max(220),
  description: z.string().max(2000).optional(),
  status: z.enum(["todo", "in_progress", "review", "done", "cancelled"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  assignedToId: z.string().uuid().optional(),
  dueAt: z.coerce.date().optional()
});

export const taskUpdateSchema = taskCreateSchema.partial();

export const taskListQuerySchema = z.object({
  status: z.enum(["todo", "in_progress", "review", "done", "cancelled"]).optional(),
  caseId: z.string().uuid().optional(),
  due: z.enum(["overdue", "today", "week"]).optional()
});

export const caseEventCreateSchema = z.object({
  caseId: z.string().uuid(),
  type: z.enum(["hearing", "deadline", "document_received", "document_sent", "payment", "call", "meeting", "other"]).default("other"),
  title: z.string().min(2).max(220),
  description: z.string().max(2000).optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional(),
  location: z.string().max(240).optional(),
  isAllDay: z.boolean().default(false),
  responsibleUserId: z.string().uuid().optional()
});

export const documentUploadSchema = z.object({
  caseId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  title: z.string().min(2).max(220),
  type: z.enum(["claim", "response", "motion", "appeal", "cassation", "court_act", "evidence", "contract", "other"]).default("other"),
  originalFileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  contentBase64: z.string().min(1),
  description: z.string().max(1000).optional()
});

export const documentListQuerySchema = z.object({
  search: z.string().max(120).optional(),
  type: z.enum(["claim", "response", "motion", "appeal", "cassation", "court_act", "evidence", "contract", "other"]).optional(),
  status: z.enum(["draft", "ready", "signed", "sent", "active"]).optional(),
  caseId: z.string().uuid().optional()
});

export const documentUpdateSchema = z.object({
  title: z.string().min(2).max(220).optional(),
  type: z.enum(["claim", "response", "motion", "appeal", "cassation", "court_act", "evidence", "contract", "other"]).optional(),
  status: z.enum(["draft", "ready", "signed", "sent", "active"]).optional(),
  caseId: z.string().uuid().nullable().optional(),
  description: z.string().max(1000).optional()
});

export const templateGenerateSchema = z.object({
  caseId: z.string().uuid(),
  templateType: z.enum(["postpone_hearing", "attach_documents", "case_review", "claim_response", "pretrial_claim"]),
  title: z.string().min(2).max(220),
  inputData: z.record(z.string(), z.string().optional()).default({})
});

export const globalSearchQuerySchema = z.object({
  q: z.string().min(1).max(120)
});

export const auditLogQuerySchema = z.object({
  entityType: z.string().max(80).optional(),
  entityId: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30)
});

export const onboardingDemoDataSchema = z.object({
  includeDocuments: z.boolean().default(true)
});

export const memberInviteSchema = z.object({
  email: emailSchema,
  fullName: z.string().min(2).max(160),
  role: z.enum(["admin", "lawyer", "assistant", "viewer"]).default("lawyer")
});

export const memberUpdateSchema = z.object({
  role: z.enum(["admin", "lawyer", "assistant", "viewer"]),
  status: z.enum(["active", "suspended"]).default("active")
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type EmailVerificationRequestInput = z.infer<typeof emailVerificationRequestSchema>;
export type EmailVerificationInput = z.infer<typeof emailVerificationSchema>;
export type InviteAcceptInput = z.infer<typeof inviteAcceptSchema>;
export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>;
export type OrganizationCreateInput = z.infer<typeof organizationCreateSchema>;
export type ClientCreateInput = z.infer<typeof clientCreateSchema>;
export type ClientListQuery = z.infer<typeof clientListQuerySchema>;
export type LegalCaseCreateInput = z.infer<typeof legalCaseCreateSchema>;
export type LegalCaseListQuery = z.infer<typeof legalCaseListQuerySchema>;
export type CasePartyCreateInput = z.infer<typeof casePartyCreateSchema>;
export type CasePartyUpdateInput = z.infer<typeof casePartyUpdateSchema>;
export type DeadlineCreateInput = z.infer<typeof deadlineCreateSchema>;
export type DeadlineUpdateInput = z.infer<typeof deadlineUpdateSchema>;
export type DeadlineReminderSendInput = z.infer<typeof deadlineReminderSendSchema>;
export type DeadlineListQuery = z.infer<typeof deadlineListQuerySchema>;
export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
export type CaseEventCreateInput = z.infer<typeof caseEventCreateSchema>;
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
export type DocumentListQuery = z.infer<typeof documentListQuerySchema>;
export type DocumentUpdateInput = z.infer<typeof documentUpdateSchema>;
export type TemplateGenerateInput = z.infer<typeof templateGenerateSchema>;
export type GlobalSearchQuery = z.infer<typeof globalSearchQuerySchema>;
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
export type OnboardingDemoDataInput = z.infer<typeof onboardingDemoDataSchema>;
export type MemberInviteInput = z.infer<typeof memberInviteSchema>;
export type MemberUpdateInput = z.infer<typeof memberUpdateSchema>;
