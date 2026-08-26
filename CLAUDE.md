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
| `WAHA_URL` | Базовый URL контейнера WAHA. Не задан → уведомления только вручную (§12) |
| `WAHA_API_KEY` | Ключ WAHA (`X-Api-Key`); обязателен, если контейнер публичен |
| `WAHA_SESSION` | Имя сессии WAHA; пусто → `default` |
| `WAHA_HOOK_HMAC_KEY` | Секрет HMAC для вебхука статусов (вебхук необязателен) |
| `NOTIFY_WEBHOOK_SECRET` | Альтернатива HMAC — секрет в `?secret=`; ни того, ни другого → 404 |
| `SMS_PROVIDER` | `smsgate` \| `httpsms` \| `infinireach`; пусто → SMS только вручную |
| `SMS_GATEWAY_URL/LOGIN/PASSWORD` | Для `smsgate` (SMS Gateway for Android) |
| `HTTPSMS_API_KEY`, `SMS_FROM` | Для `httpsms` |
| `INFINIREACH_API_KEY`, `SMS_FROM` | Для `infinireach` |
| `NEXT_PUBLIC_LOGIST_GROUP_URL` | Ссылка-приглашение в чат логистов (кнопка в сводке) |

⚠️ `.env.example` в проекте **не отслеживается git** (`.gitignore: .env*`), поэтому
таблица выше — единственное описание переменных, которое доезжает до репозитория.

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
| [/admin/waybills](app/admin/waybills/page.tsx) | protected | Список накладных + поиск + фильтр по статусу + пагинация (12 на стр.) |
| [/admin/waybills/new](app/admin/waybills/new/page.tsx) | protected | Мастер создания накладной (3 шага) |
| [/admin/waybills/[id]](app/admin/waybills/[id]/page.tsx) | protected | Карточка накладной; `?edit=1` — режим редактирования (мастер) |
| `/api/waybills` | API | `GET` (list; `?q=`, `?status=`, `?page=`, `?cargoId=`), `POST` (create) |
| `/api/waybills/[id]` | API | `GET` / `PATCH` / `DELETE` |
| `/api/waybills/number` | API | `POST` — атомарно зарезервировать номер накладной |
| [/admin/presets](app/admin/presets/page.tsx) | protected | CRUD пресетов техники для калькулятора + кнопка сида |
| `/api/presets` | API | `GET` (active; `?all=1`+auth — все), `POST` (create, auth) |
| `/api/presets/[id]` | API | `PATCH` / `DELETE` (auth) |
| `/api/presets/seed` | API | `POST` (auth) — залить `DEFAULT_PRESETS`, `?force=1` пересоздать |
| `/api/places` | API | `GET ?q=` — поиск НП РФ (134k, in-memory), возвращает `{name,region,district,code}` |
| `/api/notify` | API | `GET ?waybillId=` (журнал + доступность каналов), `POST` (отправить уведомление) |
| `/api/notify/webhook` | API | `POST` — события `message.ack` от WAHA (статусы доставки) |
| `/api/auth/[...nextauth]` | API | NextAuth handler |

Защита админки — [middleware.ts](middleware.ts), `withAuth` от NextAuth, matcher `['/admin/:path*', '/admin']`. При отсутствии сессии — редирект на `/login`.

## Структура

```
app/                      Next App Router (страницы + API)
  api/auth/[...nextauth]  NextAuth credentials
  api/cargos              REST для Cargo
  api/waybills            REST для Waybill (+ /number — выдача номера)
contexts/LangContext.tsx  i18n провайдер (t, tf, lang)
lib/
  prisma.ts               Singleton PrismaClient
  i18n.ts                 Словари ru + kk + типы Translations
  format.ts               formatDate, displayTimeframe, getCurrencySymbol
  data/                   Слой доступа к данным: types (контракт), httpRepo, repos
  waybill/                model, totals (чистые расчёты), company (реквизиты),
                          print (PDF), number, cargoSync
  notify/                 Уведомления клиенту: message (шаблон), waha, sms,
                          send (оркестрация + журнал), links (ручной режим), types
  calculator/             движок расчёта, тарифы, справочник НП
components/
  home/                   SearchSection, CargoResultCard
  admin/                  CargoList, NewCargoForm, Selects, DatePickerField,
                          TimeframeInput, DeleteModal, AdminSidebar, CargoWaybillBlock
  waybill/                WaybillForm, Stepper, LogistSummary, NotifyModal
                          (уведомление клиенту, §12), PhoneInput, Select
  pages/                  Крупные страницы (грузы, накладные, папки, калькулятор)
  Toast, Spinner, PageLoader, LangSwitcher
prisma/schema.prisma      Cargo, Folder, CargoPreset, Waybill(+Item,+Counter)
middleware.ts             Защита /admin/*
```

