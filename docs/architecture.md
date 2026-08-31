# Brega VPN — общая архитектура

> Единый источник правды по инфраструктуре. Копируется в каждый репозиторий
> как `docs/architecture.md`, либо все репозитории открываются вместе через
> родительскую папку в Claude Code.

## Маппинг репозиториев (проверено вживую 31.08.2026)
- **backend** = `dmbrega-ops/brega-vpn` (приватный, Python/FastAPI) — легаси, ещё в проде на 🔴 France, статус: доживает до катовера
- **bot** = `dmbrega-ops/remnawave-bedolaga-telegram-bot` (публичный форк BEDOLAGA-DEV), ветка `ponteto/brevo-http-transport` — новый стек, активная разработка, тест-стенд на 🔵 Riga
- **frontend** = `dmbrega-ops/bedolaga-cabinet` (публичный форк BEDOLAGA-DEV), ветка `ponteto/magic-link` — новый личный кабинет клиента
- **panel** = `case211/remnawave-admin` (**не форк, прямой клон апстрима по HTTPS**) — код не патчится, деплоится поверх родной Remnawave (которая тоже не наш код)

### Репозитории вне этого списка (для справки, не входят в 4 отслеживаемых)
- `dmbrega-ops/brega-bot` (приватный, Python) — легаси Telegram-бот, зона ответственности пересекается с `brega-vpn`
- `dmbrega-ops/brega-frontend` (приватный, HTML) — легаси сайт/дашборд
- `dmbrega-ops/brega-support-bot` (приватный, Python) — старый отдельный admin-бот, **не связан с Case211/remnawave-admin**

Локально все 4 отслеживаемых репозитория лежат рядом на 🖥 BAZAMSK: `~/brega-vpn/{backend,bot,frontend,panel}`.
Легаси-сайт (`brega-frontend`) — отдельно, `~/brega-vpn/legacy-frontend/`.

## Журнал решений (история миграции)
Полная хронология сессий миграции (13.08–27.08.2026: Фазы 1–4, катовер,
Cabinet, anti-abuse, email/Brevo, magic-link) лежит в `~/brega-vpn/journal/`
— **не в git**, только локально. При вопросах "почему сделано именно так"
или "что уже пробовали и не сработало" — смотри туда, а не только в
текущий код. `journal/legacy-snapshots/` — статичные слепки кода легаси-
стека на 30.07.2026 (устарели относительно живых `backend/`/`legacy-frontend/`,
не использовать как источник правды о текущем коде).

## Текущий статус: два стека одновременно
Проект в процессе миграции. Легаси-стек ещё обслуживает боевых клиентов,
новый стек (Bedolaga + Cabinet) обкатывается на тест-стенде перед катовером.

| | Легаси (прод) | Новый (миграция) |
|---|---|---|
| Backend/API | `brega-backend` (FastAPI) | встроен FastAPI-роутер в процесс бота (`app/cabinet/`), отдельного сервиса нет |
| Bot | `brega-bot` (aiogram, простой биллинг) | Bedolaga bot (aiogram, полный биллинг/тарифы/рефералка) |
| Личный кабинет | `brega-frontend` (статический сайт + дашборд) | Cabinet (React+TS SPA) |
| Панель VPN | 3x-ui → **уже смигрировано** на Remnawave (катовер завершён 15.08.2026) | — (общая для обоих стеков) |
| Admin/anti-abuse | не было | Case211/remnawave-admin |

## Серверы
- 🟢 **Amsterdam** (`46.8.100.250`) — Remnawave panel (боевая, `stirejo.ponteto.com`), Case211 anti-abuse (коллектор `rwa.ponteto.com`, веб-панель `gardejo.ponteto.com`), subscription page (`my.ponteto.com`), нода NL_A
- 🔴 **France** (`31.56.228.203`) — легаси `brega-backend`/`brega-bot` (ещё прод), VPN-нода, `sub.ponteto.com` relay
- 🔵 **Riga** (`31.56.27.108`) — Bedolaga тест-стенд (`/opt/bedolaga-test/bot/`), Cabinet test (`cabinet-test.ponteto.com`), VPN-нода
- 🟡 **USA/Kansas City** (`45.39.60.138`) — VPN-нода

