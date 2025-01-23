import { expect, test } from './base.js'

test('can read about us', async ({ fetch, page }) => {
  await page.goto('/')

  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb14/', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>Some information about us.</p>' }] } },
  )

  await page.getByRole('link', { name: 'about' }).click()

  await expect(page.getByRole('main')).toContainText('Some information about us.')
  await expect(page.getByRole('link', { name: 'about' })).toHaveAttribute('aria-current', 'page')
})

test('might not load the text in time', async ({ fetch, page }) => {
  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb14/', query: { key: 'key' } },
    new Promise(() => setTimeout(() => ({ body: { pages: [{ html: '<p>Some information about us.</p>' }] } }), 2000)),
  )

  await page.goto('/about')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})
