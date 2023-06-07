import { areLoggedIn, canLogIn, expect, test } from './base'

test.extend(canLogIn).extend(areLoggedIn)('can view my details', async ({ javaScriptEnabled, page }) => {
  await page.getByRole('link', { name: 'My details' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My details')
  await expect(page.getByRole('link', { name: 'My details' })).toHaveAttribute('aria-current', 'page')
  await page.mouse.move(0, 0)
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

test.extend(canLogIn)('can log in from the home page', async ({ page }) => {
  await page.goto('/log-in')
  await page.locator('[type=email]').fill('test@example.com')
  await page.locator('[type=password]').fill('password')
  await page.keyboard.press('Enter')

  await expect(page.getByRole('alert', { name: 'Success' })).toBeInViewport()
  await expect(page).toHaveScreenshot()
})