## Модель данных

Модели: `Cargo`, `Folder`, `CargoPreset`, `Waybill` + `WaybillItem` + `WaybillCounter` (см. ловушку №11), `Notification` (см. §12).

Базовая — `Cargo`:

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
- **Переведён весь интерфейс, включая админку** (накладные, шаблоны, папки, калькулятор, уведомления) — 463 ключа. Новый текст в компонентах не хардкодить: только `t()`/`tf()`. Русскими остаются намеренно: **PDF накладной** (решение заказчика — документ только на русском, см. §11), **текст уведомления клиенту** (тот же принцип, см. §12), значения в БД (статусы, города), реквизиты в [company.ts](lib/waybill/company.ts) и формат сводки логистам в [model.ts](lib/waybill/model.ts) (зафиксирован заявкой №2782).
- **Валидация накладной возвращает КЛЮЧИ, а не текст**: `WaybillError = { step, key }` в [model.ts](lib/waybill/model.ts), тост показывает `t(err.key)`. Иначе казахский оператор видел бы русские ошибки. Серверная проверка в [mapWaybill.ts](lib/mapWaybill.ts) — последний рубеж (у API нет языка сессии), её сообщения остаются русскими и в норме недостижимы: клиент валидирует те же поля раньше.

### 6. Тосты между навигациями

Локальные тосты — массив в state + setTimeout. Для переноса тоста между переходами роутера используется `sessionStorage['pendingToast']` (JSON `{message, type}`), который читается на новой странице.

### 7. Города

В [components/admin/Selects.tsx](components/admin/Selects.tsx) — захардкоженные `CITIES_KZ` и `CITIES_RU_LIST`. Опция «✏️ Другой город» переключает в режим свободного ввода.

### 8. Mock loading delays

Страницы намеренно держат `PageLoader` минимум 444 мс (`/admin`, `/admin/cargo/[id]`) или 2000 мс (`/`) ради плавности UX. Логика — `minLoadDone` флаг + `setTimeout`. Не убирать случайно при рефакторинге.

### 9. SSR/CSR-расхождение

Из-за i18n из `localStorage` все клиентские страницы используют `'use client'` + `mounted`-флаг + `suppressHydrationWarning` на html/body и корневых div. Серверных action / RSC-форм нет.

### 10. Калькулятор: надбавка по областям, мин-тариф, пресеты (improves.docx + improves2.0)

