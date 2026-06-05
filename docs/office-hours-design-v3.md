# Design: Cortex v3 — Page-based Workspace

**Дата:** 05.06.2026
**Автор:** Евгений + Hermes (gstack-office-hours, Builder Mode)
**Статус:** DRAFT
**Mode:** Builder
**Supersedes:** `/root/plans/cortex/office-hours-design.md` (v1, June 3) и `/root/plans/cortex/ceo-plan.md` (v2, June 3)

---

## Problem Statement

Cortex v1/v2 собрал 8 фаз функционала (курсы, заметки, задачи, календарь, инбокс, оркестратор), но не используется. Причины:

- Нет единого интерфейса — модули разрознены (notes, tasks, calendar — отдельные страницы)
- Hermes не понимает структуру workspace — не знает, куда писать
- Настройка и запуск непонятны — «я не понимаю что это и как ставить и как пользоваться»
- Контент не сгруппирован по темам — всё лежит вперемешку
- Нет синхронизации с внешними источниками (почта, Redmine, Telegram)
- Интерфейс чата неудобен для совместной работы

**Корневая проблема:** Cortex был спроектирован как набор модулей, а не как рабочее пространство. Не хватает metaphor — единой ментальной модели, как Notion.

---

## What Makes This Cool

> «Если будет удобно обмениваться данными с Hermes, чтобы разговаривать им на одном языке, и визуализировать данные удобно для их усваивания»

**Суть:** Workspace, где человек и AI-агент работают в одном пространстве, на одном языке, с одними данными. Не переписка в чате — а совместная работа над страницами.

Ты создаёшь структуру (топики → страницы), Hermes наполняет её контентом из RSS и Telegram. Ты редактируешь — Hermes видит изменения через WebSocket-уведомления. Hermes добавляет блоки — ты видишь их сразу.

**10x против обычного Notion:** Notion требует ручного наполнения. Cortex сам разбирает RSS-ленты и Telegram-каналы, раскладывает по топикам и создаёт задачи/заметки. Ты открываешь — всё уже готово.

---

## Constraints

- **Язык:** TypeScript full-stack (один язык на фронте и бэке — shared Zod-схемы и типы)
- **Хостинг:** Ubuntu VPS (та же машина где Hermes), self-hosted
- **Клиенты:** веб-интерфейс (основной) + Telegram (для уведомлений и быстрых команд)
- **Фреймворк:** TanStack Start + rspack (не Vite)
- **UI:** Mantine v9
- **Хранение:** SQLite (better-sqlite3, WAL-режим) — единственный источник правды для структурированных данных. Markdown-файлы на диске — только для экспорта/импорта (v3.1)
- **Hermes-интеграция:** HTTP API + WebSocket (чат). Все cron-задачи обходят API, не пишут в БД напрямую
- **Realtime:** WebSocket-уведомления об изменениях (v3.0). Yjs CRDT — v3.1
- **Клиенты:** браузер на Windows (работа) и MacBook (дом) → HTTPS к Cortex на VPS через Tailscale. Данные централизованы на VPS, синхронизации между машинами нет
- **Авторизация:** localhost-only для MVP, доступ через Tailscale/SSH-туннель. Без встроенной auth

---

## Validated Premises

| # | Premise | Вердикт |
|---|---------|---------|
| P1 | Полный rebuild с нуля, 8 фаз Cortex v2 в архив | ✅ Принято |
| P2 | TanStack Start + rspack вместо Next.js + Turbopack | ✅ Принято |
| P3 | Page-based блоки (как Notion), не модули | ✅ Принято |
| P4 | CRDT для одновременного редактирования человеком и агентом | ⚠️ v3.1 — MVP использует optimistic locking + WS-уведомления |
| P5 | SQLite — единственный источник правды, без Markdown-файлов | ✅ Принято |
| P6 | Hermes skills для понимания структуры workspace | ✅ Нужны |
| P7 | Готовность к сложности CRDT и page-based модели | ✅ Принято |

---

## Approaches Considered

### Approach A: Эволюция текущего Cortex
Поверх модулей — слой топиков и вкладок. Чат, API, Obsidian-sync сохраняются.

**Решение:** ❌ Отклонено. Модульная архитектура не даёт гибкости Notion-подобного workspace. Топик ≠ фильтр — топик это страница с любыми блоками.

### Approach B: Page-based workspace с нуля (TanStack Start + rspack)
Страницы и блоки как в Notion. Единый интерфейс с вкладками-топиками, чатом Hermes и конструктором страниц.

