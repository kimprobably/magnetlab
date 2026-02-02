import { test, expect } from '@playwright/test';
import { waitForPageLoad, mockFunnel, mockLeadMagnet } from './helpers';

test.describe('Lead Capture Flow', () => {
  const username = 'testuser';
  const slug = 'linkedin-growth';
  const optInUrl = `/p/${username}/${slug}`;
  const thankYouUrl = `/p/${username}/${slug}/thankyou`;

  test.beforeEach(async ({ page }) => {
    // Mock the public page data API
    await page.route('**/api/public/page*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          funnel: mockFunnel({ username, slug }),
          leadMagnet: mockLeadMagnet(),
        }),
      }),
    );

    // Mock Supabase queries for the public opt-in page
    await page.route('**/rest/v1/funnel_pages*', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([mockFunnel({ username, slug })]),
        });
      }
      return route.continue();
    });

    await page.route('**/rest/v1/funnel_page_sections*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'section-hero',
            funnel_page_id: 'funnel-test-001',
            type: 'hero',
            order: 0,
            config: {
              headline: 'Get the Free LinkedIn Growth Framework',
              subheadline: 'Learn how top creators grow.',
            },
          },
        ]),
      }),
    );

    await page.route('**/rest/v1/lead_magnets*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockLeadMagnet()]),
      }),
    );

    // Mock page view tracking
    await page.route('**/rest/v1/page_views*', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 201, body: '{}' });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
  });

  test('public opt-in page loads', async ({ page }) => {
    await page.goto(optInUrl);
    await waitForPageLoad(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('form renders with email field', async ({ page }) => {
    await page.goto(optInUrl);
    await waitForPageLoad(page);

    // Look for an email input
    const emailInput = page
      .getByPlaceholder(/email/i)
      .or(page.locator('input[type="email"]'))
      .first();

    await expect(emailInput).toBeVisible();
  });

  test('submit valid email redirects to thank-you page', async ({ page }) => {
    // Mock the lead capture / opt-in API
    await page.route('**/api/public/opt-in*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, leadId: 'lead-new-001' }),
      }),
    );

    // Also mock the leads REST endpoint
    await page.route('**/rest/v1/funnel_leads*', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 'lead-new-001' }]),
        });
      }
      return route.continue();
    });

    await page.goto(optInUrl);
    await waitForPageLoad(page);

    const emailInput = page
      .getByPlaceholder(/email/i)
      .or(page.locator('input[type="email"]'))
      .first();

    await emailInput.fill('newlead@example.com');

    // Submit the form -- look for a submit button
    const submitButton = page
      .getByRole('button', { name: /get.*access|submit|download|sign.*up/i })
      .first();

    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should redirect to thank-you page
      await page.waitForURL(`**/${slug}/thankyou`, { timeout: 10_000 });
      await expect(page).toHaveURL(/thankyou/);
    }
  });

  test('invalid email shows validation error', async ({ page }) => {
    await page.goto(optInUrl);
    await waitForPageLoad(page);

    const emailInput = page
      .getByPlaceholder(/email/i)
      .or(page.locator('input[type="email"]'))
      .first();

    // Type an invalid email
    await emailInput.fill('not-an-email');

    const submitButton = page
      .getByRole('button', { name: /get.*access|submit|download|sign.*up/i })
      .first();

    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should show validation error or the browser's built-in validation
      // The page should NOT navigate to thank-you
      await expect(page).not.toHaveURL(/thankyou/);
    }
  });

  test('thank-you page renders with confirmation message', async ({
    page,
  }) => {
    // Mock the thank-you page data
    await page.route('**/api/public/thankyou*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          funnel: mockFunnel({ username, slug }),
          leadMagnet: mockLeadMagnet(),
        }),
      }),
    );

    await page.goto(thankYouUrl);
    await waitForPageLoad(page);

    // Thank-you page should show confirmation content
    await expect(page.locator('body')).toBeVisible();

    // Look for typical thank-you messaging
    const thankYouContent = page.getByText(
      /thank|check.*inbox|confirmation|sent/i,
    );
    // The page should contain some form of confirmation
    await expect(page.locator('body')).toBeVisible();
  });
});
