# follow-delivery

MVP-трекер доставки грузов для Leader Trans Team. Двуязычный (RU/KZ), одна публичная страница поиска + защищённая админка.

## Стек

- Next.js 16 (App Router) + React 19
- Prisma 6 + PostgreSQL
- NextAuth 4 (Credentials provider, JWT-сессия)
- Tailwind CSS 4
- react-day-picker 9 + date-fns 3

## Запуск

```bash
npm run dev      # next dev
npm run build    # next build
npm run start    # next start
```

`postinstall` запускает `prisma generate`.

### Env-переменные

| Имя | Назначение |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_USERNAME` | Логин админа (один) |
| `ADMIN_PASSWORD` | Пароль админа |
| `NEXTAUTH_SECRET` | Секрет для JWT-сессии |
| `NEXTAUTH_URL` | Базовый URL (для NextAuth) |

## Маршруты

| Путь | Тип | Назначение |
|---|---|---|
| [/](app/page.tsx) | public | Поиск груза по трек-номеру |
| [/login](app/login/page.tsx) | public | Логин админа |
| [/admin](app/admin/page.tsx) | protected | Список грузов + фильтры + поиск + пагинация (8 на стр.) |
| [/admin/cargo/new](app/admin/cargo/new/page.tsx) | protected | Создание груза |
| [/admin/cargo/[id]](app/admin/cargo/[id]/page.tsx) | protected | Детали + edit-mode + удаление |
| `/api/cargos` | API | `GET` (list или `?trackingId=` search, в т.ч. по `cargoNumber`), `POST` (create) |
| `/api/cargos/[id]` | API | `GET` / `PATCH` / `DELETE` по docId |
| [/admin/presets](app/admin/presets/page.tsx) | protected | CRUD пресетов техники для калькулятора + кнопка сида |
| `/api/presets` | API | `GET` (active; `?all=1`+auth — все), `POST` (create, auth) |
| `/api/presets/[id]` | API | `PATCH` / `DELETE` (auth) |
| `/api/presets/seed` | API | `POST` (auth) — залить `DEFAULT_PRESETS`, `?force=1` пересоздать |
| `/api/places` | API | `GET ?q=` — поиск НП РФ (134k, in-memory), возвращает `{name,region,district,code}` |
| `/api/auth/[...nextauth]` | API | NextAuth handler |

Защита админки — [middleware.ts](middleware.ts), `withAuth` от NextAuth, matcher `['/admin/:path*', '/admin']`. При отсутствии сессии — редирект на `/login`.

## Структура

```
app/                      Next App Router (страницы + API)
  api/auth/[...nextauth]  NextAuth credentials
  api/cargos              REST для Cargo
contexts/LangContext.tsx  i18n провайдер (t, tf, lang)
lib/
  prisma.ts               Singleton PrismaClient
  i18n.ts                 Словари ru + kk + типы Translations
  format.ts               formatDate, displayTimeframe, getCurrencySymbol
components/
  home/                   SearchSection, CargoResultCard
  admin/                  CargoList, NewCargoForm, Selects, DatePickerField,
                          TimeframeInput, DeleteModal, AdminNav, EditActions
  Toast, Spinner, PageLoader, LangSwitcher