**Решение:** ✅ Выбрано.

---

## Recommended Approach: Cortex v3

### Архитектурный обзор

```
┌─────────────────────────────────────────────────────────┐
│                    Cortex v3                            │
│                                                         │
│  ┌──────────┐  ┌──────────────────────────────────┐    │
│  │  Topics  │  │            Page Content           │    │
│  │  Tabs    │  │  ┌──────┐ ┌──────┐ ┌──────────┐  │    │
│  │ ──────── │  │  │ MD   │ │ Todo │ │ Feed     │  │    │
│  │ Здоровье │  │  │Block │ │Block │ │ Widget   │  │    │
│  │ Обучение │  │  └──────┘ └──────┘ └──────────┘  │    │
│  │ Работа   │  │  └──────┘ └──────┘ └──────────┘  │    │
│  │ Новости  │  │  ┌──────────────────────────┐     │    │
│  │ ...      │  │  │  Dashboard Widgets       │     │    │
│  └──────────┘  │  └──────────────────────────┘     │    │
│                └──────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Hermes Chat (WS)                    │   │
│  │  > добавь задачу на завтра                      │   │
│  │  > разбери RSS                                  │   │
│  │  > что у меня сегодня?                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Source Pipeline (фон)                  │   │
│  │  RSS → Telegram                                  │   │
│  │        ↓ Hermes разбирает                        │   │
│  │        ↓ раскладывает по топикам                 │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Технический стек

| Слой | Выбор | Обоснование |
|------|-------|-------------|
| Framework | TanStack Start | SSR, file-based routing, типы из коробки |
| Bundler | rspack (через Vinxi) | Быстрее Vite, Rust-based, совместим с webpack-плагинами |
| UI | Mantine v9 | Знакомый, хорошая интеграция с React |
| DB | SQLite (better-sqlite3) | Единый источник правды, WAL-режим для конкурентного чтения |
| Realtime | WebSocket (ws) | Чат + уведомления об изменениях блоков |
| Hermes API | HTTP REST + WebSocket | REST для CRUD, WS для чата и уведомлений |
| Search | SQLite FTS5 | Полнотекстовый поиск по блокам и задачам |

### Модель данных (SQLite)

```sql
-- Топик = как вкладка в Notion
topics (
  id, slug, title, icon, color, sort_order,
  created_at, updated_at, deleted_at   -- soft delete
)

-- Страница внутри топика
pages (
  id, topic_id, slug, title, icon, sort_order,
  created_at, updated_at, deleted_at
)

-- Блок/Виджет на canvas-странице
blocks (
  id, page_id, type, content_json,
  grid_x, grid_y, grid_w, grid_h,   -- позиция на гриде (12 колонок)
  created_by,  -- 'user' | 'hermes'
  created_at, updated_at
)
-- type: markdown | todo | feed | divider
-- grid_x: 0-11, grid_y: 0..N, grid_w: 1-12, grid_h: 1..N
-- При добавлении через Hermes: автоматический поиск свободного места

-- content_json схемы по типам:
-- markdown:  { "text": "string" }
-- todo:      { "items": [{"text": "string", "done": false}] }
-- feed:      { "source": "rss|telegram", "max_items": 20 }
-- divider:   {}

-- Задачи (для Hermes и todo-блоков)
tasks (
  id, block_id, title, status, priority, due_date,
  source_type, source_id, topic_id,
  created_at, updated_at, deleted_at
)
-- status: todo | in_progress | done | cancelled
-- priority: 1 (высокий) | 2 (средний) | 3 (низкий)

-- События календаря
events (
  id, title, description, start_date, end_date, all_day,
  topic_id, created_at, updated_at, deleted_at
)

-- Внешние источники
sources (
  id, type, config_json, enabled, last_sync_at
)
-- type: rss | telegram
-- config_json:
--   rss:      { "url": "https://...", "name": "..." }
--   telegram: { "channels": ["@channel1"], "api_id": N, "api_hash": "..." }

-- Входящие элементы из источников
inbox_items (
  id, source_id, title, url, raw_content, status,
  assigned_topic_id,   -- Hermes определил топик
  extracted_json,       -- что Hermes извлёк
  processing_error,     -- текст ошибки если разбор не удался
  retry_count DEFAULT 0,
  created_at, processed_at
)
-- status: new | processing | processed | failed | archived
-- extracted_json:
--   { "type": "task",     "data": {"title": "...", "topic": "работа", "due": "..."} }
--   { "type": "note",     "data": {"title": "...", "topic": "обучение", "text": "..."} }
--   { "type": "event",    "data": {"title": "...", "start": "...", "end": "..."} }
--   { "type": "bookmark", "data": {"url": "...", "title": "...", "topic": "новости"} }