- **Региональная надбавка** — [lib/calculator/districts.ts](lib/calculator/districts.ts). `resolveSurcharge(name, region)` → ДОЛЯ (0.2 = +20%): базовая ставка по округу (`DISTRICT_DEFAULT_SURCHARGE`: central/south/volga/ural 20%, caucasus 25%, northwest/siberia/fareast 0) + переопределения по областям (`REGION_SURCHARGE`). Ключевые правила improves2.0: Крым/Севастополь +30%; СЗФО по областям (Архангельская +35%, Мурманская +25%, Вологодская +20%, Псковская +15%, Ленинградская/Новгородская +10%); в Уральском и Центральном ряд областей — исключения с базовой ставкой 0% (Свердловская/Челябинская/Курганская/Тюменская; Московская/Орловская/Рязанская/Тверская/Тульская/Калужская/Липецкая/Ярославская/Костромская/Ивановская + Москва). `resolveDistrict` остался для подписи округа. Надбавка зашивается в `Direction.surcharge` в `config.ts` при сборке `DIRECTIONS`; для НП — в `/api/places` (по области НП).
- **`finalizePrice(base, surcharge)`** в [engine.ts](lib/calculator/engine.ts) — общий хвост во ВСЕХ режимах: ×(1+доля) от округлённой базы → пол `MIN_PRICE_KZT` (90 000 ₸, [config.ts](lib/calculator/config.ts)). Флаги `surchargeApplied`/`surchargePct`/`minApplied`/`basePrice` для `ResultPanel`.
- **Пресеты** (в UI называются «Шаблоны» / KK «Үлгілер» — final-improves; в коде/API/БД остаются `preset`/`CargoPreset`/`/api/presets`) (improves2.0) — считаются ТЕМ ЖЕ движком, что и «Свой груз»: пресет даёт только габариты+вес, цена = `calcShipment` по кривым ПЭК + надбавка области → поэтому пресет и «Свой груз» с одинаковыми размерами дают ОДИНАКОВУЮ цену. Поле `CargoPreset.basePrice` в БД больше НЕ используется для расчёта (оставлено в схеме, в UI скрыто). Цена доставки за единицу на карточках убрана. **Не путать с `goodsPrice`** — это себестоимость самой техники (ПРАВКИ 2 п.1), на расчёт доставки не влияет, см. §11.
- **Шаблоны берутся через `repos.presets`** ([lib/data/repos.ts](lib/data/repos.ts)), не прямым `fetch('/api/presets')`. БД-модель `CargoPreset`, сид `DEFAULT_PRESETS` ([lib/calculator/presets.ts](lib/calculator/presets.ts)). Сид: `/admin/presets` → «Загрузить стандартные» или `node scripts/seed-presets.mjs`.
- **Миграции и деплой** — в проекте Prisma-миграции (`prisma/migrations/`), все написаны идемпотентно (`IF NOT EXISTS`). Build-команда — `node scripts/deploy-migrate.mjs && next build`. Скрипт ([deploy-migrate.mjs](scripts/deploy-migrate.mjs)) гарантирует, что схема БД соответствует коду, **или валит сборку** — чтобы на прод не уехала версия, где раздел падает с 500 из-за отсутствующей таблицы. Порядок: расчистка истории от незавершённых миграций (иначе P3009 блокирует все следующие) → baseline существующей db-push базы (иначе P3005) → `migrate deploy` → **проверка наличия нужных таблиц/колонок** (`REQUIRED_TABLES` / `REQUIRED_COLUMNS` — дополнять при новых миграциях!) → если что-то не так, прямой прогон SQL через `prisma db execute` (не берёт advisory-lock, поэтому проходит через пулер) → повторная проверка → `exit 1`, если не сошлось. **Новое изменение схемы: `prisma migrate dev --name ...` локально → дописать объекты в `REQUIRED_*` → коммит → деплой применит сам.** НЕ использовать `db push` для прода.
  - ⚠️ **BOM в `20260524120000_init/migration.sql`**: из-за него `migrate deploy` падает с `P3018` / `42601 syntax error at or near "﻿"` на любой базе, где init ещё НЕ применена (т.е. на новой БД). Файл править нельзя — Prisma сверяет контрольную сумму применённых миграций, и правка сломает деплой на прод-базе. Скрипт обходит это временной копией без BOM.
  - ⚠️ **`.env` vs `.env.local`**: приложение и `deploy-migrate.mjs` берут `DATABASE_URL` из `.env.local` (приоритет, как у Next); голый `prisma` CLI — из `.env`. Явный override для тестов/CI — `DEPLOY_MIGRATE_DB_URL`. Симптом «не та БД»: `GET /api/presets` → **500** (`P2021: table ... does not exist`).
  - Если прод-БД за пулером (pgbouncer, порт 6543) — можно задать `DIRECT_URL` (прямое подключение, 5432) для `migrate deploy`; без неё сработает фолбэк на `db execute`.
