import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { marketingPages } from "../pages/marketingData";
import { seoLandings } from "../pages/seoLandingData";

type SeoEntry = {
  title: string;
  description: string;
  keywords: string;
};

const siteUrl = "https://resportal.ru";
const defaultSeo: SeoEntry = {
  title: "РЕСПОРТАЛ — CRM для юристов, учет дел, сроков, клиентов и документов",
  description: "LegalTech CRM для частных юристов и юридических команд: реестр дел, процессуальные сроки, задачи, клиенты, документы, календарь, роли и контроль доступа.",
  keywords: "CRM для юристов, юридическая CRM, учет судебных дел, процессуальные сроки, legaltech, программа для юриста"
};

const seoByPath: Record<string, SeoEntry> = {
  "/": defaultSeo,
  "/how-to-start": {
    title: "Как начать работу в РЕСПОРТАЛЕ — запуск юридической CRM",
    description: "Пошаговый старт в РЕСПОРТАЛЕ: регистрация, рабочее пространство, клиенты, дела, сроки, задачи, документы и демо-данные.",
    keywords: "как начать юридическую CRM, программа для юриста старт, учет дел для юриста"
  },
  "/pricing": {
    title: "Тарифы РЕСПОРТАЛА — Free, Solo, Team и Firm для юристов",
    description: "Тарифы юридической CRM РЕСПОРТАЛ: бесплатный старт, Solo для частного юриста, Team для команды и Firm для юридической фирмы.",
    keywords: "тарифы CRM для юристов, legaltech цена, программа для юридической фирмы стоимость"
  },
  "/company/privacy": {
    title: "Политика и правовые документы РЕСПОРТАЛА",
    description: "Правовые документы, политика обработки данных, контакты и сведения о сервисе РЕСПОРТАЛ для пользователей юридической CRM.",
    keywords: "политика конфиденциальности legaltech, правовые документы SaaS, РЕСПОРТАЛ"
  }
};

function getSeo(pathname: string): SeoEntry {
  const direct = seoByPath[pathname];
  if (direct) return direct;

  const page = marketingPages[pathname];
  if (page) {
    return {
      title: `${page.title} — РЕСПОРТАЛ`,
      description: page.description,
      keywords: `${page.title}, CRM для юристов, РЕСПОРТАЛ, legaltech, юридическая практика`
    };
  }

  const landing = seoLandings.find((item) => pathname === `/solutions/${item.slug}`);
  if (landing) {
    return {
      title: `${landing.title} — РЕСПОРТАЛ`,
      description: landing.lead,
      keywords: `${landing.title}, CRM для юристов, юридическая CRM, учет дел, процессуальные сроки, РЕСПОРТАЛ`
    };
  }

  return defaultSeo;
}

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
}

function upsertLink(selector: string, attrs: Record<string, string>) {
  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element) {
    element = document.createElement("link");
    document.head.appendChild(element);
  }

  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
}

export function Seo() {
  const location = useLocation();

  useEffect(() => {
    const seo = getSeo(location.pathname);
    const canonical = `${siteUrl}${location.pathname === "/" ? "/" : location.pathname}`;
    document.title = seo.title;

    upsertMeta('meta[name="description"]', { name: "description", content: seo.description });
    upsertMeta('meta[name="keywords"]', { name: "keywords", content: seo.keywords });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: seo.title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: seo.description });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: seo.title });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: seo.description });
    upsertLink('link[rel="canonical"]', { rel: "canonical", href: canonical });
  }, [location.pathname]);

  return null;
}
