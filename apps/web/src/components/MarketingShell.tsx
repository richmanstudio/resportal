import { ChevronDown, Menu, Search, X } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoUrl from "../assets/logo-app.png";
import { featureLinks, footerColumns, marketingPages, solutionLinks } from "../pages/marketingData";

type MarketingShellProps = {
  children: React.ReactNode;
};

export function MarketingShell({ children }: MarketingShellProps) {
  return (
    <main className="marketing-surface min-h-screen overflow-hidden bg-[#eef2f6] text-[#0b2744]">
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </main>
  );
}

export function MarketingHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [transitionTarget, setTransitionTarget] = useState<string | null>(null);
  const navigate = useNavigate();
  const searchItems = useMemo(() => {
    const baseItems = [
      { label: "Главная", href: "/", description: "Лендинг РЕСПОРТАЛА и обзор юридической операционной системы." },
      { label: "Как начать", href: "/how-to-start", description: "Пошаговый запуск аккаунта, профиля, дел, клиентов, сроков и документов." },
      { label: "Тарифы", href: "/pricing", description: "Free, Solo, Team, Firm, ограничения и будущая подписочная модель." }
    ];
    const footerItems = footerColumns.flatMap((column) => column.links.map((link) => ({ ...link, description: column.title })));
    const pageItems = Object.entries(marketingPages).map(([href, page]) => ({
      label: page.title,
      href,
      description: page.description
    }));
    const allItems = [...baseItems, ...featureLinks, ...solutionLinks, ...footerItems, ...pageItems];
    return Array.from(new Map(allItems.map((item) => [item.href, item])).values());
  }, []);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searchResults = normalizedQuery
    ? searchItems
        .filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(normalizedQuery))
        .slice(0, 7)
    : searchItems.slice(0, 6);

  function navigateWithFade(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    setTransitionTarget(href);
    window.setTimeout(() => navigate(href), 230);
  }

  function closeSearch() {
    setIsSearchOpen(false);
    setSearchQuery("");
  }

  return (
    <>
      <div className={`pointer-events-none fixed inset-0 z-[90] bg-[#eef2f6] transition duration-300 ${transitionTarget ? "opacity-100" : "opacity-0"}`} />
      <header className="sticky top-0 z-50 border-b border-white/35 bg-[#eef2f6]/88 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1220px] items-center justify-between px-5">
          <Link to="/" className="group flex items-center gap-3">
            <img src={logoUrl} alt="РЕСПОРТАЛ" className="h-10 w-10 rounded-[14px] object-cover transition duration-500 group-hover:scale-105" />
            <span className="text-[24px] font-bold tracking-tight">РЕСПОРТАЛ</span>
          </Link>

          <nav className="hidden items-center gap-8 text-[15px] font-medium text-[#0b2744] lg:flex">
            <div className="relative" onMouseEnter={() => setIsFeaturesOpen(true)} onMouseLeave={() => setIsFeaturesOpen(false)}>
              <button
                className="inline-flex items-center gap-1.5 py-6 text-blue-700 transition hover:text-blue-800"
                onClick={() => setIsFeaturesOpen((current) => !current)}
                type="button"
              >
                Возможности
                <ChevronDown size={15} className={`transition duration-300 ${isFeaturesOpen ? "rotate-180" : ""}`} />
              </button>
              <div
                className={`absolute left-0 top-[62px] w-[430px] rounded-[22px] border border-slate-200/80 bg-white p-2 shadow-[0_28px_80px_rgba(11,39,68,0.16)] transition duration-300 ${
                  isFeaturesOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
                }`}
              >
                <div className="grid gap-1.5">
                  {featureLinks.map((item) => (
                    <Link key={item.href} to={item.href} className="group rounded-[18px] p-3 transition duration-300 hover:bg-blue-50" onClick={() => setIsFeaturesOpen(false)}>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_12px_28px_rgba(37,99,235,0.18)]">
                          <item.icon size={19} />
                        </span>
                        <span className="font-bold text-[#0b2744] transition group-hover:text-blue-700">{item.label}</span>
                      </div>
                      <p className="ml-12 mt-1 text-sm leading-5 text-slate-500">{item.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <a href="/#audience" className="transition hover:text-blue-700">Для кого</a>
            <Link to="/how-to-start" className="transition hover:text-blue-700">Как начать</Link>
            <Link to="/pricing" className="transition hover:text-blue-700">Тарифы</Link>
          </nav>

          <div className="relative flex items-center gap-4">
            <button
              className={`hidden rounded-full p-2 text-[#0b2744] transition hover:bg-white/70 hover:text-blue-700 md:block ${isSearchOpen ? "bg-white text-blue-700 shadow-sm" : ""}`}
              aria-expanded={isSearchOpen}
              aria-label={isSearchOpen ? "Закрыть поиск" : "Открыть поиск"}
              onClick={() => setIsSearchOpen((current) => !current)}
              type="button"
            >
              <Search size={23} />
            </button>
            <Link to="/login" onClick={(event) => navigateWithFade(event, "/login")} className="hidden text-[15px] font-semibold text-blue-700 transition hover:text-blue-900 md:block">Войти</Link>
            <Link to="/register" onClick={(event) => navigateWithFade(event, "/register")} className="hidden rounded-lg bg-blue-600 px-5 py-3 text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-blue-700 md:inline-flex">Попробовать</Link>
            <button className="lg:hidden" aria-label={isMenuOpen ? "Закрыть меню" : "Открыть меню"} onClick={() => setIsMenuOpen((current) => !current)} type="button">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className={`absolute right-0 top-[56px] hidden w-[420px] rounded-[24px] border border-slate-200/80 bg-white p-3 shadow-[0_28px_90px_rgba(11,39,68,0.18)] transition duration-300 md:block ${isSearchOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"}`}>
              <div className="flex items-center gap-3 rounded-[18px] bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                <Search size={18} className="text-blue-700" />
                <input
                  className="w-full bg-transparent text-sm font-semibold text-[#0b2744] outline-none placeholder:text-slate-400"
                  autoFocus={isSearchOpen}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      closeSearch();
                    }
                  }}
                  placeholder="Найти раздел, тариф или документ"
                  value={searchQuery}
                />
                <button className="text-slate-400 transition hover:text-[#0b2744]" onClick={closeSearch} type="button" aria-label="Закрыть поиск">
                  <X size={17} />
                </button>
              </div>
              <div className="mt-3 max-h-[360px] overflow-auto">
                {searchResults.length > 0 ? (
                  <div className="grid gap-1.5">
                    {searchResults.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        data-search-result={item.href}
                        className="group rounded-[18px] px-4 py-3 transition hover:bg-blue-50"
                        onClick={closeSearch}
                      >
                        <div className="text-sm font-bold text-[#0b2744] transition group-hover:text-blue-700">{item.label}</div>
                        <div className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500">{item.description}</div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[18px] bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">
                    Ничего не найдено. Попробуйте “сроки”, “тарифы” или “политика”.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={`border-t border-white/40 bg-[#eef2f6]/96 px-5 shadow-[0_24px_60px_rgba(11,39,68,0.10)] transition duration-300 lg:hidden ${isMenuOpen ? "max-h-[520px] py-5 opacity-100" : "max-h-0 overflow-hidden py-0 opacity-0"}`}>
          <div className="mx-auto grid max-w-[1220px] gap-2">
            {[...featureLinks, { label: "Как начать", href: "/how-to-start" }, { label: "Тарифы", href: "/pricing" }].map((item) => (
              <Link key={item.href} to={item.href} className="rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold text-[#0b2744]" onClick={() => setIsMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
            <Link to="/login" onClick={(event) => navigateWithFade(event, "/login")} className="rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold text-blue-700">
              Войти
            </Link>
            <Link to="/register" onClick={(event) => navigateWithFade(event, "/register")} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">
              Попробовать
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

export function MarketingFooter() {
  return (
    <footer className="mx-auto grid max-w-[1220px] gap-10 px-5 pb-16 pt-8 text-sm text-slate-600 md:grid-cols-5">
      {footerColumns.map((column) => (
        <div key={column.title}>
          <div className="font-bold text-[#0b2744]">{column.title}</div>
          <div className="mt-4 space-y-3">
            {column.links.map((link) => (
              <Link key={link.href} to={link.href} className="block transition hover:translate-x-1 hover:text-blue-700">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
      <div>
        <div className="font-bold text-[#0b2744]">Поддержка</div>
        <a href="mailto:help@resportal.ru" className="mt-4 block font-semibold text-[#0b2744] transition hover:text-blue-700">help@resportal.ru</a>
        <div className="mt-2">Ежедневно с 8:00 до 20:00</div>
      </div>
    </footer>
  );
}
