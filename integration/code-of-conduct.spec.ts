import { expect, test } from './base'

test('can read the Code of Conduct', async ({ fetch, page }) => {
  await page.goto('/')

  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb00', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>This is the Code of Conduct.</p>' }] } },
  )

  await page.getByRole('link', { name: 'Code of Conduct' }).click()

  await expect(page.getByRole('main')).toContainText('This is the Code of Conduct.')
  await expect(page.getByRole('link', { name: 'Code of Conduct' })).toHaveAttribute('aria-current', 'page')
})

test('might not load the text in time', async ({ fetch, page }) => {
  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb00', query: { key: 'key' } },
    new Promise(() => setTimeout(() => ({ body: { pages: [{ html: '<p>This is the Code of Conduct.</p>' }] } }), 2000)),
  )

  await page.goto('/code-of-conduct')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})