-- Фид-лента (агрегация нового из источников)
-- Feed-блок (type=feed) — это view над feed_items, сгруппированных по topic_id
feed_items (
  id, source_id, topic_id, title, summary, url, published_at
)
-- topic_id заполняется Hermes при обработке inbox

-- Поисковый индекс
search_index VIRTUAL TABLE USING fts5(
  title, content, source_type, source_id
  -- source_type: 'block' | 'task' | 'event' | 'feed_item'
  -- source_id указывает на конкретную запись
)

-- Вложения
attachments (
  id, block_id, filename, mime_type, size_bytes, file_path,
  created_at
)
-- Файлы хранятся в ~/.cortex/attachments/
```

### API

```
REST:
  GET    /api/topics
  POST   /api/topics
  PATCH  /api/topics/:id
  DELETE /api/topics/:id

  GET    /api/pages?topic=...
  POST   /api/pages
  PATCH  /api/pages/:id
  DELETE /api/pages/:id

  GET    /api/blocks?page=...
  POST   /api/blocks              ← Hermes добавляет виджет (авто-позиция)
  PATCH  /api/blocks/:id
  DELETE /api/blocks/:id
  PATCH  /api/blocks/reposition   ← { page_id, blocks: [{id, grid_x, grid_y, grid_w, grid_h}] }

  GET    /api/tasks?topic=...&due=today|week|overdue
  POST   /api/tasks
  PATCH  /api/tasks/:id
  DELETE /api/tasks/:id

  GET    /api/events?from=...&to=...
  POST   /api/events
  PATCH  /api/events/:id
  DELETE /api/events/:id

  GET    /api/feed?topic=...&limit=20

  GET    /api/sources
  POST   /api/sources
  POST   /api/sources/:id/sync    ← триггер синхронизации (RSS fetch / Telegram collect)

  GET    /api/inbox?status=new&limit=50
  POST   /api/inbox/:id/process   ← Hermes разбирает элемент
  PATCH  /api/inbox/:id/archive
  DELETE /api/inbox/:id

  GET    /api/today                ← сводка на сегодня (дашборд)
  GET    /api/search?q=...&type=block|task|event|all
  GET    /api/health               ← healthcheck

  POST   /api/attachments          ← multipart upload

WebSocket:
  /ws/chat      ← чат с Hermes (контекст: текущий топик + структура workspace)
  /ws/events    ← уведомления: block_updated, task_created, inbox_processed