- **Дробный ввод** — [DecimalInput.tsx](components/calculator/DecimalInput.tsx): принимает запятую И точку, `max` опционален (валюту не зажимает). Использовать вместо `type=number` для размеров/веса/цены.
- **Справочник НП РФ** — `lib/calculator/settlements.json` (~135k населённых пунктов из GeoNames, включая Крым/Севастополь; собран `scripts/build-settlements.mjs`: кириллическое имя (`pickRuName`: официальное поле name → экзоним → ближайший по транслитерации alt, без дореформенных вариантов) + регион→округ + ближайший город-терминал по координатам). Поиск — серверный `/api/places?q=` (in-memory, в клиентский бандл не кладётся). `CitySelect` ищет одновременно по терминалам (локально) и по НП (через `/api/places`); выбор НП даёт `{code: ближайший терминал, surcharge: надбавка по области НП, approx:true}` — тариф по ближайшему терминалу, надбавка по области самого НП (override `direction.surcharge` в `CalculatorForm`). Крым/Севастополь в GeoNames лежат в дампе Украины (admin1 UA.11/UA.20) → отдельный источник в сборщике. Пересборка: GeoNames `RU.zip` + `UA.zip` → `node scripts/build-settlements.mjs <RU.txt>` (UA.txt подхватывается из той же папки). Проверка целостности: `scripts/check-settlements-integrity.mjs`.
- Калькулятор **открыт всем** (`SHOW_CALCULATOR=true` в [app/page.tsx](app/page.tsx), final-improves): на главной — вкладки «Отслеживание»/«Калькулятор», пресеты доступны клиентам. Та же `CalculatorForm` на главной и `/admin/calculator`.
- **Количество в пресетах** — редактируемое поле (`DecimalInput`, можно вписать «45», select-on-focus), плюс кнопки −/+.

### 11. Накладные (ПРАВКИ 2)

