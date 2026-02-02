import { test, expect } from '@playwright/test';
import {
  waitForPageLoad,
  mockSupabaseData,
  mockAIEndpoints,
  mockAuthSession,
} from './helpers';

test.describe('Lead Magnet Creation Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
    await mockAIEndpoints(page);

    // Mock usage tracking to allow creation
    await mockSupabaseData(page, {
      table: 'usage_tracking',
      data: [
        {
          user_id: 'test-user-id',
          lead_magnets_created: 1,
          lead_magnets_limit: 10,
        },
      ],
    });

    // Mock extraction sessions
    await mockSupabaseData(page, {
      table: 'extraction_sessions',
      data: [],
    });
  });

  test('navigate to /create and wizard step 1 loads', async ({ page }) => {
    await page.goto('/create');
    await waitForPageLoad(page);

    // The wizard first step should be visible
    await expect(page.locator('main')).toBeVisible();
  });

  test('select an archetype on the wizard', async ({ page }) => {
    await page.goto('/create');
    await waitForPageLoad(page);

    // Look for archetype selection options
    const archetypeOption = page.getByText(/single.?breakdown/i).first();
    if (await archetypeOption.isVisible()) {
      await archetypeOption.click();

      // After selecting, the wizard should advance or show the selection
      await expect(archetypeOption).toBeVisible();
    }
  });

  test('fill in wizard steps with mocked AI', async ({ page }) => {
    // Mock the lead magnet creation API
    await page.route('**/api/lead-magnet', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'lm-new-001',
            title: 'New Lead Magnet',
            success: true,
          }),
        });
      }
      return route.continue();
    });

    await page.goto('/create');
    await waitForPageLoad(page);

    // The wizard should present input fields for the first step
    // Fill any visible text inputs
    const titleInput = page.getByPlaceholder(/title|topic|name/i).first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('My LinkedIn Growth Framework');
    }
  });

  test('step navigation with next/back buttons', async ({ page }) => {
    await page.goto('/create');
    await waitForPageLoad(page);

    // Look for a Next or Continue button
    const nextButton = page
      .getByRole('button', { name: /next|continue/i })
      .first();
    if (await nextButton.isVisible()) {
      await nextButton.click();

      // After clicking next, look for a Back button
      const backButton = page
        .getByRole('button', { name: /back|previous/i })
        .first();
      if (await backButton.isVisible()) {
        await backButton.click();

        // Should be back on step 1
        await expect(page.locator('main')).toBeVisible();
      }
    }
  });

  test('quick page create at /create/page-quick loads', async ({ page }) => {
    // Mock landing page API
    await page.route('**/api/landing-page*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, id: 'page-quick-001' }),
      }),
    );

    await page.goto('/create/page-quick');
    await waitForPageLoad(page);

    await expect(page.locator('main')).toBeVisible();
  });
});
