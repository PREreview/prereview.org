import { expect, test } from './base'

test('can read about partners', async ({ page }) => {
  await page.goto('/partners')

  await expect(page.getByRole('main')).toContainText('Partners')
  await expect(page).toHaveScreenshot()
})

test('can skip to the main content', async ({ javaScriptEnabled, page }) => {
  await page.goto('/partners')
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()
})
