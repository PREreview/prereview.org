import { expect, test } from './base'

test('can read about clubs', async ({ fetch, page }) => {
  await page.goto('/')

  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/64637b4c07fb34a92c7f84ec', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>Some information about clubs.</p>' }] } },
  )

  await page.getByRole('link', { name: 'Clubs' }).click()

  await expect(page.getByRole('main')).toContainText('Some information about clubs.')
  await expect(page.getByRole('link', { name: 'Clubs' })).toHaveAttribute('aria-current', 'page')
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()
})

test('might not load the text in time', async ({ fetch, javaScriptEnabled, page }) => {
  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/64637b4c07fb34a92c7f84ec', query: { key: 'key' } },
    new Promise(() =>
      setTimeout(() => ({ body: { pages: [{ html: '<p>Some information about clubs.</p>' }] } }), 2000),
    ),
  )

  await page.goto('/clubs')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
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
