import { Duration } from 'effect'
import { expect, test } from './base.js'

test('can read about Live Reviews', async ({ fetch, javaScriptEnabled, page }) => {
  const menu = page.getByRole('button', { name: 'Menu' }).or(page.getByRole('link', { name: 'Menu' }))

  await page.goto('/', { waitUntil: 'domcontentloaded' })

  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb10', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>Some information about Live Reviews.</p>' }] } },
  )

  await menu.click()
  await page.getByRole('link', { name: 'Live Reviews', exact: true }).click()

  await expect(page.getByRole('main')).toContainText('Some information about Live Reviews.')

  if (javaScriptEnabled) {
    await menu.click()

    await expect(page.getByRole('link', { name: 'Live Reviews' })).toHaveAttribute('aria-current', 'page')
  }
})

test('might not load the text in time', async ({ fetch, page }) => {
  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb10', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>Some information about Live Reviews.</p>' }] } },
    { delay: Duration.toMillis('2.5 seconds') },
  )

  await page.goto('/live-reviews', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})
