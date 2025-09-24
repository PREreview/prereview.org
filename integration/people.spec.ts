import { Duration } from 'effect'
import { expect, test } from './base.ts'

test('can read about people', async ({ fetch, page }) => {
  await page.goto('/', { waitUntil: 'commit' })

  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb0a', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>Some information about people.</p>' }] } },
  )

  await page.getByRole('link', { name: 'People' }).click()

  await expect(page.getByRole('main')).toContainText('Some information about people.')
  await expect(page.getByRole('link', { name: 'People' })).toHaveAttribute('aria-current', 'page')
})

test('might not load the text in time', async ({ fetch, page }) => {
  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb0a', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>Some information about people.</p>' }] } },
    { delay: Duration.toMillis('2.5 seconds') },
  )

  await page.goto('/people', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})
