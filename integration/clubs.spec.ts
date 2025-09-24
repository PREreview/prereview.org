import { Duration } from 'effect'
import { expect, test } from './base.ts'

test('can read about clubs', async ({ fetch, javaScriptEnabled, page }) => {
  const menu = page.getByRole('button', { name: 'Menu' }).or(page.getByRole('link', { name: 'Menu' }))

  await page.goto('/', { waitUntil: 'domcontentloaded' })

  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/64637b4c07fb34a92c7f84ec', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>Some information about clubs.</p>' }] } },
  )

  await menu.click()
  await page.getByRole('link', { name: 'Clubs', exact: true }).click()

  await expect(page.getByRole('main')).toContainText('Some information about clubs.')

  if (javaScriptEnabled) {
    await menu.click()

    await expect(page.getByRole('link', { name: 'Clubs' })).toHaveAttribute('aria-current', 'page')
  }
})

test('might not load the text in time', async ({ fetch, page }) => {
  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/64637b4c07fb34a92c7f84ec', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>Some information about clubs.</p>' }] } },
    { delay: Duration.toMillis('2.5 seconds') },
  )

  await page.goto('/clubs', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})
