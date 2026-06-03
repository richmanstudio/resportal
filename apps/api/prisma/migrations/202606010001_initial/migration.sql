-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'blocked');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('solo', 'firm');

-- CreateEnum
CREATE TYPE "TariffPlan" AS ENUM ('solo', 'team', 'firm');

-- CreateEnum
CREATE TYPE "TariffStatus" AS ENUM ('trial', 'active', 'past_due', 'cancelled');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('owner', 'admin', 'lawyer', 'assistant', 'viewer');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('invited', 'active', 'suspended');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('individual', 'legal_entity', 'entrepreneur');

-- CreateEnum
CREATE TYPE "LegalCaseStatus" AS ENUM ('draft', 'active', 'suspended', 'finished', 'archived');

-- CreateEnum
CREATE TYPE "CaseSide" AS ENUM ('plaintiff', 'defendant', 'third_party', 'applicant', 'interested_party');

-- CreateEnum
CREATE TYPE "CasePartyType" AS ENUM ('plaintiff', 'defendant', 'third_party', 'court', 'other');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('claim', 'response', 'motion', 'appeal', 'cassation', 'court_act', 'evidence', 'contract', 'other');

-- CreateEnum
CREATE TYPE "CaseEventType" AS ENUM ('hearing', 'deadline', 'document_received', 'document_sent', 'payment', 'call', 'meeting', 'other');

-- CreateEnum
CREATE TYPE "DeadlineStatus" AS ENUM ('active', 'completed', 'overdue', 'cancelled');

-- CreateEnum
CREATE TYPE "DeadlinePriority" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('todo', 'in_progress', 'review', 'done', 'cancelled');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "TemplateScope" AS ENUM ('system', 'organization');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('income', 'expense');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL DEFAULT 'solo',
    "inn" TEXT,
    "ogrn" TEXT,
    "address" TEXT,
    "ownerId" TEXT NOT NULL,
    "tariffPlan" "TariffPlan" NOT NULL DEFAULT 'solo',
    "tariffStatus" "TariffStatus" NOT NULL DEFAULT 'trial',
    "storageLimit" INTEGER NOT NULL DEFAULT 5368709120,
    "activeCasesLimit" INTEGER NOT NULL DEFAULT 30,
    "usersLimit" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'owner',
    "status" "MemberStatus" NOT NULL DEFAULT 'active',
    "invitedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "ClientType" NOT NULL DEFAULT 'individual',
    "fullName" TEXT NOT NULL,
    "shortName" TEXT,
    "inn" TEXT,
    "ogrn" TEXT,
    "kpp" TEXT,
    "passportData" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "representativeName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalCase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caseNumber" TEXT,
    "courtName" TEXT,
    "judgeName" TEXT,
    "category" TEXT,
    "status" "LegalCaseStatus" NOT NULL DEFAULT 'draft',
    "side" "CaseSide" NOT NULL DEFAULT 'plaintiff',
    "claimAmount" DECIMAL(65,30),
    "description" TEXT,
    "result" TEXT,
    "responsibleUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "LegalCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseParty" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" "CasePartyType" NOT NULL,
    "name" TEXT NOT NULL,
    "inn" TEXT,
    "ogrn" TEXT,
    "address" TEXT,
    "representative" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,

    CONSTRAINT "CaseParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "caseId" TEXT,
    "clientId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'other',
    "fileName" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" "CaseEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "location" TEXT,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "responsibleUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deadline" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "status" "DeadlineStatus" NOT NULL DEFAULT 'active',
    "priority" "DeadlinePriority" NOT NULL DEFAULT 'medium',
    "responsibleUserId" TEXT,
    "basis" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "caseId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'todo',
    "priority" "TaskPriority" NOT NULL DEFAULT 'medium',
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "scope" "TemplateScope" NOT NULL DEFAULT 'organization',
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "templateFileKey" TEXT NOT NULL,
    "fieldsSchema" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "inputDataJson" JSONB NOT NULL,
    "outputFileKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT,
    "caseId" TEXT,
    "type" "PaymentType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "metadataJson" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Client_organizationId_idx" ON "Client"("organizationId");

-- CreateIndex
CREATE INDEX "LegalCase_organizationId_idx" ON "LegalCase"("organizationId");

-- CreateIndex
CREATE INDEX "LegalCase_clientId_idx" ON "LegalCase"("clientId");

-- CreateIndex
CREATE INDEX "CaseParty_caseId_idx" ON "CaseParty"("caseId");

-- CreateIndex
CREATE INDEX "CaseDocument_organizationId_idx" ON "CaseDocument"("organizationId");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalCase" ADD CONSTRAINT "LegalCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalCase" ADD CONSTRAINT "LegalCase_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalCase" ADD CONSTRAINT "LegalCase_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseParty" ADD CONSTRAINT "CaseParty_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "LegalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDocument" ADD CONSTRAINT "CaseDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDocument" ADD CONSTRAINT "CaseDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "LegalCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDocument" ADD CONSTRAINT "CaseDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDocument" ADD CONSTRAINT "CaseDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "LegalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "LegalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "LegalCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "LegalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "LegalCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

