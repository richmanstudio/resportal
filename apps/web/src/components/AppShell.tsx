import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MoreHorizontal,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X
} from "lucide-react";
import type { ComponentType, FormEvent, ReactNode } from "react";
import { Children, useEffect, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { apiFetch, clearSession, fileToBase64, loadWorkspace, type Workspace } from "../lib/api";
import { Badge, cx } from "./Premium";
import logoUrl from "../assets/logo-app.png";

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { to: "/cases", label: "Дела", icon: BriefcaseBusiness },
  { to: "/clients", label: "Клиенты", icon: Users },
  { to: "/calendar", label: "Календарь", icon: CalendarDays },
  { to: "/tasks", label: "Задачи и сроки", icon: CheckSquare },
  { to: "/documents", label: "Документы", icon: FileText },
  { to: "/settings", label: "Настройки", icon: Settings }
];

const mobilePrimaryItems = navItems.filter((item) => ["/dashboard", "/cases", "/tasks"].includes(item.to));
const mobileMoreItems = navItems.filter((item) => !["/dashboard", "/cases", "/tasks"].includes(item.to));

type SearchResult = {
  cases: Array<{ id: string; title: string; caseNumber?: string; status: string }>;
  clients: Array<{ id: string; fullName: string; type: string; email?: string; phone?: string }>;
  documents: Array<{ id: string; title: string; type: string; status: string; case?: { id: string; title: string; caseNumber?: string } }>;
};

type NotificationItem = {
  id: string;
  title: string;
  date?: string;
  kind: "deadline" | "task";
  case?: { id: string; title: string; caseNumber?: string };
};

type NotificationDeadlineResponse = NotificationItem & { deadlineAt: string; status: "active" | "completed" | "overdue" | "cancelled" };
type NotificationTaskResponse = NotificationItem & { dueAt?: string; status: "todo" | "in_progress" | "review" | "done" | "cancelled" };

const onboardingSteps = [
  {
    title: "Дашборд",
    text: "Здесь начинается рабочий день: ближайшие заседания, сроки, задачи, клиенты и нагрузка.",
    icon: LayoutDashboard
  },
  {
    title: "Дела",
    text: "Реестр дел хранит номер, суд, клиента, статус и всю связанную работу по карточке дела.",
    icon: BriefcaseBusiness
  },
  {
    title: "Сроки и задачи",
    text: "Критичные процессуальные сроки отделены от обычных задач, чтобы ничего не потерялось.",
    icon: CheckSquare
  },
  {
    title: "Документы",
    text: "Загружайте документы, привязывайте их к делу и ведите статусы: черновик, готов, подписан, отправлен.",
    icon: FileText
  },
  {
    title: "Подписка",
    text: "Можно остаться в бесплатной урезанной версии или перейти к покупке тарифа, когда будете готовы.",
    icon: ShieldCheck,
    isFinal: true
  }
];

