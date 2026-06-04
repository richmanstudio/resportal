import react from "@vitejs/plugin-react";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, type PluginOption } from "vite";

type PrerenderRoute = {
  path: string;
  title: string;
  description: string;
  keywords: string;
};

const prerenderRoutes: PrerenderRoute[] = [
  {
    path: "/",
    title: "РЕСПОРТАЛ — CRM для юристов, учет дел, сроков, клиентов и документов",
    description: "LegalTech CRM для частных юристов и юридических команд: реестр дел, процессуальные сроки, задачи, клиенты, документы, календарь, роли и контроль доступа.",
    keywords: "CRM для юристов, юридическая CRM, учет судебных дел, процессуальные сроки, legaltech"
  },
  {
    path: "/pricing",
    title: "Тарифы РЕСПОРТАЛА — Free, Solo, Team и Firm для юристов",
    description: "Тарифы юридической CRM РЕСПОРТАЛ: бесплатный старт, Solo для частного юриста, Team для команды и Firm для юридической фирмы.",
    keywords: "тарифы CRM для юристов, legaltech цена, программа для юридической фирмы стоимость"
  },
  {
    path: "/how-to-start",
    title: "Как начать работу в РЕСПОРТАЛЕ — запуск юридической CRM",
    description: "Пошаговый старт в РЕСПОРТАЛЕ: регистрация, рабочее пространство, клиенты, дела, сроки, задачи, документы и демо-данные.",
    keywords: "как начать юридическую CRM, программа для юриста старт, учет дел для юриста"
  },
  {
    path: "/company/privacy",
    title: "Правовые документы РЕСПОРТАЛА",
    description: "Пользовательское соглашение, политика обработки персональных данных, безопасность, хранение документов и порядок удаления данных.",
    keywords: "политика конфиденциальности legaltech, правовые документы SaaS, РЕСПОРТАЛ"
  },
  {
    path: "/solutions/crm-dlya-yuristov",
    title: "CRM для юристов — РЕСПОРТАЛ",
    description: "CRM для юристов: дела, клиенты, сроки, документы и задачи в одной системе для частной практики и юридической команды.",
    keywords: "CRM для юристов, юридическая CRM, программа для юриста"
  },
  {
    path: "/solutions/uchet-sudebnyh-del",
    title: "Учет судебных дел — РЕСПОРТАЛ",
    description: "Учет судебных дел: карточка дела, суд, клиент, стороны, документы, задачи и процессуальные сроки.",
    keywords: "учет судебных дел, программа для судебных дел, реестр дел юриста"
  },
  {
    path: "/solutions/processualnye-sroki",
    title: "Контроль процессуальных сроков — РЕСПОРТАЛ",
    description: "Контроль процессуальных сроков для юристов: просрочка, приоритеты, ответственные и email-напоминания.",
    keywords: "процессуальные сроки, контроль сроков юриста, дедлайны судебных дел"
  },
  {
    path: "/solutions/programma-dlya-yurista",
    title: "Программа для юриста — РЕСПОРТАЛ",
    description: "Программа для юриста: дела, клиенты, документы, задачи и сроки без сложной корпоративной системы.",
    keywords: "программа для юриста, сервис для юриста, legaltech CRM"
  },
  {
    path: "/solutions/crm-dlya-yuridicheskoy-firmy",
    title: "CRM для юридической фирмы — РЕСПОРТАЛ",
    description: "CRM для юридической фирмы: единая база дел, командные роли, документы, сроки и контроль работы юристов.",
    keywords: "CRM для юридической фирмы, программа для юридической компании, учет дел фирмы"
  }
];

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("\"", "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function prerenderPublicRoutes(): PluginOption {
  return {
    name: "resportal-prerender-public-routes",
    apply: "build",
    async closeBundle() {
      const distDir = path.resolve(__dirname, "dist");
      const indexPath = path.join(distDir, "index.html");
      const template = await fs.readFile(indexPath, "utf8");

      await Promise.all(prerenderRoutes.map(async (route) => {
        const canonical = `https://resportal.ru${route.path === "/" ? "/" : route.path}`;
        const html = template
          .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(route.title)}</title>`)
          .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeHtml(route.description)}" />`)
          .replace(/<meta\s+name="keywords"\s+content="[^"]*"\s*\/>/, `<meta name="keywords" content="${escapeHtml(route.keywords)}" />`)
          .replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${canonical}" />`)
          .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${escapeHtml(route.title)}" />`)
          .replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/, `<meta property="og:description" content="${escapeHtml(route.description)}" />`)
          .replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonical}" />`);

        const outputDir = route.path === "/" ? distDir : path.join(distDir, route.path.slice(1));
        await fs.mkdir(outputDir, { recursive: true });
        await fs.writeFile(path.join(outputDir, "index.html"), html);
      }));
    }
  };
}

export default defineConfig({
  plugins: [react(), prerenderPublicRoutes()],
  resolve: {
    alias: {
      "@resportal/shared": fileURLToPath(new URL("../../packages/shared/src", import.meta.url))
    }
  },
  server: {
    port: 5173
  }
});
