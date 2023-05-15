import { expect, test } from './base'

test('can read about us', async ({ fetch, page }) => {
  await page.goto('/')

  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb14', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>Some information about us.</p>' }] } },
  )

  await page.getByRole('link', { name: 'about' }).click()

  await expect(page.getByRole('main')).toContainText('Some information about us.')
  await expect(page.getByRole('link', { name: 'about' })).toHaveAttribute('aria-current', 'page')
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()
})

test('can skip to the main content', async ({ fetch, javaScriptEnabled, page }) => {
  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb14', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>Some information about us.</p>' }] } },
  )

  await page.goto('/about')
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
    { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb14', query: { key: 'key' } },
    new Promise(() => setTimeout(() => ({ body: { pages: [{ html: '<p>Some information about us.</p>' }] } }), 2000)),
  )

  await page.goto('/about')

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
