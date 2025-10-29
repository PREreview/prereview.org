import { Duration } from 'effect'
import { expect, test } from './base.js'

test('can read the EDIA statement', async ({ fetch, page }) => {
  await page.goto('/', { waitUntil: 'commit' })

  fetch.getOnce({
    url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb17/',
    query: { key: 'key' },
    response: { body: { pages: [{ html: '<p>The EDIA statement.</p>' }] } },
  })

  await page.getByRole('link', { name: 'EDIA Statement' }).click()

  await expect(page.getByRole('main')).toContainText('The EDIA statement.')
  await expect(page.getByRole('link', { name: 'EDIA Statement' })).toHaveAttribute('aria-current', 'page')
})

test('might not load the text in time', async ({ fetch, page }) => {
  fetch.getOnce({
    url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb17/',
    query: { key: 'key' },
    response: { body: { pages: [{ html: '<p>The EDIA statement.</p>' }] } },
    delay: Duration.toMillis('2.5 seconds'),
  })

  await page.goto('/edia-statement', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})
