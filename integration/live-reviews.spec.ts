import { expect, test } from './base.js'

test('can read about Live Reviews', async ({ fetch, page }) => {
  await page.goto('/')

  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb10', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>Some information about Live Reviews.</p>' }] } },
  )

  await page.addLocatorHandler(page.getByRole('button', { name: 'Menu', expanded: false }), async () => {
    await page.getByRole('button', { name: 'Menu' }).click()
  })

  await page.getByRole('link', { name: 'Live Reviews' }).click()

  await expect(page.getByRole('main')).toContainText('Some information about Live Reviews.')
  await expect(page.getByRole('link', { name: 'Live Reviews' })).toHaveAttribute('aria-current', 'page')
})

test('might not load the text in time', async ({ fetch, page }) => {
  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb10', query: { key: 'key' } },
    new Promise(() =>
      setTimeout(() => ({ body: { pages: [{ html: '<p>Some information about Live Reviews.</p>' }] } }), 2000),
    ),
  )

  await page.goto('/live-reviews')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})
