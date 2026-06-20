/**
 * §D. Admin E2E — Playwright.
 *
 * Сквозной сценарий «человек кликает в админке»:
 *   1. Логинимся (editor@mozey.uz / editor123456 — дефолт из prisma/seed.ts).
 *   2. Идём на /regions/new.
 *   3. Заполняем все языковые табы, slug подставится автоматически.
 *   4. Жмём «Сохранить».
 *   5. Возвращаемся на /regions — видим только что созданный регион.
 *   6. Удаляем через row-action → подтверждаем.
 *
 * Сценарий доказывает T2 (CRUD из админки) + T3 (после клика — данные в БД).
 * Запуск: `npx playwright test e2e/admin-crud.spec.ts`
 *
 * Предусловия:
 *   - API запущен на http://localhost:3333
 *   - admin запущен на http://localhost:3100
 *   - В БД уже есть admin/editor (после `npm run db:seed`)
 */
import { test, expect, Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_TEST_EMAIL || 'editor@mozey.uz';
const ADMIN_PASSWORD = process.env.ADMIN_TEST_PASSWORD || 'editor123456';

async function login(page: Page) {
  await page.goto('/ru/login');
  // Поля идентифицируются по типу — это устойчиво к переводам.
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /войти/i }).click();
  // После логина редирект на /ru (dashboard)
  await page.waitForURL(/\/(ru|uz|en)\/?$/, { timeout: 15_000 });
}

test.describe('§D. Admin — CRUD регионов через UI', () => {
  test('TC-D-01: логин и редирект на dashboard', async ({ page }) => {
    await login(page);
    // На dashboard есть навигация со ссылкой «Регионы»
    await expect(page.getByRole('link', { name: /регион/i }).first()).toBeVisible();
  });

  test('TC-D-02: создание региона — заполнение формы и появление в списке', async ({
    page,
  }) => {
    await login(page);

    // 1) Идём на форму создания
    await page.goto('/ru/regions/new');

    // 2) Языковые табы (LanguageTabs рендерит uz/ru/en по очереди)
    const nameUz = `QA E2E Viloyat ${Date.now()}`;
    const nameRu = `QA E2E Область ${Date.now()}`;
    const nameEn = `QA E2E Region ${Date.now()}`;

    // Первая активная вкладка — uz
    const inputs = page.locator('input[name^="name."]');
    // Если LanguageTabs использует одну видимую вкладку — переключаем
    const tabUz = page.getByRole('tab', { name: /uz/i });
    if (await tabUz.isVisible({ timeout: 1000 }).catch(() => false)) {
      await tabUz.click();
    }
    await inputs.first().fill(nameUz);

    const tabRu = page.getByRole('tab', { name: /ru|рус/i });
    if (await tabRu.isVisible({ timeout: 1000 }).catch(() => false)) {
      await tabRu.click();
    }
    await inputs.first().fill(nameRu);

    const tabEn = page.getByRole('tab', { name: /en/i });
    if (await tabEn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await tabEn.click();
    }
    await inputs.first().fill(nameEn);

    // Slug автоматически подставится из uz-имени, но мы зададим явно
    // (для устойчивости, если автогенерация не сработает в test env)
    const slugValue = `qa-e2e-${Date.now()}`;
    await page.locator('input.font-mono').fill(slugValue);

    // 3) Сохраняем
    await page.getByRole('button', { name: /сохранить|save/i }).click();

    // 4) Sonner toast «Регион создан» + редирект на /ru/regions
    await page.waitForURL(/\/regions\/?$/, { timeout: 10_000 });

    // 5) В таблице видим нашу строку
    await expect(page.getByText(slugValue, { exact: false })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('TC-D-03: удаление региона — confirmation dialog + строка пропадает', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/ru/regions');

    // Берём только регионы с префиксом qa-e2e — это безопасный фильтр
    const row = page.locator('tr', { hasText: 'qa-e2e' }).first();
    if (!(await row.isVisible().catch(() => false))) {
      test.skip(true, 'Нет тестового региона для удаления (создайте через TC-D-02)');
    }

    const slugText = await row.locator('td').first().innerText().catch(() => '');

    // Жмём dropdown-menu actions
    await row.getByRole('button', { name: /действия|actions|menu/i }).click();
    // В выпадашке — «Удалить»
    await page.getByRole('menuitem', { name: /удалить|delete/i }).click();

    // AlertDialog подтверждения
    await page
      .getByRole('button', { name: /подтвердить|удалить|confirm/i })
      .last()
      .click();

    // Строка пропадает
    await expect(page.locator('tr', { hasText: slugText })).toHaveCount(0, {
      timeout: 10_000,
    });
  });
});

test.describe('§D. Admin — guard-ы UI', () => {
  test('TC-D-10: неавторизованный пользователь редиректится с /regions на /login', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await page.goto('/ru/regions');
    // Либо редирект на login, либо страница пустая с requireAuth-сообщением
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});

test.describe('§D. Admin — музеи (smoke, опционально)', () => {
  test.skip(
    'TC-D-20: создание музея с прикреплением региона и фото',
    async () => {
      // TODO: реализовать когда добавим mock для S3 presigned PUT.
      // Сценарий:
      //   1. Логин.
      //   2. /ru/museums/new
      //   3. Выбрать регион из dropdown (созданный в TC-D-02).
      //   4. Прикрепить фото через drag&drop (react-dropzone).
      //   5. Сохранить → /ru/museums → строка появилась.
    },
  );
});
