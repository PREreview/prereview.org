import { expect, test } from './base'

test('can read about partners', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Partners' }).click()

  await expect(page.getByRole('main')).toContainText('Partners')
  await expect(page.getByRole('link', { name: 'Partners' })).toHaveAttribute('aria-current', 'page')
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()
})
