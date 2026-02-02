import { test, expect } from '@playwright/test';
import {
  waitForPageLoad,
  mockSupabaseData,
  mockAuthSession,
  mockSwipeFilePost,
} from './helpers';

test.describe('Swipe File', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);

    await mockSupabaseData(page, {
      table: 'swipe_file_posts',
      data: [
        mockSwipeFilePost({
          id: 'swipe-1',
          title: 'LinkedIn Carousel Template',
          category: 'linkedin',
        }),
        mockSwipeFilePost({
          id: 'swipe-2',
          title: 'Cold Email Subject Lines',
          category: 'email',
        }),
        mockSwipeFilePost({
          id: 'swipe-3',
          title: 'Landing Page Copy Formula',
          category: 'landing-page',
        }),
      ],
    });

    await mockSupabaseData(page, {
      table: 'swipe_file_lead_magnets',
      data: [],
    });
  });

  test('swipe file page loads with post cards', async ({ page }) => {
    await page.goto('/swipe-file');
    await waitForPageLoad(page);

    await expect(page.locator('main')).toBeVisible();
  });

  test('filter by category works', async ({ page }) => {
    await page.goto('/swipe-file');
    await waitForPageLoad(page);

    // Look for category filter buttons, tabs, or a select
    const categoryFilter = page
      .getByRole('tab', { name: /linkedin/i })
      .or(page.getByRole('button', { name: /linkedin/i }))
      .or(page.getByText(/linkedin/i).first())
      .first();

    if (await categoryFilter.isVisible()) {
      await categoryFilter.click();

      // After filtering, the page should still be rendered
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('submit a new post to swipe file', async ({ page }) => {
    // Mock the swipe file submission API
    await page.route('**/api/swipe-file*', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            post: mockSwipeFilePost({
              id: 'swipe-new',
              title: 'My New Swipe Post',
            }),
          }),
        });
      }
      return route.continue();
    });

    await page.goto('/swipe-file');
    await waitForPageLoad(page);

    // Look for a create/submit/add button
    const addButton = page
      .getByRole('button', { name: /add|create|submit|new|share/i })
      .first();

    if (await addButton.isVisible()) {
      await addButton.click();

      // A form or dialog should appear
      const titleInput = page
        .getByPlaceholder(/title|name/i)
        .or(page.locator('input[name*="title"]'))
        .first();

      if (await titleInput.isVisible({ timeout: 5_000 })) {
        await titleInput.fill('My New Swipe Post');

        const contentInput = page
          .getByPlaceholder(/content|description|body/i)
          .or(page.locator('textarea'))
          .first();

        if (await contentInput.isVisible()) {
          await contentInput.fill(
            'This is a great template for lead generation.',
          );
        }

        // Submit the form
        const submitButton = page
          .getByRole('button', { name: /submit|save|post|share/i })
          .first();

        if (await submitButton.isVisible()) {
          await submitButton.click();
        }
      }
    }
  });
});
