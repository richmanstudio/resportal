import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AuthPage } from "./pages/AuthPage";
import { CalendarPage } from "./pages/CalendarPage";
import { CaseDetailPage } from "./pages/CaseDetailPage";
import { CasesPage } from "./pages/CasesPage";
import { ClientsPage } from "./pages/ClientsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { HowToStartPage } from "./pages/HowToStartPage";
import { LandingPage } from "./pages/LandingPage";
import { LegalPolicyPage } from "./pages/LegalPolicyPage";
import { MarketingInfoPage } from "./pages/MarketingInfoPage";
import { PricingPage } from "./pages/PricingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TasksPage } from "./pages/TasksPage";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/how-to-start" element={<HowToStartPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/company/privacy" element={<LegalPolicyPage />} />
        <Route path="/product/:slug" element={<MarketingInfoPage />} />
        <Route path="/service/:slug" element={<MarketingInfoPage />} />
        <Route path="/resources/:slug" element={<MarketingInfoPage />} />
        <Route path="/company/:slug" element={<MarketingInfoPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route element={<AppShell />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="cases" element={<CasesPage />} />
          <Route path="cases/:id" element={<CaseDetailPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