- **Хранение в БД.** До ПРАВОК 2 мастер «Создать накладную» жил только в демо-песочнице (sessionStorage) и в БД уходил урезанный `Cargo` — реквизиты терялись, накладную нельзя было открыть заново. Теперь есть модели `Waybill` + `WaybillItem`, раздел `/admin/waybills` (список → открытие → правка → удаление) и `WaybillRepo` в слое данных ([lib/data/types.ts](lib/data/types.ts)). Компоненты формы — [components/waybill/](components/waybill/).
- **Просмотр отдельно от редактирования** (как в грузах): `/admin/waybills/[id]` открывает read-only карточку [WaybillDetailPage.tsx](components/pages/WaybillDetailPage.tsx), «карандаш» ведёт в мастер. Режим живёт в адресе (`?edit=1`), а не в state — тогда «Назад» в браузере возвращает из правки в карточку, а не в список; «Сохранить» в режиме правки тоже возвращает в карточку (тост переносится через `sessionStorage['pendingToast']`). Сводка логистам показывается только у сохранённой накладной: у новой она собиралась из пустой формы и выглядела сломанной («0,000 м³, 0 тенге»).
- **Модель формы** — [lib/waybill/model.ts](lib/waybill/model.ts) (вложенные `sender`/`receiver`/`positions`); плоские колонки БД ↔ модель конвертирует [lib/mapWaybill.ts](lib/mapWaybill.ts). `waybill.docId` — cuid записи, `waybill.number` — человеческий номер.
- **Одна накладная = один груз.** При сохранении [lib/waybill/cargoSync.ts](lib/waybill/cargoSync.ts) создаёт/обновляет `Cargo` (`trackingId = CARGO-<номер>`, `cargoNumber = номер`). Статусы — РАЗНЫЕ оси: документ (`draft|active|delivered|cancelled`) и перемещение (`ожидает отправления|в пути|прибыл`). Переносится только `delivered → прибыл`; `currentCity` и «в пути» ведёт логист в `/admin`, накладная их НЕ перезатирает. Груз виден на своей карточке блоком «Накладная» ([CargoWaybillBlock.tsx](components/admin/CargoWaybillBlock.tsx)).
- **Номера — только с сервера.** `POST /api/waybills/number` делает атомарный `INSERT … ON CONFLICT DO UPDATE … RETURNING` по таблице `WaybillCounter` ([lib/waybill/number.ts](lib/waybill/number.ts)). Раньше счётчик жил в `sessionStorage` у клиента → два оператора получали один номер. Номер резервируется при ОТКРЫТИИ формы (решение заказчика), поэтому в нумерации возможны пропуски, если форму закрыли без сохранения. Первый номер — 3000 (1–2999 заняты), счётчик инициализируется не ниже `MAX(Cargo.cargoNumber)`.
- **Печатная форма** — [lib/waybill/print.ts](lib/waybill/print.ts): логотип `/logo-ltt-ntk.svg`, реквизиты и контакты из [lib/waybill/company.ts](lib/waybill/company.ts) (единственное место для правок; пустые поля не печатаются), обобщённое описание груза, строка о соответствии упаковки, дата отправки и сроки, печать организации. Открывается в новом окне: картинки подставляются АБСОЛЮТНЫМ URL (окно — `about:blank`, относительный путь не разрешится), печать вызывает сам документ по `load`.
  - **Груз описывается обобщённо** (правка заказчика): характер груза + мест/вес/объём. Наименования позиций («Квадроцикл 400 куб. см») и себестоимость товара в документ НЕ попадают — это внутренние данные, они остаются в сводке логистам.
  - **`@page { margin: 0 }` + поля через `padding` на `body`** — иначе Chrome печатает в полях свои колонтитулы (URL, дата, «Стр. 1 из 1»), чего заказчик не хочет. Не менять на `@page margin`.
  - **Строго одна страница** (жалоба заказчика: документ уезжал на два листа). Держится тремя вещами, по отдельности ломать нельзя:
    1. `body { width: 210mm }` — вёрстка на экране совпадает с печатной, только поэтому скрипт может честно измерить высоту (при ширине окна 880px измерения врут);
    2. компактные вертикальные отступы — замеренный запас: обычная накладная **52 мм**, «тяжёлая» (компания + ИИН + длинные адреса + 6 позиций) **30 мм**. Добавляете строки в документ — перепроверьте запас;
    3. `fit()` перед печатью: если содержимое всё же выше листа, `#page` получает жёсткую высоту, а `#sheet` — `transform: scale(k)` (не ниже 0.78) с компенсацией ширины. Вторая страница становится невозможной, ничего не обрезается. **Высоту вешать на обёртку `#page`, а не на `body`**: у `body`/`html` переполнение пробрасывается на вьюпорт и Chrome всё равно добавлял лист.
    Проверять надо печатью, а не на глаз: `page.pdf({ format: 'A4', preferCSSPageSize: true })` в Playwright + подсчёт `/Type /Page` — на экране документ может выглядеть нормально, а печататься на двух листах.
  - **Печать организации** — `public/stamp.png`: фото штампа с вырезанной в прозрачность бумагой (остаётся только синяя краска с натуральной текстурой), плюс `rotate(-2deg)` для вида «поставлено от руки». Нарисованный вектором блок реквизитов заказчик забраковал — нужен именно оттиск. Оттиск лежит в `public/`, то есть доступен публично, но он и так печатается на каждой накладной, которую отдают клиенту.
  - **Замена штампа** — два скрипта-утилиты (Windows, System.Drawing; в сборку не входят):
    1. [scripts/build-stamp.ps1](scripts/build-stamp.ps1) `<фото>` — выбивает бумагу: альфа считается по «на сколько пиксель темнее бумаги» (уровень бумаги = 90-й процентиль яркости) с отбросом тёплых теней по признаку `b >= r`. **Не уменьшать разрешение**: линия рамки тонкая (2–3 px) и при масштабировании смешивается с прозрачным фоном — именно так рамка один раз и пропала.
    2. [scripts/fix-stamp-frame.ps1](scripts/fix-stamp-frame.ps1) — краска рамки на оттиске ложится неровно, часть линий почти отсутствует («рваные бордеры»). Скрипт подгоняет прямую по уцелевшим фрагментам каждой из сторон, чистит зону у рамки (`-Inset`, там текста заведомо нет) и рисует линии заново — **по пикселям, не через GDI+**: `DrawPolygon` со сглаживанием кладёт линию не по расчётным координатам. Рамка строится ЧЕТЫРЁХУГОЛЬНИКОМ: фото снято под углом, у оттиска перспектива, и ровный прямоугольник не совпал бы с наклоном текста. Оба скрипта печатают долю закрашенности каждой линии — если она не 100%, рамка рваная.
    - **Толщина линии 7px** (`-Thickness`): в накладной картинка сжимается с 760 до ~234px, поэтому 3px становятся тоньше пикселя, браузер их размазывает и на печати линия рябит. 7px дают ~2px в документе — плотно и под вес букв; 9px уже тяжелее текста.
