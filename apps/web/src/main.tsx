import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Seo } from "./components/Seo";
import { lazy, Suspense, useEffect } from "react";
import "./styles.css";

declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...params: unknown[]) => void;
  }
}

const AuthPage = lazy(() => import("./pages/AuthPage").then((module) => ({ default: module.AuthPage })));
const BillingPlanPage = lazy(() => import("./pages/BillingPlanPage").then((module) => ({ default: module.BillingPlanPage })));
const PasswordResetPage = lazy(() => import("./pages/AuthActionPages").then((module) => ({ default: module.PasswordResetPage })));
const EmailVerificationPage = lazy(() => import("./pages/AuthActionPages").then((module) => ({ default: module.EmailVerificationPage })));
const InviteAcceptPage = lazy(() => import("./pages/AuthActionPages").then((module) => ({ default: module.InviteAcceptPage })));
const CalendarPage = lazy(() => import("./pages/CalendarPage").then((module) => ({ default: module.CalendarPage })));
const CaseDetailPage = lazy(() => import("./pages/CaseDetailPage").then((module) => ({ default: module.CaseDetailPage })));
const CasesPage = lazy(() => import("./pages/CasesPage").then((module) => ({ default: module.CasesPage })));
const ClientsPage = lazy(() => import("./pages/ClientsPage").then((module) => ({ default: module.ClientsPage })));
const ClientDetailPage = lazy(() => import("./pages/ClientDetailPage").then((module) => ({ default: module.ClientDetailPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const DocumentsPage = lazy(() => import("./pages/DocumentsPage").then((module) => ({ default: module.DocumentsPage })));
const HowToStartPage = lazy(() => import("./pages/HowToStartPage").then((module) => ({ default: module.HowToStartPage })));
const LandingPage = lazy(() => import("./pages/LandingPage").then((module) => ({ default: module.LandingPage })));
const LegalPolicyPage = lazy(() => import("./pages/LegalPolicyPage").then((module) => ({ default: module.LegalPolicyPage })));
const MarketingInfoPage = lazy(() => import("./pages/MarketingInfoPage").then((module) => ({ default: module.MarketingInfoPage })));
const PricingPage = lazy(() => import("./pages/PricingPage").then((module) => ({ default: module.PricingPage })));
const SeoLandingPage = lazy(() => import("./pages/SeoLandingPage").then((module) => ({ default: module.SeoLandingPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const TasksPage = lazy(() => import("./pages/TasksPage").then((module) => ({ default: module.TasksPage })));

function YandexMetrikaTracker() {
  const location = useLocation();

  useEffect(() => {
    window.ym?.(109636652, "hit", window.location.href, {
      referer: document.referrer,
      title: document.title
    });
  }, [location.pathname, location.search, location.hash]);

  return null;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Seo />
      <YandexMetrikaTracker />
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#eef2f6] text-sm font-semibold text-slate-600">Загружаем...</div>}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/how-to-start" element={<HowToStartPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/solutions/:slug" element={<SeoLandingPage />} />
        <Route path="/company/privacy" element={<LegalPolicyPage />} />
        <Route path="/product/:slug" element={<MarketingInfoPage />} />
        <Route path="/service/:slug" element={<MarketingInfoPage />} />
        <Route path="/resources/:slug" element={<MarketingInfoPage />} />
        <Route path="/company/:slug" element={<MarketingInfoPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/password-reset" element={<PasswordResetPage />} />
        <Route path="/email-verification" element={<EmailVerificationPage />} />
        <Route path="/invite" element={<InviteAcceptPage />} />
        <Route element={<AppShell />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="cases" element={<CasesPage />} />
          <Route path="cases/:id" element={<CaseDetailPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/:id" element={<ClientDetailPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/billing/:plan" element={<BillingPlanPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>
);