```

### Интерфейс

Центральная область — **canvas с сеткой** (как дашборд-билдер). Виджеты и блоки свободно размещаются, привязываются к сетке, растягиваются. Не линейный скролл — а пространство, которое можно организовать визуально.

```                                                          
┌─────────────────────────────────────────────────────┐     
│ 🧠 Cortex                    🔔  ⚙️  [eva]         │     
├──────────┬─────────────────────────────┬────────────┤     
│ 🏠 Главная│  ┌──────────┐ ┌──────────┐ │ 💬 Hermes  │     
│ ❤️ Здоров │  │ 📝 План   │ │ 🏃 Трени- │ │            │     
│ 📚 Обучен │  │ питания   │ │ ровка    │ │ > Что у    │     
│ 💼 Работа │  │ завтрак:  │ │ Сегодня: │ │ меня       │     
│ 📰 Новости│  │ овсянка   │ │ ходьба   │ │ сегодня?   │     
│            │  │ обед:     │ │ 8 км ✓  │ │            │     
│            │  │ курица+рис│ └──────────┘ │ > Добавь   │     
│            │  └──────────┘              │ задачу     │     
│            │  ┌────────────────────┐    │ купить     │     
│            │  │ 📊 Вес: 150 кг     │    │ продукты   │     
│            │  │ Цель: <100 кг      │    │            │     
│            │  │ Прогресс: ———      │    │            │     
│            │  └────────────────────┘    │            │     
│            │  ┌──────────┐              │            │     
│            │  │ ✅ Todo  │              │            │     
│            │  │ • купить │              │ ────────── │     
│            │  │ продукты │              │ [ввод...]  │     
│            │  └──────────┘              │            │     
└──────────┴─────────────────────────────┴────────────┘     
```                                                          

**Canvas:** вся центральная область — грид 12×N. Виджеты размещаются перетаскиванием, ресайзятся за углы, прилипают к сетке. Hermes добавляет виджеты в свободные ячейки.

**Главная (Dashboard):**
- Тот же canvas, закреплённый набор виджетов (нередактируемый для MVP)
- Виджет TodaySummary: задачи на сегодня + overdue + события
- Виджет RecentFeed: последние 10 фид-элементов
- Виджет QuickActions: кнопки быстрых действий

**Вкладки (Topics):** слева. Создаются/удаляются пользователем.
**Canvas (центр):** виджеты на сетке. Перетаскиваются, ресайзятся, удаляются. Кнопка «+» для добавления нового виджета (выбор типа: markdown, todo, feed).
**Чат Hermes (справа):** контекст текущего топика. Hermes может добавить виджет на canvas командой «добавь виджет веса наверху справа».

### Как Hermes понимает workspace

При подключении к `/ws/chat` с параметром `?topic=здоровье`:
1. Сервер загружает структуру workspace: все топики, активные страницы, блоки
2. Этот контекст передаётся в system prompt Hermes
3. Hermes видит: «в топике здоровье есть страницы Питание, Тренировки; блоки: markdown с меню, todo с продуктами»
4. Команда «добавь задачу купить продукты в здоровье» → Hermes вызывает `POST /api/tasks { title: "купить продукты", topic_id: "здоровье" }`
5. Сервер создаёт задачу и шлёт WS-уведомление всем клиентам: `{ event: "task_created", task: {...} }`

### Hermes Skills

Для работы с Cortex v3 нужны навыки (skill-файлы в `~/.hermes/skills/cortex/`). Синтаксис ниже — семантическое описание команды; реальная реализация — HTTP-запросы к Cortex API:

1. **cortex-page** — чтение/запись страниц и блоков:
   - `cortex page list [topic]` → `GET /api/pages?topic=...`
   - `cortex page create <title> --topic <slug>` → `POST /api/pages`
   - `cortex page add-block <page> --type markdown|todo|feed --content "..."` → `POST /api/blocks`

2. **cortex-inbox** — обработка входящих:
   - `cortex inbox process <id>` → `POST /api/inbox/:id/process`
   — разобрать элемент, определить топик, создать блоки

3. **cortex-source** — синхронизация источников (RSS, Telegram):
   - `cortex source sync <type>` → `POST /api/sources/:id/sync`

4. **cortex-dashboard** — сводка:
   - `cortex today` → `GET /api/today` — что на сегодня

Эти навыки Hermes использует для:
- Автоматической обработки входящих из источников (cron-задачи)
- Ответа на вопросы «что у меня сегодня?», «добавь задачу»
- Создания заметок и todo по команде

### Source Pipeline (фоновая автоматизация)

**MVP-источники: RSS + Telegram**

```
Cron (каждые 30 мин):
  RSS → fetch ленты → новые посты → inbox_items (status=new)
  Telegram → gramjs Client API → посты из подписанных каналов → inbox_items

Cron (каждые 5 мин, обрабатывает inbox):
  inbox_items (status=new, created_at > 1 мин назад) → Hermes разбирает →
    → определяет топик
    → извлекает: задачу? заметку? событие? закладку?
    → создаёт блоки на нужной странице
    → добавляет в feed_items
    → при ошибке: retry_count++, при 3 попытках → status=failed

