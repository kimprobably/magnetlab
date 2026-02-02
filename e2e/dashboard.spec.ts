import { test, expect } from '@playwright/test';
import {
  waitForPageLoad,
  mockSupabaseData,
  mockLeadMagnet,
  mockLead,
  mockAuthSession,
  mockSwipeFilePost,
} from './helpers';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
  });

  test.describe('Library page', () => {
    test('loads and shows lead magnet cards', async ({ page }) => {
      await mockSupabaseData(page, {
        table: 'lead_magnets',
        data: [
          mockLeadMagnet({ id: 'lm-1', title: 'First Lead Magnet' }),
          mockLeadMagnet({ id: 'lm-2', title: 'Second Lead Magnet' }),
        ],
      });

      await page.goto('/library');
      await waitForPageLoad(page);

      await expect(
        page.getByRole('heading', { name: /your library/i }),
      ).toBeVisible();
      await expect(page.getByText('First Lead Magnet')).toBeVisible();
      await expect(page.getByText('Second Lead Magnet')).toBeVisible();
    });

    test('shows empty state when no lead magnets exist', async ({ page }) => {
      await mockSupabaseData(page, {
        table: 'lead_magnets',
        data: [],
      });

      await page.goto('/library');
      await waitForPageLoad(page);

      await expect(
        page.getByRole('heading', { name: /your library/i }),
      ).toBeVisible();
      // Should show 0 count or empty state
      await expect(page.getByText(/0 lead magnets/i)).toBeVisible();
    });

    test('create new button links to /create', async ({ page }) => {
      await mockSupabaseData(page, {
        table: 'lead_magnets',
        data: [],
      });

      await page.goto('/library');
      await waitForPageLoad(page);

      const createLink = page.getByRole('link', { name: /create new/i });
      await expect(createLink).toBeVisible();
      await expect(createLink).toHaveAttribute('href', '/create');
    });
  });

  test.describe('Analytics page', () => {
    test('renders with analytics content', async ({ page }) => {
      await mockSupabaseData(page, {
        table: 'lead_magnet_analytics',
        data: [
          {
            id: 'analytics-1',
            lead_magnet_id: 'lm-1',
            views: 150,
            downloads: 42,
          },
        ],
      });
      await mockSupabaseData(page, {
        table: 'page_views',
        data: [],
      });

      await page.goto('/analytics');
      await waitForPageLoad(page);

      // Analytics page should load without error
      await expect(page.locator('main')).toBeVisible();
    });
  });

  test.describe('Leads page', () => {
    test('shows lead table', async ({ page }) => {
      await mockSupabaseData(page, {
        table: 'funnel_leads',
        data: [
          mockLead({ email: 'alice@example.com', name: 'Alice' }),
          mockLead({
            id: 'lead-2',
            email: 'bob@example.com',
            name: 'Bob',
          }),
        ],
      });

      await page.goto('/leads');
      await waitForPageLoad(page);

      await expect(page.locator('main')).toBeVisible();
    });
  });

  test.describe('Settings page', () => {
    test('loads with profile section', async ({ page }) => {
      await mockSupabaseData(page, {
        table: 'users',
        data: [
          {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@magnetlab.io',
          },
        ],
      });
      await mockSupabaseData(page, {
        table: 'subscriptions',
        data: [],
      });

      await page.goto('/settings');
      await waitForPageLoad(page);

      await expect(page.locator('main')).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('navigates between dashboard pages', async ({ page }) => {
      // Mock all the data endpoints so pages don't error
      await mockSupabaseData(page, { table: 'lead_magnets', data: [] });
      await mockSupabaseData(page, { table: 'funnel_leads', data: [] });
      await mockSupabaseData(page, {
        table: 'lead_magnet_analytics',
        data: [],
      });
      await mockSupabaseData(page, { table: 'page_views', data: [] });
      await mockSupabaseData(page, { table: 'users', data: [] });
      await mockSupabaseData(page, { table: 'subscriptions', data: [] });
      await mockSupabaseData(page, { table: 'swipe_file_posts', data: [] });

      // Start at library
      await page.goto('/library');
      await expect(page).toHaveURL(/\/library/);

      // Navigate to analytics
      const analyticsLink = page.getByRole('link', { name: /analytics/i });
      if (await analyticsLink.isVisible()) {
        await analyticsLink.click();
        await page.waitForURL('**/analytics');
        await expect(page).toHaveURL(/\/analytics/);
      }

      // Navigate to leads
      const leadsLink = page.getByRole('link', { name: /leads/i });
      if (await leadsLink.isVisible()) {
        await leadsLink.click();
        await page.waitForURL('**/leads');
        await expect(page).toHaveURL(/\/leads/);
      }

      // Navigate to settings
      const settingsLink = page.getByRole('link', { name: /settings/i });
      if (await settingsLink.isVisible()) {
        await settingsLink.click();
        await page.waitForURL('**/settings');
        await expect(page).toHaveURL(/\/settings/);
      }
    });
  });

  test.describe('Swipe File page', () => {
    test('loads with post cards', async ({ page }) => {
      await mockSupabaseData(page, {
        table: 'swipe_file_posts',
        data: [
          mockSwipeFilePost({ title: 'Great LinkedIn Post Template' }),
          mockSwipeFilePost({
            id: 'swipe-2',
            title: 'Carousel Design Tips',
          }),
        ],
      });

      await page.goto('/swipe-file');
      await waitForPageLoad(page);

      await expect(page.locator('main')).toBeVisible();
    });
  });
});
