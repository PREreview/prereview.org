import { Duration } from 'effect'
import { expect, test } from './base.ts'

test('can read the Code of Conduct', async ({ fetch, page }) => {
  await page.goto('/', { waitUntil: 'commit' })

  fetch.getOnce({
    url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb00/',
    query: { key: 'key' },
    response: { body: { pages: [{ html: '<p>This is the Code of Conduct.</p>' }] } },
  })

  await page.getByRole('link', { name: 'Code of Conduct' }).click()

  await expect(page.getByRole('main')).toContainText('This is the Code of Conduct.')
  await expect(page.getByRole('link', { name: 'Code of Conduct' })).toHaveAttribute('aria-current', 'page')
})

test('might not load the text in time', async ({ fetch, page }) => {
  fetch.getOnce({
    url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb00/',
    query: { key: 'key' },
    response: { body: { pages: [{ html: '<p>This is the Code of Conduct.</p>' }] } },
    delay: Duration.toMillis('2.5 seconds'),
  })

  await page.goto('/code-of-conduct', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})
