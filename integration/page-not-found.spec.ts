import { expect, test } from './base'

test('when the page does not exist', async ({ javaScriptEnabled, page }) => {
  await page.goto('/this-should-not-find-anything')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found')
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()
})
