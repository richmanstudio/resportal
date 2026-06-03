# РЕСПОРТАЛ

SaaS-платформа для частнопрактикующих юристов и небольших юридических фирм.

## Стек

- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router.
- Backend: Express, TypeScript, Prisma, PostgreSQL.
- Infrastructure: Docker Compose, PostgreSQL, Redis, MinIO.

## Быстрый старт

```bash
npm install
copy .env.example .env
docker compose -p resportal up -d postgres redis minio
npm run prisma:generate
npm run prisma:migrate
npm run build
npm run dev
```

Frontend: `http://localhost:5173`

API: `http://localhost:4000/health`

If Docker Hub is slow, PostgreSQL is enough for database work:

```bash
docker compose -p resportal up -d postgres
npm --workspace apps/api run prisma:deploy
```

## Структура

```text
apps/
  api/     Express API, Prisma schema, auth, tenant middleware
  web/     React application shell
packages/
  shared/  shared Zod schemas and TypeScript types
  ui/      reserved for reusable UI package
docs/
docker/
```

## MVP-фокус

Целевой пользователь MVP: частнопрактикующий юрист или небольшая юридическая фирма, которым нужно вести клиентов, судебные дела, документы, задачи и процессуальные сроки без сложной корпоративной системы.

Основной пользовательский путь MVP:

```text
регистрация -> организация -> клиенты -> дела -> стороны -> задачи и сроки -> календарь -> документы -> DOCX -> команда -> оплата
```

В первой версии реализуются пользователи, организации, роли, клиенты, судебные дела, стороны дела, документы, сроки, задачи, календарные события, приглашения сотрудников, тарифы и базовый генератор DOCX.

Не входит в MVP:

- AI-функции.
- Интеграции с судебными системами.
- Мобильное приложение.
- Микросервисы.
- Сложная BI-аналитика.

Обязательные экраны MVP:

- Регистрация и вход.
- Дашборд.
- Клиенты и карточка клиента.
- Дела и карточка дела.
- Стороны дела.
- Документы.
- Задачи и процессуальные сроки.
- Календарь.
- Настройки организации, сотрудников и тарифов.

## Подписки

Для российского рынка используется YooKassa. Backend создает платеж через API YooKassa, возвращает ссылку подтверждения оплаты, а webhook `payment.succeeded` активирует тариф на 30 дней.

Нужные переменные:

```env
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
BILLING_RETURN_URL=http://localhost:5173/settings?billing=return
```

Webhook URL для YooKassa: `https://<domain>/api/webhooks/yookassa`.
