import { Duration } from 'effect'
import { expect, test } from './base.ts'

test('can read about us', async ({ fetch, javaScriptEnabled, page }) => {
  const menu = page.getByRole('button', { name: 'Menu' }).or(page.getByRole('link', { name: 'Menu' }))

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await menu.click()

  fetch.getOnce({
    url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb14/',
    query: { key: 'key' },
    response: { body: { pages: [{ html: '<p>Some information about us.</p>' }] } },
  })

  await page.getByRole('link', { name: 'About', exact: true }).click()

  await expect(page.getByRole('main')).toContainText('Some information about us.')
  if (javaScriptEnabled) {
    await menu.click()
    await expect(page.getByRole('link', { name: 'About', exact: true })).toHaveAttribute('aria-current', 'page')
  }
})

test('might not load the text in time', async ({ fetch, page }) => {
  fetch.getOnce({
    url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb14/',
    query: { key: 'key' },
    response: { body: { pages: [{ html: '<p>Some information about us.</p>' }] } },
    delay: Duration.toMillis('2.5 seconds'),
  })

  await page.goto('/about', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})
