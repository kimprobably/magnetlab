import { test as setup } from '@playwright/test';
import { authSetupViaCookie } from './fixtures/auth';

/**
 * Global auth setup project. Runs once before any browser-specific project.
 * Creates the storageState file at playwright/.auth/user.json.
 */
setup('authenticate', async ({ page, context }) => {
  await authSetupViaCookie(page, context);
});