- **Логотип LTT–НТК** — `public/logo-ltt-ntk.svg`, только для PDF (на сайте остаётся `logo.png`). Собран из `logo.png`: контур отрисован по маске альфа-канала, «–НТК» построено геометрией в пропорциях образца заказчика. При `fill-rule="evenodd"` подпути НЕ должны пересекаться (наложение вырезает дырку) — фигуры букв только стыкуются.
- **Диплинк отслеживания** — `/?id=НОМЕР` на главной автоматически ищет груз ([TrackingHome.tsx](components/pages/TrackingHome.tsx)); по этой ссылке ведут PDF и SMS-уведомление.
- **Себестоимость товара в шаблонах** (п.1) — `CargoPreset.goodsPrice`, ₸ за единицу. Задаётся в `/admin/presets` («Стоимость товара»), НЕ влияет на цену доставки. Попадает в позицию накладной при «Скопировать в накладную» и в строку `Стоимость - N тенге` сводки логистам (формат — по заявке заказчика №2782). Клиентам не отдаётся: публичный `GET /api/presets` без сессии подставляет `goodsPrice: 0`, поэтому в открытом калькуляторе её нет. У существующих шаблонов значение 0 — заполняется вручную в админке.
- **БИН и банковские реквизиты в накладной не печатаются** — решение заказчика.

### 12. Уведомление клиенту: WhatsApp через WAHA + SMS-фолбэк

Кнопка «Уведомить клиента» на шаге 3 мастера. Код — [lib/notify/](lib/notify/), UI — [NotifyModal.tsx](components/waybill/NotifyModal.tsx), API — `/api/notify` и `/api/notify/webhook`.

