import { Duration } from 'effect'
import { expect, test } from './base.ts'

test("can read about how we're funded", async ({ fetch, page }) => {
  await page.goto('/', { waitUntil: 'commit' })

  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb12', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>Some information about how we’re funded.</p>' }] } },
  )

  await page.getByRole('link', { name: 'How we’re funded' }).click()

  await expect(page.getByRole('main')).toContainText('Some information about how we’re funded.')
  await expect(page.getByRole('link', { name: 'How we’re funded' })).toHaveAttribute('aria-current', 'page')
})

test('might not load the text in time', async ({ fetch, page }) => {
  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb12', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>Some information about how we’re funded.</p>' }] } },
    { delay: Duration.toMillis('2.5 seconds') },
  )

  await page.goto('/funding', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})
