import { Duration } from 'effect'
import { expect, test } from './base.ts'

test('can read about trainings', async ({ fetch, javaScriptEnabled, page }) => {
  const menu = page.getByRole('button', { name: 'Menu' }).or(page.getByRole('link', { name: 'Menu' }))

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await menu.click()

  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/64639b5007fb34a92c7f8518', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>Some information about trainings.</p>' }] } },
  )

  await page.getByRole('link', { name: 'Trainings' }).click()

  await expect(page.getByRole('main')).toContainText('Some information about trainings.')

  if (javaScriptEnabled) {
    await menu.click()

    await expect(page.getByRole('link', { name: 'Trainings' })).toHaveAttribute('aria-current', 'page')
  }
})

test('might not load the text in time', async ({ fetch, page }) => {
  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/64639b5007fb34a92c7f8518', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>Some information about trainings.</p>' }] } },
    { delay: Duration.toMillis('2.5 seconds') },
  )

  await page.goto('/trainings', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})
