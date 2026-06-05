# Design: Cortex v4 — Workspace for Hermes Collaboration

**Дата:** 05.06.2026  
**Автор:** Евгений + Hermes (gstack-office-hours, Builder Mode)  
**Статус:** DRAFT  
**Mode:** Builder  
**Supersedes:** `/root/plans/cortex/office-hours-design-v3.md` (APPROVED, June 5)

---

## Problem Statement

Cortex v3 был спроектирован как мощное рабочее пространство (canvas-сетка, 10 таблиц БД, 25 API-эндпоинтов, RSS/Telegram-пайплайны). Но:

- **Нет инструкции как поставить и запустить** — между дизайн-доком и работающим инструментом пропасть
- **Порог входа слишком высокий** — 450 строк дизайна, 0 строк работающего кода
- **Стек нестабилен** — rspack-интеграция с TanStack Start сломана, пришлось fallback на Vite
- **SSR не нужен** — это personal workspace, не публичный сайт

**Корневая проблема:** Слишком много «что должно быть» и слишком мало «как это поставить за 5 минут».

---

## What Makes This Cool

Cortex = веб-интерфейс где человек и Hermes работают вместе. Не переписка в Telegram, а **рабочий стол с чатом, страницами и блоками**.

- Открыл → чат с Hermes (контекст: текущий топик + структура workspace)
- Hermes видит твои страницы и может добавлять/редактировать блоки
- Всё на одном экране: топики слева, контент в центре, чат справа
- **Setup за 2 команды:** `git clone && bash setup.sh && pnpm dev`

---

## Constraints

| Что | Выбор |
|-----|-------|
| Язык | TypeScript full-stack |
| Хостинг | Ubuntu VPS (рядом с Hermes), self-hosted |
| Клиенты | Веб-интерфейс (основной) + Telegram (уведомления) |
| Фреймворк | React 19 + Vite + TanStack Router (SPA, без SSR) |
| UI | Mantine v9 |
| Бэкенд | Hono (Web-standard API, работает с Vite) |
| БД | SQLite (better-sqlite3 + Drizzle ORM) |
| Hermes | HTTP API + WebSocket |
| Авторизация | localhost-only для MVP, доступ через Tailscale |

---

## Validated Premises

| # | Premise | Вердикт |
|---|---------|---------|
| P1 | Полный ребилд с нуля, Cortex v2/v3 в архив | ✅ |
| P2 | SPA без SSR — SSR не нужен для personal workspace | ✅ |
| P3 | React + Vite + TanStack Router (не TanStack Start) | ✅ |
| P4 | Hono как бэкенд — лёгкий, Web-standard, хорош с Vite | ✅ |
| P5 | Вертикальный лендинг страниц (не canvas/grid) для v1 | ✅ |
| P6 | Отложить RSS/Telegram-пайплайны до v2 | ✅ |
| P7 | Отдельный репозиторий с простым setup-скриптом | ✅ |

---

## Recommended Approach: Cortex v4

### Архитектура

```
┌─────────────────────────────────────────────────┐
│                  Cortex v4                       │
│                                                  │
│  localhost:3000 (один процесс)                   │
│  ┌──────────┬──────────────────────┬──────────┐ │
│  │  Topics  │     Page Content     │  Hermes  │ │
│  │  (слева) │     (центр)          │  Chat    │ │
│  │          │  ┌────────────────┐  │ (справа) │ │
│  │ Здоровье │  │ Markdown Block │  │          │ │
│  │ Обучение │  │ Markdown Block │  │ > привет │ │
│  │ Работа   │  │ Markdown Block │  │          │ │
│  │          │  └────────────────┘  │          │ │
│  └──────────┴──────────────────────┴──────────┘ │
│                                                  │
│  Vite dev server (:3000)                         │
│    ↓ /api/* прокси                               │
│  Hono server (внутренний)                        │
│    ↓ Drizzle ORM                                 │
│  SQLite (better-sqlite3, WAL)                    │
│    ↓ WebSocket (/ws/chat)                        │
│  Hermes (внешний, localhost:XXXX)                │
└─────────────────────────────────────────────────┘
```

### Стек

| Слой | Выбор | Почему |
|------|-------|--------|
| Frontend | React 19 + Vite | Быстрая сборка, HMR, знакомо |
| Routing | TanStack Router | Type-safe, file-based |
| UI | Mantine v9 | Знакомый, хорошая интеграция с React |
| Backend | Hono | Web-standard, работает с Vite middleware |
| DB | SQLite (better-sqlite3 + Drizzle) | Один файл, WAL, FTS5 |
| Realtime | WebSocket (ws) | Чат с Hermes |
| Hermes API | HTTP + WebSocket | REST для CRUD, WS для чата |

### Модель данных (MVP)

```sql
topics (
  id, slug, title, icon, sort_order,
  created_at, updated_at
)

pages (
  id, topic_id, slug, title, sort_order,
  created_at, updated_at
)

blocks (
  id, page_id, type, content_json, sort_order,
  created_by,  -- 'user' | 'hermes'
  created_at, updated_at
)
-- type: 'markdown' | 'todo' | 'divider' (MVP)
-- content_json:
--   markdown: { "text": "string" }
--   todo:     { "items": [{"text": "...", "done": false}] }
--   divider:  {}
```

### API (MVP)

