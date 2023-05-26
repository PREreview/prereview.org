import { expect, test } from './base'

test('when the page has been temporarily removed', async ({ javaScriptEnabled, page }) => {
  await page.goto('/prereviewers')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’ve removed this page for now')
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

test('when the page has been permanently removed', async ({ javaScriptEnabled, page }) => {
  await page.goto('/dashboard')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’ve taken this page down')
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