- **Почему WAHA, а не официальный Cloud API.** [WAHA](https://waha.devlike.pro/) — self-hosted контейнер `devlikeapro/waha`, подключается к WhatsApp как WhatsApp Web по QR. Номер компании (8 708 703 77 11) остаётся у компании, приложение WhatsApp Business на нём продолжает работать, верификация Meta и утверждение шаблонов не нужны. С версии 2026.6.1 бесплатен целиком (подписка Patreon $5/мес — только поддержка автора). Плата за выбор: это неофициальный путь, то есть нарушение правил Meta — номер теоретически могут заблокировать.
- **⚠️ WAHA не живёт на Vercel** — это Docker, нужен VPS. Приложение обращается к нему по сети, поэтому `WAHA_URL` должен быть доступен из окружения приложения; если контейнер смотрит в интернет, ключ (заголовок `X-Api-Key`) обязателен. Три параметра запуска, которые легко упустить:
  - `-v …:/app/.sessions` — **без тома сессия теряется при перезапуске** контейнера, и QR приходится сканировать заново;
  - `WHATSAPP_DEFAULT_ENGINE=NOWEB` — движок без headless-браузера (~200 МБ против 1–1,5 ГБ у WEBJS по умолчанию); на VPS с 1 ГБ RAM WEBJS не запускается. `check-exists` работает на всех движках;
  - переменная ключа у контейнера — `WAHA_API_KEY` (в старых версиях `WHATSAPP_API_KEY`). Не путать с одноимённой переменной приложения: у него это ключ, который он подставляет в `X-Api-Key`.
- **Канал выбирается ДО отправки, синхронно.** У WAHA есть `GET /api/contacts/check-exists?phone=&session=` → `{numberExists, chatId}`. Поэтому [send.ts](lib/notify/send.ts) сначала спрашивает WhatsApp про номер и только потом решает, чем отправлять; SMS-фолбэк **не зависит от вебхука**. Это главное отличие от Wazzup, с которого начинали: там такой проверки нет, и SMS приходилось бы досылать асинхронно.
  - `phone` передаётся **только цифрами**: с ведущим «+» эндпоинт отвечает 500.
  - `chatId` берём из ответа, а не собираем сами: у части номеров идентификатор приходит как `@lid`, а не `@c.us`.
  - Проверка — обращение к WhatsApp, а не локальная операция. Один вызов на уведомление безопасен, массовой проверкой номеров можно словить блокировку аккаунта.
  - Если проверка **упала** (WAHA недоступна, сессия отвалилась) — это не считается «WhatsApp нет» и SMS молча не уходит: уведомление помечается ошибкой, оператор видит причину.
- **Вебхук необязателен.** Он нужен только для статусов «доставлено / прочитано» (событие `message.ack`, `ack`: −1 ERROR … 3 READ). Настраивается **на стороне контейнера** (`WHATSAPP_HOOK_URL`, `WHATSAPP_HOOK_EVENTS=message.ack`, `WHATSAPP_HOOK_HMAC_KEY`), а не из приложения — никакой авторегистрации подписки в коде нет. `ack = -1` (сообщение приняли, но доставить не смогли) — единственный случай, когда SMS досылается из вебхука.
- **Роут вебхука закрыт, иначе 404.** Он публичный, поэтому: либо HMAC-подпись тела (`X-Webhook-Hmac`, sha512, ключ `WAHA_HOOK_HMAC_KEY`) — предпочтительно, сравнение постоянного времени; либо секрет в query (`NOTIFY_WEBHOOK_SECRET`). Ничего не задано → 404, как будто роута нет: открытый вебхук позволил бы кому угодно менять статусы и провоцировать досылку SMS.
- **Поиск строки журнала по id сообщения** ([webhook/route.ts](app/api/notify/webhook/route.ts)) — сначала точное совпадение `providerId`, потом по хвосту после последнего `_`: движки WAHA (WEBJS/NOWEB/GOWS) отдают id в разной форме, и ответ на отправку может отличаться от того, что приходит в `ack`.
- **⚠️ SMS уходят только с физической SIM, и это не прихоть.** Обычный шлюз с альфа-именем (Mobizon, SMSC) для проекта **не подходит**: получатели в РФ, а туда такие шлюзы отправляют только после регистрации собственного имени отправителя у российских операторов — МТС 15 000 ₸/мес + Мегафон 20 000 ₸/мес и ~30 дней с документами. Абонентская SIM шлёт в Россию как обычное международное SMS, без всего этого. Поэтому поддержаны только шлюзы на телефоне с SIM: `smsgate` ([SMS Gateway for Android](https://sms-gate.app/), open-source, бесплатно), `httpsms` ([httpSMS](https://httpsms.com/)) и `infinireach` ([InfiniReach](https://infinireach.io/), SaaS, бесплатный тариф 100 SMS/мес). Цена решения: телефон должен быть постоянно включён и онлайн, и он же — единственная точка отказа канала.
- **`externalId` у InfiniReach** — ключ идемпотентности, в него уходит id строки журнала: повторный вебхук не отправит клиенту второе SMS. У остальных провайдеров аналога нет, аргумент они игнорируют.
- **Ручной режим — не заглушка, а рабочий путь.** Провайдер не настроен → `notifyClient` возвращает `status: 'manual'` и ссылки `wa.me` / `sms:`, кнопки меняются на «Открыть WhatsApp / SMS», отправку подтверждает оператор. Модалка спрашивает доступность каналов **при открытии** (`GET /api/notify`), а не после первого клика — иначе первое нажатие уходило бы вхолостую. Ручной режим работает и для несохранённой накладной; автоотправке нужен `docId` (по нему пишется журнал).
- **Два текста, а не один** ([message.ts](lib/notify/message.ts)): для WhatsApp полный (маршрут, мест/вес/объём, срок, сумма), для SMS короткий. Причина арифметическая: кириллица в SMS идёт по 67 символов на часть, полный текст ушёл бы пятью SMS. Поэтому в журнале **две колонки текста**: `text` (что ушло в WhatsApp) и `smsText` (короткий вариант рядом). Досылая SMS, вебхук берёт `smsText` — иначе клиенту уехал бы длинный WhatsApp-текст, а правки оператора потерялись бы.
- **Шаблон редактируемый.** Модалка подставляет шаблон, но оператор может поправить оба текста перед отправкой; `POST /api/notify` принимает `text`/`smsText`. Пустая правка игнорируется (уйдёт шаблон — иначе `Ctrl+A, Delete` отправил бы клиенту пустоту), длина ограничена 4096/1000 символов, а правки живут только в открытом окне: при следующем открытии снова шаблон, чтобы вчерашняя правка не уехала новому клиенту.
- **Текст сообщения русский и в i18n не заводится** — по той же причине, что PDF (§11): это документ для клиента, а не интерфейс оператора; получатели — физлица в РФ. Телефон берётся из `COMPANY.departments`, чтобы номер в уведомлении и в PDF не разошлись. Интерфейс модалки, наоборот, целиком на `t()` (ключи `nm*`).
- **⚠️ [lib/waybill/totals.ts](lib/waybill/totals.ts) — не косметика.** `model.ts` импортирует `react-phone-number-input` (для `isPhoneValid`), а этот пакет при вычислении модуля в серверном рантайме падает с `Super expression must either be null or a function`. Роут `/api/notify` собирает текст теми же формулами, что UI, и отдавал **500**, пока итоги/форматтеры (`totalWeight`, `effectiveVolume`, `fmtMoney`, …) не переехали в `totals.ts`. `model.ts` их реэкспортирует, поэтому старые импорты работают. **Правило: серверный код берёт эти функции из `totals.ts`, а не из `model.ts`.** (`mapWaybill.ts` не страдал: он импортирует из model только типы.)
- **Журнал `Notification` нужен и здесь.** Одна отправка = одна строка; при фолбэке их две (неудачная `whatsapp` с кодом `BAD_CONTACT` + `sms` с `fallbackOf`), поэтому в модалке видно, почему ушло SMS. Повторный вебхук не создаёт второй SMS: `fallbackToSms` проверяет наличие строки с `fallbackOf`. Статусы не откатываются назад (`pending < sent < delivered < read`) — вебхуки приходят без гарантии порядка.
- **⚠️ Дедупликации отправки у WAHA нет**, поэтому она сделана на своей стороне: `notifyClient` отклоняет повторное уведомление по той же накладной, если успешное уже уходило за последние 10 минут (`RESEND_GUARD_MS`, код `RECENTLY_SENT`). У Wazzup для этого был `crmMessageId`, у `POST /api/sendText` аналога нет — без защиты два клика давали клиенту два сообщения.
- **⚠️ Каждое обращение к WhatsApp — риск для аккаунта, а не просто трафик.** 2026-08-26 номер компании уехал «на проверку» (24 ч, экран «Аккаунт на проверке» с формулировкой про «информацию о вашем устройстве») после серии переподключений сессии и пересозданий контейнера. Поэтому: результаты `check-exists` кэшируются на 6 часов ([waha.ts](lib/notify/waha.ts)), повторные отправки блокируются, а **сессию нельзя перезапускать и контейнер пересоздавать без нужды** — правки env лучше копить и применять одним пересозданием. Во время проверки аккаунта контейнер держать остановленным: новые попытки входа продлевают её.
- **Что делать, если аккаунт заблокировали.** SMS-канал (InfiniReach) от WhatsApp не зависит и продолжает работать; кнопка «Уведомить клиента» при недоступной WAHA сама уходит в ручной режим со ссылкой `wa.me`. То есть функциональность деградирует, но ничего не падает.

## Стиль

- **Отступы:** табы (ширина 4), не пробелы — см. `tsconfig.json` форматирование и весь существующий код.
- **Палитра:** amber + orange. Главный градиент `from-amber-500 to-orange-500`, фон `from-amber-50 via-orange-50 to-yellow-50`.
- **Комментарии в API:** на русском (`// GET /api/cargos — все грузы...`).