```
GET    /api/topics
POST   /api/topics
PATCH  /api/topics/:id

GET    /api/pages?topic=...
POST   /api/pages
PATCH  /api/pages/:id

GET    /api/blocks?page=...
POST   /api/blocks
PATCH  /api/blocks/:id
DELETE /api/blocks/:id

GET    /api/health
GET    /api/search?q=...

WebSocket:
  /ws/chat    ← чат с Hermes
```

### Интерфейс

```
┌──────────────────────────────────────────────┐
│ 🧠 Cortex                          ⚙️ [eva] │
├────────┬──────────────────────┬──────────────┤
│ Topics │  Page: Здоровье      │ 💬 Hermes    │
│        │                      │              │
│ 🏠 Гл  │ ┌──────────────────┐ │ > Что у меня │
│ ❤️ Зд  │ │ 📝 План питания  │ │ сегодня?    │
│ 📚 Об  │ │ завтрак: овсянка │ │              │
│ 💼 Ра  │ │ обед: курица+рис │ │ > Добавь     │
│        │ └──────────────────┘ │ задачу       │
│  +new  │ ┌──────────────────┐ │ купить прод  │
│        │ │ 🏃 Тренировка    │ │              │
│        │ │ ходьба 8 км ✓    │ └──────────────│
│        │ └──────────────────┘ │              │
│        │ [+ Добавить блок]    │              │
└────────┴──────────────────────┴──────────────┘
```

- **Слева:** список топиков, кнопка «+ новый»
- **Центр:** страница с блоками (вертикальный лендинг)
- **Справа:** чат с Hermes (WebSocket, контекст текущего топика)

### Setup

```bash
git clone git@github.com:effgenij/cortex.git
cd cortex
bash setup.sh      # pnpm install, создаёт .env, init БД
pnpm dev           # http://localhost:3000
```

### Структура проекта

```
cortex/
├── setup.sh
├── package.json
├── vite.config.ts          # Vite + TanStack Router plugin + /api proxy → Hono
├── tsconfig.json
├── src/
│   ├── main.tsx            # entry
│   ├── router.tsx          # TanStack Router
│   ├── routes/
│   │   ├── __root.tsx      # shell: sidebar + chat + outlet
│   │   ├── index.tsx       # dashboard (первый топик)
│   │   └── topics.$slug.tsx
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── Chat.tsx
│   │   ├── BlockEditor.tsx
│   │   └── blocks/
│   │       ├── MarkdownBlock.tsx
│   │       └── TodoBlock.tsx
│   ├── api/
│   │   └── client.ts       # typed fetch-wrapper для /api/*
│   └── db/
│       ├── schema.ts       # Drizzle schema
│       └── index.ts        # DB connection
├── server/
│   ├── index.ts            # Hono server entry
│   ├── routes/
│   │   ├── topics.ts
│   │   ├── pages.ts
│   │   ├── blocks.ts
│   │   └── chat.ts         # WebSocket /ws/chat
│   └── hermes.ts           # Hermes API client
└── drizzle/
    └── migrations/
```

---

## Success Criteria

1. **Setup за 2 команды:** `git clone && bash setup.sh && pnpm dev` → открывается localhost:3000
2. **Чат работает:** написал Hermes → получил ответ (как в TG, но в веб-интерфейсе)
3. **Блоки создаются:** добавил markdown-блок → отредактировал → сохранилось в SQLite
4. **Топики переключаются:** кликнул «Здоровье» → страницы и чат обновились
5. **Hermes видит workspace:** команда «добавь задачу» → появился todo-блок

---

## What's Deferred to v2

- Canvas/grid layout с drag-n-drop (MVP: вертикальный лендинг)
- RSS/Telegram source pipeline
- Calendar-блоки
- Chart-блоки
- Yjs CRDT
- Email/Redmine/YouTube-источники
- PWA
- Мобильная версия

---

## Next Steps

1. **Scaffold:** React + Vite + TanStack Router + Mantine v9 → pnpm dev открывается
2. **Hono backend:** /api/health, SQLite + Drizzle init через setup.sh
3. **DB Schema:** topics, pages, blocks — Drizzle migrations
4. **API CRUD:** topics, pages, blocks через Hono
5. **WebSocket:** /ws/chat → проксирует запросы к Hermes API, стримит ответ
6. **UI Shell:** Sidebar + Chat + Page Content (layout)
7. **Первый блок:** MarkdownBlock — создать, редактировать, сохранить
8. **Hermes context:** при открытии страницы → WS получает структуру workspace
9. **Setup script:** setup.sh (pnpm install, .env, db init, migrations)
10. **README:** инструкция по установке и использованию

---

## What I noticed about how you think

- «Причина в том что нет инструкции» — ты очень практичный. Тебе не нужен дизайн на 10 страниц, тебе нужно работающее решение с понятным setup
- Ты дважды повторил «Cortex = рабочее пространство для совместной работы с Hermes» — это твоя северная звезда. Не модули, не пайплайны, а совместная работа
- Ты готов откладывать фичи (canvas, RSS) ради того чтобы сначала получить работающий продукт — это дисциплина, которая спасает проекты от «вечного строительства»
- «Один HTML — дикость, но SSR не нужен» — у тебя хорошее чутьё на золотую середину: ни переусложнять, ни переупрощать

---

## Reviewer Notes

Этот дизайн — результат повторных office-hours после того как v3 был признан слишком сложным для реализации. Ключевое изменение: **narrow wedge** — только чат + блоки + топики, без canvas/grid и source-пайплайнов. Упор на setup: `git clone && bash setup.sh && pnpm dev` должен работать с первой попытки.
