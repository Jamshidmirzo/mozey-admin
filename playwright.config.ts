/**
 * Playwright-конфигурация админки.
 *
 * Минимальный setup: 1 проект (Chromium), 1 webServer (next dev).
 * Тесты живут в ./e2e и стучатся в localhost:3100.
 *
 * Запуск (после `npm i -D @playwright/test`):
 *   npx playwright install --with-deps chromium
 *   npx playwright test
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // CRUD-сценарии должны идти последовательно: создал → нашёл → удалил
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  use: {
    baseURL: process.env.ADMIN_BASE_URL || 'http://localhost:3100',
    trace: 'on-first-retry',
    locale: 'ru-RU',
    actionTimeout: 10_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Если admin уже поднят локально — webServer не нужен. Раскомментируйте,
  // если хотите чтобы Playwright сам поднимал next dev.
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3100',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 60_000,
  // },
});
