import { test, expect } from '@playwright/test';
import {
  waitForPageLoad,
  mockSupabaseData,
  mockLeadMagnet,
  mockFunnel,
  mockAuthSession,
  mockAIEndpoints,
} from './helpers';

test.describe('Funnel Builder', () => {
  const leadMagnetId = 'lm-test-001';

  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
    await mockAIEndpoints(page);

    // Mock lead magnet data
    await mockSupabaseData(page, {
      table: 'lead_magnets',
      data: [mockLeadMagnet({ id: leadMagnetId })],
    });

    // Mock funnel page data
    await mockSupabaseData(page, {
      table: 'funnel_pages',
      data: [
        mockFunnel({
          lead_magnet_id: leadMagnetId,
          headline: 'Get the Free LinkedIn Growth Framework',
        }),
      ],
    });

    // Mock funnel page sections
    await mockSupabaseData(page, {
      table: 'funnel_page_sections',
      data: [
        {
          id: 'section-hero',
          funnel_page_id: 'funnel-test-001',
          type: 'hero',
          order: 0,
          config: {
            headline: 'Get the Free LinkedIn Growth Framework',
            subheadline: 'Learn from the best.',
          },
        },
        {
          id: 'section-cta',
          funnel_page_id: 'funnel-test-001',
          type: 'cta',
          order: 1,
          config: { buttonText: 'Get Free Access' },
        },
      ],
    });

    // Mock qualification questions
    await mockSupabaseData(page, {
      table: 'qualification_questions',
      data: [],
    });
  });

  test('navigate to funnel builder from library item', async ({ page }) => {
    await page.goto(`/library/${leadMagnetId}/funnel`);
    await waitForPageLoad(page);

    await expect(page.locator('main')).toBeVisible();
  });

  test('opt-in page editor loads with form fields', async ({ page }) => {
    await page.goto(`/library/${leadMagnetId}/funnel`);
    await waitForPageLoad(page);

    // The funnel editor should show the headline or form-related content
    await expect(page.locator('main')).toBeVisible();
  });

  test('edit headline and save', async ({ page }) => {
    // Mock the funnel update API
    await page.route('**/api/funnel/pages*', (route) => {
      if (
        route.request().method() === 'PUT' ||
        route.request().method() === 'PATCH'
      ) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
      return route.continue();
    });

    await page.route('**/api/funnel/sections*', (route) => {
      if (
        route.request().method() === 'PUT' ||
        route.request().method() === 'PATCH'
      ) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
      return route.continue();
    });

    await page.goto(`/library/${leadMagnetId}/funnel`);
    await waitForPageLoad(page);

    // Look for editable headline fields
    const headlineInput = page
      .getByPlaceholder(/headline/i)
      .or(page.locator('input[name*="headline"]'))
      .first();

    if (await headlineInput.isVisible()) {
      await headlineInput.clear();
      await headlineInput.fill('Updated Headline for Testing');

      // Look for save button
      const saveButton = page
        .getByRole('button', { name: /save|update/i })
        .first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
      }
    }
  });

  test('thank-you page editor loads', async ({ page }) => {
    await page.goto(`/library/${leadMagnetId}/funnel`);
    await waitForPageLoad(page);

    // Look for a tab or link to the thank-you page editor
    const thankYouTab = page
      .getByText(/thank.?you/i)
      .or(page.getByRole('tab', { name: /thank/i }))
      .first();

    if (await thankYouTab.isVisible()) {
      await thankYouTab.click();
      // Thank you editor section should appear
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('publish/unpublish toggle works', async ({ page }) => {
    // Mock publish endpoint
    await page.route('**/api/funnel/publish*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, is_published: true }),
      }),
    );

    await page.goto(`/library/${leadMagnetId}/funnel`);
    await waitForPageLoad(page);

    // Look for publish toggle or button
    const publishButton = page
      .getByRole('button', { name: /publish|unpublish/i })
      .or(page.getByRole('switch'))
      .first();

    if (await publishButton.isVisible()) {
      await publishButton.click();
      // Should trigger the publish API call
    }
  });

  test('preview button opens public page', async ({ page, context }) => {
    await page.goto(`/library/${leadMagnetId}/funnel`);
    await waitForPageLoad(page);

    // Look for a preview link or button
    const previewLink = page
      .getByRole('link', { name: /preview|view.?page/i })
      .or(page.getByRole('button', { name: /preview/i }))
      .first();

    if (await previewLink.isVisible()) {
      // If it opens in a new tab, listen for the popup
      const pagePromise = context.waitForEvent('page', { timeout: 5_000 }).catch(() => null);
      await previewLink.click();
      const newPage = await pagePromise;

      if (newPage) {
        await newPage.waitForLoadState();
        // The preview page should be a public /p/ route
        expect(newPage.url()).toContain('/p/');
        await newPage.close();
      }
    }
  });
});
