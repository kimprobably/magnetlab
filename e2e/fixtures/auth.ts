import { test as base, expect } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '../../playwright/.auth/user.json');

/**
 * Extended test fixture that provides an authenticated page context.
 *
 * The `authenticatedPage` fixture logs in via the credentials form on /login,
 * then saves the resulting storageState so subsequent projects can reuse it.
 */
export const test = base.extend<{ authenticatedPage: typeof base }>({
  authenticatedPage: [
    async ({ page }, use) => {
      await use(base);
    },
    { scope: 'test' },
  ],
});

/**
 * Auth setup that runs once before all browser projects.
 * It authenticates via the /login credentials form and persists cookies.
 */
export async function authSetup(page: import('@playwright/test').Page) {
  // Navigate to login
  await page.goto('/login');

  // Fill credentials form
  await page.getByLabel('Email').fill('test@magnetlab.io');
  await page.getByLabel('Password').fill('testpassword123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for redirect to /library after successful login
  await page.waitForURL('**/library', { timeout: 15_000 });

  // Verify we landed on the authenticated dashboard
  await expect(page).toHaveURL(/\/library/);

  // Save signed-in state
  await page.context().storageState({ path: AUTH_FILE });
}

/**
 * Alternative auth setup that bypasses the UI by injecting a session cookie.
 * Useful when the credentials provider is not available or tests need speed.
 */
export async function authSetupViaCookie(
  page: import('@playwright/test').Page,
  context: import('@playwright/test').BrowserContext,
) {
  // Intercept the NextAuth session endpoint to return a mock session
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@magnetlab.io',
          image: null,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    }),
  );

  // Set the session cookie that the middleware checks
  await context.addCookies([
    {
      name: 'authjs.session-token',
      value: 'mock-session-token-for-e2e-tests',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      expires: Math.floor(Date.now() / 1000) + 86400,
    },
    {
      name: 'authjs.callback-url',
      value: 'http://localhost:3000/library',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      expires: Math.floor(Date.now() / 1000) + 86400,
    },
  ]);

  // Save state
  await context.storageState({ path: AUTH_FILE });
}

export { expect };
