# Admin E2E (Playwright)

## Setup

Playwright не входит в `package.json` по умолчанию. Чтобы запустить:

```bash
cd admin
npm i -D @playwright/test
npx playwright install --with-deps chromium
```

## Запуск

1. Запустите backend (`cd ../api && npm run dev`) — слушает на :3333.
2. Запустите seed (`cd ../api && npm run db:seed`), чтобы создать admin/editor.
3. Запустите admin (`cd admin && npm run dev`) — слушает на :3100.
4. В отдельном терминале:
   ```bash
   cd admin
   npx playwright test
   ```

## Переменные

| Env | Default | Описание |
| --- | --- | --- |
| `ADMIN_BASE_URL` | `http://localhost:3100` | Где живёт admin |
| `ADMIN_TEST_EMAIL` | `editor@mozey.uz` | Аккаунт логина |
| `ADMIN_TEST_PASSWORD` | `editor123456` | Пароль |

## Состав

| Файл | Что проверяет |
| --- | --- |
| `admin-crud.spec.ts` | Логин → создание региона → проверка появления в таблице → удаление; auth guard |

## Известное

- TC-D-20 (создание музея с фото) — skip, нужен mock для S3 PUT.
- Тесты идут последовательно (workers=1, fullyParallel=false), т.к. CRUD-сценарий требует строгого порядка.
