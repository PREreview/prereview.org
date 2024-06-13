import { expect, test } from './base.js'

test('can read the EDIA statement', async ({ fetch, page }) => {
  await page.goto('/')

  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb17', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>The EDIA statement.</p>' }] } },
  )

  await page.getByRole('link', { name: 'EDIA Statement' }).click()

  await expect(page.getByRole('main')).toContainText('The EDIA statement.')
  await expect(page.getByRole('link', { name: 'EDIA Statement' })).toHaveAttribute('aria-current', 'page')
})

test('might not load the text in time', async ({ fetch, page }) => {
  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb17', query: { key: 'key' } },
    new Promise(() => setTimeout(() => ({ body: { pages: [{ html: '<p>The EDIA statement.</p>' }] } }), 2000)),
  )

  await page.goto('/edia-statement')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})
