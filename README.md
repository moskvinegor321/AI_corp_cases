# AION — генератор историй про ИИ в компаниях

Мини‑приложение на Next.js 14 (App Router, TS) + Tailwind + Prisma (Postgres) для генерации и модерации коротких историй о том, как компании используют ИИ.

## Быстрый старт

1) Установите зависимости:

```bash
npm i
```

2) Заполните `.env` (см. переменные ниже) и примените миграции:

```bash
# создайте .env из примера
cp .env.example .env
# отредактируйте DATABASE_URL и ключи

npx prisma migrate deploy
npx prisma generate
```

3) Запуск в dev:

```bash
npm run dev
```

Откройте `http://localhost:3000`.

## Переменные окружения

```env
DATABASE_URL=postgresql://...

# OpenAI
OPENAI_API_KEY=...        # TODO: Add to .env
OPENAI_MODEL=gpt-4.1-mini
MAX_CONTEXT_TITLES=200
GENERATE_N=5

# Search
SEARCH_PROVIDER=newsapi|serper|tavily
NEWSAPI_KEY=...           # TODO: Add to .env
SERPER_API_KEY=...        # TODO: Add to .env
TAVILY_API_KEY=...        # TODO: Add to .env

# Deduplication
EXCLUDE_REJECTED=false
SIMILARITY_THRESHOLD=0.82

# Security
ADMIN_TOKEN=supersecret   # TODO: Add to .env
# (опционально для клиента — только для локальных тестов)
NEXT_PUBLIC_ADMIN_TOKEN=supersecret
```

НИКОГДА не коммитьте реальные секреты. Используйте Vercel Project Env для продакшна.

## API

Аутентификация для мутаций: заголовок `x-admin-token: ${ADMIN_TOKEN}`.

- POST `/api/generate` — сгенерировать N историй (по умолчанию 5)
- GET `/api/stories?status=triage|published|rejected` — список с подсчётами
- PATCH `/api/stories/:id` — `{ action: "publish"|"reject"|"triage" }`

Пример curl:

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"n":5}'
```

## Деплой на Vercel

1) Подключите репозиторий в Vercel
2) В Settings → Environment Variables задайте переменные из `.env`
3) Настройте БД (Neon либо Vercel Postgres) и `DATABASE_URL`
4) В Build Command оставьте значение по умолчанию, пост‑деплой миграции:

```bash
npx prisma migrate deploy && npx prisma generate
```

## Примечания по архитектуре

- Prisma Client генерируется в `src/generated/prisma`
- Утилиты: `src/lib/{db,slug,dedupe}`
- Поисковые провайдеры: `src/lib/search/*`
- LLM: `src/lib/llm/generateStories.ts`
- API: `src/app/api/*`
- UI: `src/components/*`, страница `src/app/page.tsx`

## Seed (опционально)

Добавьте сидер `prisma/seed.ts` с примерами и выполните `npx prisma db seed`.