Координация: inbox-обработчик берёт только элементы старше 1 минуты —
fetch-задачи успевают записать новые элементы до обработки.
Все cron-задачи обходят API, не пишут в БД напрямую.
```

**v3.1+:** Email (IMAP), Redmine API, YouTube Data API

### LLM Cost Estimate

При 20 входящих в день и ~500 токенов на разбор элемента:
- ~10K токенов/день на обработку inbox
- При использовании локальной модели — бесплатно
- При API (DeepSeek/MiniMax) — ~$0.05/день

### Error Handling

- **Падение cron-задачи:** логгируется в `~/.cortex/logs/cron.log`, Hermes health-check мониторит
- **Таймаут/ошибка Hermes при разборе:** inbox_item.status = `failed`, retry_count инкрементится. При 3 попытках — остаётся failed для ручного разбора
- **Конфликт редактирования (v3.0 — optimistic locking):** при `PATCH /api/blocks/:id` передаётся `updated_at` клиента. Если серверная версия новее → 409 Conflict, клиент перечитывает блок
- **Битый JSON в content_json:** Zod-валидация на сервере при create/update, 400 Bad Request с описанием ошибки
- **WebSocket-реконнект:** exponential backoff на клиенте, при reconnect — перезапрос актуального состояния через REST
- **Hermes недоступен:** `/api/chat` возвращает 503, UI показывает «Hermes offline»; данные в БД доступны всегда

### Backup

- SQLite WAL-режим сам защищает от краша при записи
- Cron: раз в день `VACUUM INTO '/root/.cortex/backups/cortex-YYYY-MM-DD.db'`
- Хранить последние 7 бэкапов, старые удалять
- (v3.1: rsync на внешнее хранилище)

### Monitoring

- `GET /api/health` — healthcheck: БД доступна, Hermes доступен
- Логирование cron-задач в `~/.cortex/logs/cron.log`
- Счётчик обработанных inbox_items (total, success, failed) — доступен через `GET /api/health?stats=1`

---

## Open Questions

1. **Mantine v9 + TanStack Start + rspack** — проверенная ли связка? Mantine требует transpilePackages; как это работает с rspack? **Будет проверено в первом шаге (scaffold). При несовместимости — fallback на Vite.**
2. **Чат Hermes через WebSocket** — стриминг ответа по мере генерации (токен за токеном)? Или полный ответ одним сообщением? (MVP: полный ответ, v3.1: стриминг)
3. **Telegram-источник: gramjs vs MTProto-прокси** — gramjs требует api_id/api_hash и хранит сессию. Альтернатива: Telegram Bot читает каналы (но Bot API не читает чужие каналы). Нужен Client API.
4. **Доступ к рабочей почте/Redmine** — v3.1, не MVP. Когда дойдём — потребуется прокси через рабочую машину или VPN.
5. **Миграция данных из Cortex v2** — не требуется. Cortex v3 стартует с чистого листа. Старые данные доступны read-only в файловой системе.

---

## Success Criteria

1. **Setup за 1 команду:** git clone && pnpm install && pnpm dev — работает локально
2. **Дашборд грузится быстро:** открыл → увидел сводку на сегодня (данные через API, <500ms)
3. **Hermes понимает workspace:** «добавь задачу купить продукты в здоровье» → задача появляется в нужном топике за <5 секунд
4. **Автоматический разбор RSS:** утром открыл → новые посты разобраны по топикам
5. **Один язык:** Hermes и UI читают/пишут одни и те же данные через один REST API, без рассинхрона

---

## Next Steps

1. **Проверка связки:** scaffold TanStack Start + rspack + Mantine v9 → верифицировать стилизацию и tree shaking. Если Mantine+rspack несовместимы — fallback на Vite.
2. **Schema:** спроектировать Drizzle-схему (topics, pages, blocks, tasks, events, sources, inbox_items, feed_items, search_index, attachments)
3. **API Layer:** POST /api/blocks, GET /api/topics, GET /api/pages — минимальный CRUD
4. **WebSocket:** endpoint /ws/chat (чат с Hermes, контекст workspace) + /ws/events (уведомления)
5. **UI Shell:** вкладки слева, контент в центре, чат справа
6. **Первый блок:** markdown-блок — создание, редактирование, optimistic update
7. **Hermes skill:** cortex-page — читать/писать блоки через API (skill-файл в ~/.hermes/skills/cortex/)
8. **Source Pipeline:** RSS → inbox → Hermes → блоки → feed_items

---

## Reviewer Concerns

Следующие пункты намеренно оставлены на v3.1 для сохранения узкого скоупа MVP:
- **Yjs CRDT** — заменён optimistic locking + WS-уведомлениями в v3.0
- **Calendar-блоки** — MVP: календарь как список событий, не полноценный UI
- **Chart-блоки** — deferred
- **SSG-дашборд** — заменён client-side fetch
- **Email, Redmine, YouTube-источники** — deferred до v3.1

## What I noticed about how you think

- Ты дважды возвращал меня к «одно сначала» — не размазывать на всё сразу, а выбрать narrow wedge. Даже в редизайне ты хочешь видеть первый работающий кусок, а не план на 6 месяцев.
- Фраза «чтобы разговаривать им на одном языке» — ключевая метафора всего проекта. Это не про формат данных, это про shared understanding между человеком и агентом.
- Ты думаешь структурно: вкладки, папки, подпапки — ментальная модель Notion глубоко укоренилась. Это не баг, это фича: знакомый UX снижает порог входа.
- «Не всегда удобно общаться и смотреть результаты в tg» — ты хочешь вырваться из модели «чат-бот» в модель «рабочее пространство». Это зрелый переход от инструмента к платформе.
