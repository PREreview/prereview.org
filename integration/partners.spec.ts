import { expect, test } from './base'

test('can read about partners', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Partners' }).click()

  await expect(page.getByRole('main')).toContainText('Partners')
  await expect(page.getByRole('link', { name: 'Partners' })).toHaveAttribute('aria-current', 'page')
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()
})

test('can skip to the main content', async ({ javaScriptEnabled, page }) => {
  await page.goto('/partners')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
})
