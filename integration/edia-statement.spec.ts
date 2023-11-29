import { expect, test } from './base'

test('can read the EDIA statement', async ({ fetch, page }) => {
  await page.goto('/')

  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb17', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>The EDIA statement.</p>' }] } },
  )

  await page.getByRole('link', { name: 'EDIA Statement' }).click()

  await expect(page.getByRole('main')).toContainText('The EDIA statement.')
  await expect(page.getByRole('link', { name: 'EDIA Statement' })).toHaveAttribute('aria-current', 'page')
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()
})

test('can skip to the main content', async ({ fetch, javaScriptEnabled, page }) => {
  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb17', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>The EDIA statement.</p>' }] } },
  )

  await page.goto('/edia-statement')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
})

test('might not load the text in time', async ({ fetch, javaScriptEnabled, page }) => {
  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb17', query: { key: 'key' } },
    new Promise(() => setTimeout(() => ({ body: { pages: [{ html: '<p>The EDIA statement.</p>' }] } }), 2000)),
  )

  await page.goto('/edia-statement')

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