function initials(fullName: string) {
  return fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isPaidOrganization(organization: Workspace["membership"]["organization"]) {
  const currentPeriodEnd = organization.tariffCurrentPeriodEnd;
  return organization.tariffStatus === "active" && currentPeriodEnd ? new Date(currentPeriodEnd) > new Date() : false;
}

function planTitle(organization: Workspace["membership"]["organization"]) {
  return isPaidOrganization(organization) ? organization.tariffPlan.toUpperCase() : "Бесплатная версия";
}

function planDescription(organization: Workspace["membership"]["organization"]) {
  if (!isPaidOrganization(organization)) return "Ограниченные возможности";
  return organization.tariffCurrentPeriodEnd
    ? `Активна до ${new Date(organization.tariffCurrentPeriodEnd).toLocaleDateString("ru-RU")}`
    : "Активная подписка";
}

function dismissedNotificationsKey(workspace: Workspace) {
  return `resportal.dismissedNotifications.v1.${workspace.user.id}.${workspace.organizationId}`;
}

function notificationFingerprint(item: NotificationItem) {
  return `${item.kind}:${item.id}:${item.date ?? "none"}`;
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "guest">("loading");
  const [isOrganizationMenuOpen, setIsOrganizationMenuOpen] = useState(false);
  const [organizationError, setOrganizationError] = useState("");
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  async function refreshWorkspace() {
    try {
      const next = await loadWorkspace();
      setWorkspace(next);
      setStatus("ready");
    } catch {
      setStatus("guest");
    }
  }

  useEffect(() => {
    void refreshWorkspace();
  }, []);

  useEffect(() => {
    if (!workspace || search.trim().length < 2) {
      setSearchResult(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      void apiFetch<SearchResult>(`/search?q=${encodeURIComponent(search.trim())}`, { organizationId: workspace.organizationId })
        .then((result) => {
          setSearchResult(result);
          setIsSearchOpen(true);
        })
        .catch(() => setSearchResult(null));
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [search, workspace]);

  useEffect(() => {
    if (!workspace || status !== "ready") return;
    const key = `resportal.onboarding.v1.${workspace.user.id}`;
    if (!localStorage.getItem(key)) {
      const timeout = window.setTimeout(() => setIsOnboardingOpen(true), 500);
      return () => window.clearTimeout(timeout);
    }
  }, [status, workspace]);

  useEffect(() => {
    if (!workspace || status !== "ready") return;
    const raw = localStorage.getItem(dismissedNotificationsKey(workspace));
    setDismissedNotifications(raw ? JSON.parse(raw) as string[] : []);
  }, [status, workspace?.user.id, workspace?.organizationId]);

  useEffect(() => {
    if (!workspace || status !== "ready") return;
    void Promise.all([
      apiFetch<NotificationDeadlineResponse[]>("/deadlines?due=week", { organizationId: workspace.organizationId }).catch(() => []),
      apiFetch<NotificationTaskResponse[]>("/tasks?due=week", { organizationId: workspace.organizationId }).catch(() => [])
    ]).then(([deadlines, tasks]) => {
      const next: NotificationItem[] = [
        ...deadlines
          .filter((item) => item.status !== "completed" && item.status !== "cancelled")
          .map((item) => ({ id: item.id, title: item.title, date: item.deadlineAt, kind: "deadline" as const, case: item.case })),
        ...tasks
          .filter((item) => item.status !== "done" && item.status !== "cancelled")
          .map((item) => ({ id: item.id, title: item.title, date: item.dueAt, kind: "task" as const, case: item.case }))
      ].sort((a, b) => new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime());
      const dismissed = new Set<string>(JSON.parse(localStorage.getItem(dismissedNotificationsKey(workspace)) ?? "[]") as string[]);
      setNotifications(next.filter((item) => !dismissed.has(notificationFingerprint(item))).slice(0, 8));
    });
  }, [status, workspace]);

  function clearNotifications() {
    if (!workspace) return;
    const next = Array.from(new Set([...dismissedNotifications, ...notifications.map(notificationFingerprint)]));
    localStorage.setItem(dismissedNotificationsKey(workspace), JSON.stringify(next));
    setDismissedNotifications(next);
    setNotifications([]);
    setIsNotificationsOpen(false);
  }

  function dismissNotification(item: NotificationItem) {
    if (!workspace) return;
    const fingerprint = notificationFingerprint(item);
    const next = Array.from(new Set([...dismissedNotifications, fingerprint]));
    localStorage.setItem(dismissedNotificationsKey(workspace), JSON.stringify(next));
    setDismissedNotifications(next);
    setNotifications((current) => current.filter((notification) => notificationFingerprint(notification) !== fingerprint));
  }

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center bg-porcelain text-sm font-semibold text-slate-600">Загружаем рабочее пространство...</div>;
  }

  if (status === "guest" || !workspace) {
    return <Navigate to="/login" replace />;
  }

  const organization = workspace.membership.organization;

  function completeOnboarding() {
    if (!workspace) return;
    localStorage.setItem(`resportal.onboarding.v1.${workspace.user.id}`, "done");
    setIsOnboardingOpen(false);
    setOnboardingStep(0);
  }

  async function switchOrganization(organizationId: string) {
    localStorage.setItem("resportal.organizationId", organizationId);
    setIsOrganizationMenuOpen(false);
    await refreshWorkspace();
  }

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOrganizationError("");
    const form = new FormData(event.currentTarget);
    try {
      const organization = await apiFetch<{ id: string }>("/organizations", {
        method: "POST",
        body: JSON.stringify({ name: form.get("name"), type: "solo" })
      });
      localStorage.setItem("resportal.organizationId", organization.id);
      setIsOrganizationMenuOpen(false);
      await refreshWorkspace();
    } catch (e) {
      setOrganizationError(e instanceof Error ? e.message : "Не удалось создать организацию");
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError("");
    setProfileMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const avatarFile = form.get("avatarFile");
      const payload: { fullName: string; avatarBase64?: string; avatarMimeType?: string } = {
        fullName: String(form.get("fullName") ?? "")
      };
      if (avatarFile instanceof File && avatarFile.size > 0) {
        payload.avatarBase64 = await fileToBase64(avatarFile);
        payload.avatarMimeType = avatarFile.type;
      }
      await apiFetch("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      setProfileMessage("Профиль обновлен");
      await refreshWorkspace();
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "Не удалось обновить профиль");
    }
  }

  function logout() {
    clearSession();
    setStatus("guest");
  }

  const isMoreActive = mobileMoreItems.some((item) => location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to)));

  return (
    <div className="min-h-screen pb-24 text-slate-900 lg:pb-0">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[282px] flex-col bg-[#08111f] text-slate-200 shadow-[24px_0_80px_rgba(15,23,42,0.22)] lg:flex">
        <div className="px-5 pb-5 pt-6">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="РЕСПОРТАЛ" className="h-14 w-14 rounded-[18px] object-cover shadow-xl shadow-black/30" />
            <div>
              <div className="text-[19px] font-semibold tracking-normal text-white">РЕСПОРТАЛ</div>
              <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200/70">Legal OS</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard"}
              className={({ isActive }) =>
                cx(
                  "group flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition duration-200",
                  isActive ? "bg-white/[0.09] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_12px_28px_rgba(0,0,0,0.18)]" : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                )
              }
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] text-slate-300 transition group-hover:text-white">
                <item.icon size={18} />
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-3 px-4 pb-5">
          <div className="rounded-[20px] border border-white/10 bg-white/[0.05] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Версия</div>
                <div className="mt-1 text-base font-semibold text-white">{planTitle(organization)}</div>
              </div>
              <ShieldCheck size={22} className={isPaidOrganization(organization) ? "text-emerald-300" : "text-blue-300"} />
            </div>
            <div className="mt-3 rounded-2xl bg-white/8 px-3 py-2 text-xs font-semibold text-slate-200">
              {planDescription(organization)}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.08]">
              <LifeBuoy size={19} />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Поддержка</div>
              <div className="text-xs text-slate-400">help@resportal.ru</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[282px]">
        <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/82 px-5 backdrop-blur-xl lg:px-8">
          <div className="flex min-h-20 items-center justify-between gap-4">
            <div className="flex items-center gap-3 lg:hidden">
              <img src={logoUrl} alt="РЕСПОРТАЛ" className="h-11 w-11 rounded-2xl object-cover" />
              <div>
                <div className="text-base font-semibold">РЕСПОРТАЛ</div>
                <div className="text-xs text-slate-500">Рабочее пространство</div>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="relative hidden sm:block">
                <button className="premium-button-ghost h-11 min-w-[240px] justify-between" onClick={() => setIsOrganizationMenuOpen((value) => !value)}>
                  <span className="flex items-center gap-3 truncate">
                    <BriefcaseBusiness size={18} className="text-slate-500" />
                    <span className="truncate">{organization.name}</span>
                  </span>
                  <ChevronDown size={16} className="text-slate-500" />
                </button>
                {isOrganizationMenuOpen ? (
                  <div className="absolute left-0 top-14 z-30 w-[390px] rounded-[20px] border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
                    <div className="px-2 pb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Организации</div>
                    <div className="max-h-56 overflow-y-auto">
                      {workspace.memberships.map((membership) => (
                        <button
                          key={membership.organization.id}
                          className={cx(
                            "flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm transition hover:bg-slate-50",
                            membership.organization.id === workspace.organizationId ? "bg-blue-50 text-blue-700" : "text-slate-700"
                          )}
                          onClick={() => void switchOrganization(membership.organization.id)}
                        >
                          <span className="font-semibold">{membership.organization.name}</span>
                          <span className="text-xs font-semibold text-slate-400">{membership.role}</span>
                        </button>
                      ))}
                    </div>
                    <form className="mt-3 grid gap-2 border-t border-slate-100 pt-3" onSubmit={(event) => void createOrganization(event)}>
                      <input required name="name" placeholder="Новое рабочее пространство" className="premium-input" />
                      <button className="premium-button-blue">Создать бесплатное пространство</button>
                      <div className="text-xs font-medium text-slate-500">Подписка покупается отдельно в разделе настроек.</div>
                      {organizationError ? <div className="text-xs font-semibold text-red-600">{organizationError}</div> : null}
                    </form>
                  </div>
                ) : null}
              </div>

              <div className="relative hidden w-full max-w-xl md:block">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onFocus={() => setIsSearchOpen(true)}
                  placeholder="Поиск по делам, клиентам, документам..."
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white/90 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
                />
                {isSearchOpen && search.trim().length >= 2 && searchResult ? (
                  <div className="absolute left-0 right-0 top-14 z-40 max-h-[520px] overflow-y-auto rounded-[20px] border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
                    <SearchGroup title="Дела" empty="Дела не найдены">
                      {searchResult.cases.map((item) => (
                        <SearchLink key={item.id} to={`/cases/${item.id}`} title={item.caseNumber ?? item.title} meta={item.title} onClick={() => setIsSearchOpen(false)}>
                          <Badge tone="blue">{item.status}</Badge>
                        </SearchLink>
                      ))}
                    </SearchGroup>
                    <SearchGroup title="Клиенты" empty="Клиенты не найдены">
                      {searchResult.clients.map((item) => (
                        <SearchLink key={item.id} to={`/clients/${item.id}`} title={item.fullName} meta={item.email ?? item.phone ?? item.type} onClick={() => setIsSearchOpen(false)}>
                          <Badge tone="violet">{item.type}</Badge>
                        </SearchLink>
                      ))}
                    </SearchGroup>
                    <SearchGroup title="Документы" empty="Документы не найдены">
                      {searchResult.documents.map((item) => (
                        <SearchLink key={item.id} to="/documents" title={item.title} meta={item.case?.caseNumber ?? item.case?.title ?? item.type} onClick={() => setIsSearchOpen(false)}>
                          <Badge tone="slate">{item.status}</Badge>
                        </SearchLink>
                      ))}
                    </SearchGroup>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block">
                <button className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900" title="Уведомления" onClick={() => setIsNotificationsOpen((value) => !value)}>
                  <Bell size={18} />
                  {notifications.length ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">{notifications.length}</span> : null}
                </button>
                {isNotificationsOpen ? (
                  <div className="absolute right-0 top-12 z-40 w-[380px] rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.2)]">
                    <div className="flex items-center justify-between px-2 pb-2">
                      <div className="text-sm font-semibold text-slate-950">Что требует внимания</div>
                      <div className="flex items-center gap-2">
                        {notifications.length ? (
                          <button className="rounded-full px-3 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" onClick={clearNotifications}>
                            Очистить
                          </button>
                        ) : null}
                        <Badge tone={notifications.length ? "red" : "green"}>{notifications.length ? `${notifications.length}` : "0"}</Badge>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length ? notifications.map((item) => (
                        <div key={`${item.kind}-${item.id}`} className="group relative rounded-2xl transition hover:bg-slate-50">
                        <Link to="/tasks" className="block px-3 py-3 pr-10" onClick={() => setIsNotificationsOpen(false)}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                              <div className="mt-1 text-xs font-medium text-slate-500">{item.case?.caseNumber ?? item.case?.title ?? (item.kind === "deadline" ? "Процессуальный срок" : "Задача")}</div>
                            </div>
                            <Badge tone={item.kind === "deadline" ? "orange" : "rose"}>{item.date ? new Date(item.date).toLocaleDateString("ru-RU") : "без даты"}</Badge>
                          </div>
                        </Link>
                          <button
                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-xl text-slate-300 opacity-0 transition hover:bg-white hover:text-slate-700 group-hover:opacity-100"
                            onClick={() => dismissNotification(item)}
                            aria-label="Скрыть уведомление"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      )) : (
                        <div className="rounded-2xl bg-emerald-50 px-4 py-5 text-sm font-semibold leading-6 text-emerald-700">Срочных задач и сроков на ближайшие 7 дней нет.</div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="hidden text-right sm:block">
                <div className="text-sm font-semibold text-slate-950">{workspace.user.fullName}</div>
                <div className="text-xs font-medium text-slate-500">{workspace.membership.role}</div>
              </div>
              <button
                className="focus-ring flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5"
                onClick={() => setIsProfileOpen(true)}
                title="Профиль"
              >
                {workspace.user.avatarUrl ? <img src={workspace.user.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(workspace.user.fullName)}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1680px] px-5 py-7 lg:px-8 xl:px-10">
          <Outlet context={{ workspace, refreshWorkspace }} />
        </main>
      </div>

      <MobileTabBar items={mobilePrimaryItems} moreItems={mobileMoreItems} isMoreActive={isMoreActive} isMoreOpen={isMoreOpen} onMoreToggle={() => setIsMoreOpen((value) => !value)} onNavigate={() => setIsMoreOpen(false)} />

      {isProfileOpen ? (
        <ProfileModal
          workspace={workspace}
          message={profileMessage}
          error={profileError}
          onClose={() => setIsProfileOpen(false)}
          onSubmit={(event) => void saveProfile(event)}
          onLogout={logout}
          onGoBilling={() => {
            setIsProfileOpen(false);
            navigate("/settings");
          }}
        />
      ) : null}

      {isOnboardingOpen ? (
        <OnboardingOverlay
          step={onboardingStep}
          onNext={() => {
            if (onboardingStep === onboardingSteps.length - 1) {
              completeOnboarding();
              navigate("/settings");
              return;
            }
            setOnboardingStep((value) => value + 1);
          }}
          onSkip={completeOnboarding}
        />
      ) : null}
    </div>
  );
}

function MobileTabBar(props: { items: NavItem[]; moreItems: NavItem[]; isMoreActive: boolean; isMoreOpen: boolean; onMoreToggle: () => void; onNavigate: () => void }) {
  return (
    <>
      {props.isMoreOpen ? (
        <div className="fixed inset-x-3 bottom-24 z-40 rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.22)] lg:hidden">
          <div className="mb-2 flex items-center justify-between px-2">
            <div className="text-sm font-semibold text-slate-950">Еще разделы</div>
            <button className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100" onClick={props.onMoreToggle}><X size={16} /></button>
          </div>
          <div className="grid gap-2">
            {props.moreItems.map((item) => (
              <NavLink key={item.to} to={item.to} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={props.onNavigate}>
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ) : null}
      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-[26px] border border-slate-200 bg-white/95 p-2 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl lg:hidden">
        {props.items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/dashboard"}
            className={({ isActive }) => cx("flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition", isActive ? "bg-slate-950 text-white" : "text-slate-500")}
          >
            <item.icon size={18} />
            <span className="max-w-full truncate">{item.label === "Задачи и сроки" ? "Задачи" : item.label}</span>
          </NavLink>
        ))}
        <button className={cx("flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition", props.isMoreActive || props.isMoreOpen ? "bg-slate-950 text-white" : "text-slate-500")} onClick={props.onMoreToggle}>
          <MoreHorizontal size={18} />
          Еще
        </button>
      </nav>
    </>
  );
}

function ProfileModal(props: { workspace: Workspace; message: string; error: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onLogout: () => void; onGoBilling: () => void }) {
  const organization = props.workspace.membership.organization;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-[26px] bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[22px] bg-slate-950 text-lg font-semibold text-white">
              {props.workspace.user.avatarUrl ? <img src={props.workspace.user.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(props.workspace.user.fullName)}
            </div>
            <div>
              <div className="text-xl font-semibold text-slate-950">{props.workspace.user.fullName}</div>
              <div className="text-sm font-medium text-slate-500">{props.workspace.user.email}</div>
            </div>
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600" onClick={props.onClose}><X size={18} /></button>
        </div>

        <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Подписка</div>
              <div className="mt-1 text-lg font-semibold text-slate-950">{planTitle(organization)}</div>
              <div className="text-sm text-slate-500">{planDescription(organization)}</div>
            </div>
            <button className="premium-button-blue" onClick={props.onGoBilling}>{isPaidOrganization(organization) ? "Управлять" : "Купить"}</button>
          </div>
        </div>

        <form className="mt-5 space-y-4" onSubmit={props.onSubmit}>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">ФИО</span>
            <input name="fullName" defaultValue={props.workspace.user.fullName} className="premium-input mt-2" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Аватарка</span>
            <div className="mt-2 rounded-[20px] border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50/40">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                  <Camera size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">Загрузить фото</div>
                  <div className="text-xs font-medium text-slate-500">JPEG, PNG или WebP до 1 МБ</div>
                </div>
              </div>
              <input name="avatarFile" type="file" accept="image/png,image/jpeg,image/webp" className="mt-3 block w-full text-sm font-medium text-slate-600 file:mr-4 file:rounded-2xl file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 file:shadow-sm" />
            </div>
          </label>
          {props.message ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{props.message}</div> : null}
          {props.error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{props.error}</div> : null}
          <div className="flex flex-wrap gap-3">
            <button className="premium-button-blue">Сохранить профиль</button>
            <button type="button" className="premium-button-ghost text-red-600" onClick={props.onLogout}><LogOut size={18} /> Выйти</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OnboardingOverlay(props: { step: number; onNext: () => void; onSkip: () => void }) {
  const step = onboardingSteps[props.step];
  const Icon = step.icon;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/72 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-blue-600 text-white shadow-lg shadow-blue-600/25">
            <Icon size={25} />
          </div>
          <button className="text-sm font-semibold text-slate-400 hover:text-slate-700" onClick={props.onSkip}>Пропустить</button>
        </div>
        <div className="mt-6 text-sm font-semibold text-blue-700">{props.step + 1} из {onboardingSteps.length}</div>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">{step.title}</h2>
        <p className="mt-3 text-base leading-7 text-slate-600">{step.text}</p>
        <div className="mt-6 flex gap-2">
          {onboardingSteps.map((item, index) => (
            <div key={item.title} className={cx("h-2 flex-1 rounded-full", index <= props.step ? "bg-blue-600" : "bg-slate-100")} />
          ))}
        </div>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button className="premium-button-ghost" onClick={props.onSkip}>Остаться в бесплатной версии</button>
          <button className="premium-button-blue" onClick={props.onNext}>{step.isFinal ? "Перейти к подпискам" : "Дальше"}</button>
        </div>
      </div>
    </div>
  );
}

function SearchGroup(props: { title: string; empty: string; children: ReactNode }) {
  const children = Children.toArray(props.children).filter(Boolean);
  return (
    <div className="py-2">
      <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{props.title}</div>
      {children.length ? children : <div className="px-2 py-2 text-sm text-slate-400">{props.empty}</div>}
    </div>
  );
}

function SearchLink(props: { to: string; title: string; meta: string; children: ReactNode; onClick: () => void }) {
  return (
    <Link className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm transition hover:bg-slate-50" to={props.to} onClick={props.onClick}>
      <span className="min-w-0">
        <span className="block truncate font-semibold text-slate-950">{props.title}</span>
        <span className="block truncate text-xs font-medium text-slate-500">{props.meta}</span>
      </span>
      {props.children}
    </Link>
  );
}
