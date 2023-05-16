import { expect, test } from './base'

test('can read about communities', async ({ fetch, page }) => {
  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/64637b4c07fb34a92c7f84ec', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>Some information about communities.</p>' }] } },
  )

  await page.goto('/communities')

  await expect(page.getByRole('main')).toContainText('Some information about communities.')
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()
})

test('can skip to the main content', async ({ fetch, javaScriptEnabled, page }) => {
  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/64637b4c07fb34a92c7f84ec', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>Some information about communities.</p>' }] } },
  )

  await page.goto('/communities')
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()
})

test('might not load the text in time', async ({ fetch, javaScriptEnabled, page }) => {
  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/64637b4c07fb34a92c7f84ec', query: { key: 'key' } },
    new Promise(() =>
      setTimeout(() => ({ body: { pages: [{ html: '<p>Some information about communities.</p>' }] } }), 2000),
    ),
  )

  await page.goto('/communities')

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