Пользователь `brega` (NOPASSWD sudo) на всех серверах. Шеллы разные:
France=zsh, Riga/Amsterdam=bash, USA=fish. Массовые операции —
`~/ponteto-tools/run-all-nodes.sh`.

## Протокол и подписки
- VLESS + Reality поверх Xray, управление — через Remnawave panel API
- `XUI_VLESS_INBOUND_IDS` (легаси, 3x-ui): 2 и 14
- Remnawave: сквады VIP `c2778fa9-c732-4c51-9783-5492459291a4`, CLIENTS `ad2ea72d-ed1e-41e8-9677-eacc789c3acd`
- Ссылка подписки: `my.ponteto.com/{shortUuid}` — единая для всех клиентов, формат конфига определяется по `User-Agent` (Happ, Incy, Hiddify и др.)

## Платежи
- YooKassa — прямая интеграция REST API + верификация webhook
- Легаси: биллинг в `brega-bot`. Новый стек: биллинг встроен в Bedolaga bot (баланс + тарифы, а не разовая покупка)

## Email
- Провайдер: BREVO, HTTP API (порт 443) — SMTP-порты 25/465/587/2525 заблокированы на всех серверах
- Gmail режет `<style>` из `<head>` — верстка таблицами / `premailer.transform(keep_style_tags=False)`

## Доступность из России (важно!)
Проблема: SNI-based DPI блокировала прямой доступ.
Решение: reverse-proxy через Латвию (nginx) + Cloudflare с ECH + ренейминг доменов.
> Если РКН изменит метод блокировки — начинать диагностику отсюда.

## Секреты и ключи (расположение, не значения!)
- Легаси backend (`/opt/brega-backend/.env`): `JWT_SECRET`, `DATABASE_URL`, `XUI_API_TOKEN`, `YOOKASSA_SECRET_KEY`, `INTERNAL_API_KEY`, `TELEGRAM_BOT_TOKEN`, `SMTP_PASSWORD`/`BREVO_API_KEY`
- Bedolaga bot (`/opt/bedolaga-test/bot/.env`): секреты (токены/пароли/ключи) осознанно остаются в `.env`, всё остальное (457 параметров) — в БД через админ-панель бота
- Case211/remnawave-admin (`/opt/remnawave-admin/.env`): `API_TOKEN` (токен `anti-abuse-bot` в Remnawave), `WEBHOOK_SECRET`, `INTERNAL_API_SECRET`, `WEB_SECRET_KEY`, `BOT_TOKEN`
- **Долг:** ротация секретов легаси-бэкенда откладывается с нескольких сессий — не сделана

## Кросс-репозиторные контракты
- **panel ↔ backend/bot**: оба стека ходят в Remnawave panel API отдельными токенами с гранулярными правами (не «полный доступ»). Правило: любой 403 → сначала проверить права токена в `stirejo.ponteto.com` → Settings → API — категория прав может отсутствовать целиком
- **panel ↔ bot (anti-abuse)**: `BEDOLAGA_API_URL=http://31.56.27.108:8080`, авторизация `X-API-Key`
- **bot ↔ frontend (Cabinet)**: не отдельный backend — Cabinet API это FastAPI-роутер, примонтированный в тот же процесс бота под префиксом `/cabinet`. `CABINET_ENABLED` и `WEB_API_ENABLED` — оба обязательны, иначе веб-сервер бота вообще не поднимается
- **Docker + UFW:** опубликованные Docker-порты (`0.0.0.0:PORT`) обходят UFW/iptables INPUT целиком — защита только через `DOCKER-USER` chain

## Судьба репозиториев после катовера
- `brega-backend`, `brega-bot` — гасятся, БД остаётся read-only архивом (не удаляется)
- `brega-frontend` — правки: убрать кнопки входа в старый ЛК, ссылки на новый бот/Cabinet
- Case211/remnawave-admin — **не выводится из эксплуатации**, остаётся ради anti-abuse (у Bedolaga своей системы анти-шаринга нет)