prisma/schema.prisma      Единственная модель Cargo
middleware.ts             Защита /admin/*
```

## Модель данных

Единственная модель — `Cargo`:

```prisma
Cargo {
  id                   String   @id @default(cuid())
  trackingId           String   @unique
  name                 String?
  fromCity             String
  currentCity          String
  toCity               String
  status               String   @default("ожидает отправления")
  acceptanceDate       DateTime?
  shipmentDate         DateTime?
  deliveryTimeframe    String?
  deliveryAmount       Float?
  paymentStatus        String   @default("none")
  partialPaymentDetail String?
  currency             String   @default("KZT")
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

## ⚠️ Ловушки и неочевидные конвенции

### 1. Переименование `id` ↔ `docId` в API-ответе

`mapCargo` в [app/api/cargos/route.ts](app/api/cargos/route.ts) и [app/api/cargos/[id]/route.ts](app/api/cargos/[id]/route.ts) меняет местами:

- `cargo.id` (Prisma cuid) → `docId` в JSON
- `cargo.trackingId` → `id` в JSON

То есть на фронте:
- `cargo.id` = публичный трек-номер `"CARGO-..."`
- `cargo.docId` = primary key для `PATCH /api/cargos/[docId]` и `DELETE`

Маппер дублирован в двух route-файлах — при изменении формы ответа править оба.

### 2. Статусы хранятся по-русски в БД

`Cargo.status` принимает только три значения, и они кириллицей:

- `"ожидает отправления"` (дефолт)
- `"в пути"`
- `"прибыл"`

Перевод на казахский/UI-лейблы — на стороне UI через `t('statusWaiting'|'statusInTransit'|'statusArrived')`. Сравнения в коде идут с русскими строками: `cargo.status === 'в пути'`.

Аналогично:
- `paymentStatus`: `none | partial | full`
- `currency`: `KZT | RUB`

### 3. Формат `deliveryTimeframe`

Строка `"NUMBER|UNIT"`, где UNIT ∈ `days | weeks | months`. Например `"10|days"`, `"2|weeks"`. Распаковка — `displayTimeframe()` в [lib/format.ts](lib/format.ts).

### 4. Генерация trackingId на клиенте

В [components/admin/NewCargoForm.tsx](components/admin/NewCargoForm.tsx):

```ts
'CARGO-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11).toUpperCase()
```

Перед отправкой нормализуется `.toUpperCase().trim()`. При создании `currentCity = fromCity`.

### 5. i18n

- Свой `LangContext` ([contexts/LangContext.tsx](contexts/LangContext.tsx)) с `t(key)` и `tf(key, params)` для интерполяции `{key}` в строке.
- Состояние `lang` (`'ru' | 'kk'`) в `localStorage['lang']`.
- Словари в [lib/i18n.ts](lib/i18n.ts) — два словаря (`ru`, `kk`) под типом `Translations`. При добавлении ключа править оба + тип.

### 6. Тосты между навигациями

Локальные тосты — массив в state + setTimeout. Для переноса тоста между переходами роутера используется `sessionStorage['pendingToast']` (JSON `{message, type}`), который читается на новой странице.

### 7. Города

В [components/admin/Selects.tsx](components/admin/Selects.tsx) — захардкоженные `CITIES_KZ` и `CITIES_RU_LIST`. Опция «✏️ Другой город» переключает в режим свободного ввода.

### 8. Mock loading delays

Страницы намеренно держат `PageLoader` минимум 444 мс (`/admin`, `/admin/cargo/[id]`) или 2000 мс (`/`) ради плавности UX. Логика — `minLoadDone` флаг + `setTimeout`. Не убирать случайно при рефакторинге.

### 9. SSR/CSR-расхождение

Из-за i18n из `localStorage` все клиентские страницы используют `'use client'` + `mounted`-флаг + `suppressHydrationWarning` на html/body и корневых div. Серверных action / RSC-форм нет.

### 10. Калькулятор: надбавка ФО, мин-тариф, пресеты (improves.docx)

- **Федеральные округа** — [lib/calculator/districts.ts](lib/calculator/districts.ts). `resolveDistrict(name, region)` — ЕДИНСТВЕННЫЙ источник принадлежности города к округу (в `directions.json` округ НЕ дублируется, привязывается в `config.ts` при сборке `DIRECTIONS`). Надбавка **+30%** (`DISTRICT_SURCHARGE`) для округов из `SURCHARGE_DISTRICTS`: south, caucasus, volga, ural, central, northwest. siberia/fareast — без надбавки.
- **`finalizePrice()`** в [engine.ts](lib/calculator/engine.ts) — общий хвост расчёта во ВСЕХ режимах: надбавка округа от округлённой базы → пол `MIN_PRICE_KZT` (90 000 ₸, [config.ts](lib/calculator/config.ts)). Возвращает флаги `surchargeApplied`/`minApplied`/`basePrice` для подписи в `ResultPanel`.
- **Пресеты** — модель = ФИКС. базовая цена в ₸ (НЕ через кривые ПЭК, чтобы регион не учитывался дважды). `calcPresetTotal()` = Σ(base×qty) → `finalizePrice`. БД-модель `CargoPreset`, сид `DEFAULT_PRESETS` ([lib/calculator/presets.ts](lib/calculator/presets.ts)). Ручной сид при необходимости: `/admin/presets` → «Загрузить стандартные» или CLI `node scripts/seed-presets.mjs` (читает `.env.local`/`.env`).
- **Миграции и деплой** — в проекте Prisma-миграции (`prisma/migrations/`): `0_init` идемпотентна (baseline существующей db-push базы), `add_cargo_preset` создаёт таблицу + сидит 16 пресетов. Build-команда — `node scripts/deploy-migrate.mjs && next build`: скрипт авто-**baseline**'ит существующую базу (если есть `Cargo`, но нет истории миграций → P3005) и гоняет `migrate deploy`. На Vercel это применяется автоматически на каждом деплое; локально скрипт берёт URL из `.env.local`. **Новое изменение схемы: `prisma migrate dev --name ...` локально (создаёт миграцию) → коммит → деплой применит сам.** НЕ использовать `db push` для прода (история миграций разойдётся).
  - ⚠️ **`.env` vs `.env.local`**: приложение и `scripts/deploy-migrate.mjs` берут `DATABASE_URL` из `.env.local` (приоритет, как у Next); голый `prisma` CLI — из `.env`. Симптом «не та БД»: `GET /api/presets` → **500** (`P2021: table CargoPreset does not exist`).
- **Дробный ввод** — [DecimalInput.tsx](components/calculator/DecimalInput.tsx): принимает запятую И точку, `max` опционален (валюту не зажимает). Использовать вместо `type=number` для размеров/веса/цены.
- **Справочник НП РФ** — `lib/calculator/settlements.json` (~135k населённых пунктов из GeoNames, включая Крым/Севастополь; собран `scripts/build-settlements.mjs`: кириллическое имя (`pickRuName`: официальное поле name → экзоним → ближайший по транслитерации alt, без дореформенных вариантов) + регион→округ + ближайший город-терминал по координатам). Поиск — серверный `/api/places?q=` (in-memory, в клиентский бандл не кладётся). `CitySelect` ищет одновременно по терминалам (локально) и по НП (через `/api/places`); выбор НП даёт `{code: ближайший терминал, district: округ НП, approx:true}` — тариф по терминалу, надбавка +30% по округу самого НП (override в `CalculatorForm`). Крым/Севастополь в GeoNames лежат в дампе Украины (admin1 UA.11/UA.20) → отдельный источник в сборщике. Пересборка: GeoNames `RU.zip` + `UA.zip` → `node scripts/build-settlements.mjs <RU.txt>` (UA.txt подхватывается из той же папки). Проверка целостности: `scripts/check-settlements-integrity.mjs`.
- Калькулятор скрыт с главной (`SHOW_CALCULATOR=false` в [app/page.tsx](app/page.tsx)); тестируется через `/admin/calculator`. Та же `CalculatorForm` на обеих страницах.

## Стиль

- **Отступы:** табы (ширина 4), не пробелы — см. `tsconfig.json` форматирование и весь существующий код.
- **Палитра:** amber + orange. Главный градиент `from-amber-500 to-orange-500`, фон `from-amber-50 via-orange-50 to-yellow-50`.
- **Комментарии в API:** на русском (`// GET /api/cargos — все грузы...`).
