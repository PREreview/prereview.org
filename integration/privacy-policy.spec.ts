import { Duration } from 'effect'
import { expect, test } from './base.js'

test('can read the privacy policy', async ({ fetch, page }) => {
  await page.goto('/', { waitUntil: 'commit' })

  fetch.getOnce({
    url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb0f/',
    query: { key: 'key' },
    response: { body: { pages: [{ html: '<p>This is the Privacy Policy.</p>' }] } },
  })

  await page.getByRole('link', { name: 'Privacy Policy' }).click()

  await expect(page.getByRole('main')).toContainText('This is the Privacy Policy.')
  await expect(page.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('aria-current', 'page')
})

test('might not load the text in time', async ({ fetch, page }) => {
  fetch.getOnce({
    url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb0f/',
    query: { key: 'key' },
    response: { body: { pages: [{ html: '<p>This is the Privacy Policy.</p>' }] } },
    delay: Duration.toMillis('2.5 seconds'),
  })

  await page.goto('/privacy-policy', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})
