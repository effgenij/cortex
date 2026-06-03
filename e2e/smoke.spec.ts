import { test, expect } from '@playwright/test';

test.describe('Cortex E2E Smoke', () => {
  test('dashboard loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Cortex');
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('h1')).toContainText('Настройки');
  });

  test('course page shows empty state', async ({ page }) => {
    await page.goto('/courses/999');
    // Should show "not found" or redirect
    await expect(page.locator('body')).toContainText(/не найден|not found/i);
  });

  test('navigation works', async ({ page }) => {
    await page.goto('/');
    // NAV header should be visible
    await expect(page.locator('header')).toBeVisible();
  });
});
