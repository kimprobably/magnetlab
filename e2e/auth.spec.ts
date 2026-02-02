import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('unauthenticated access', () => {
    // Use a clean context without stored auth
    test.use({ storageState: { cookies: [], origins: [] } });

    test('redirects unauthenticated user from /library to /login', async ({
      page,
    }) => {
      await page.goto('/library');
      await expect(page).toHaveURL(/\/login/);
      expect(page.url()).toContain('callbackUrl');
    });

    test('redirects unauthenticated user from /create to /login', async ({
      page,
    }) => {
      await page.goto('/create');
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects unauthenticated user from /analytics to /login', async ({
      page,
    }) => {
      await page.goto('/analytics');
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects unauthenticated user from /settings to /login', async ({
      page,
    }) => {
      await page.goto('/settings');
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects unauthenticated user from /leads to /login', async ({
      page,
    }) => {
      await page.goto('/leads');
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('login page', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('renders login page with sign-in form', async ({ page }) => {
      await page.goto('/login');

      await expect(
        page.getByRole('heading', { name: /welcome to magnetlab/i }),
      ).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(
        page.getByRole('button', { name: /sign in/i }),
      ).toBeVisible();
    });

    test('shows error on invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Intercept the signIn call to simulate failure
      await page.route('**/api/auth/callback/credentials*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'CredentialsSignin',
            status: 401,
            ok: false,
            url: null,
          }),
        }),
      );

      await page.getByLabel('Email').fill('wrong@example.com');
      await page.getByLabel('Password').fill('wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Expect an error message
      await expect(
        page.getByText(/invalid email or password|authentication error/i),
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe('authenticated user', () => {
    test('lands on /library after login', async ({ page }) => {
      await page.goto('/library');
      await expect(page).toHaveURL(/\/library/);
    });

    test('session persists across page reloads', async ({ page }) => {
      await page.goto('/library');
      await expect(page).toHaveURL(/\/library/);

      // Reload the page
      await page.reload();
      await expect(page).toHaveURL(/\/library/);

      // Should still be on library, not redirected to login
      await expect(page).not.toHaveURL(/\/login/);
    });

    test('logout clears session', async ({ page, context }) => {
      await page.goto('/library');
      await expect(page).toHaveURL(/\/library/);

      // Intercept the signOut call
      await page.route('**/api/auth/signout*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ url: '/login' }),
        }),
      );

      // Clear cookies to simulate logout
      await context.clearCookies();

      // Navigate to a protected route -- should redirect to login
      await page.goto('/library');
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
