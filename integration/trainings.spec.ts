import { Duration } from 'effect'
import { expect, test } from './base.js'

test('can read about trainings', async ({ fetch, page }) => {
  await page.goto('/')

  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/64639b5007fb34a92c7f8518', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>Some information about trainings.</p>' }] } },
  )

  await page.addLocatorHandler(page.getByRole('button', { name: 'Menu', expanded: false }), async () => {
    await page.getByRole('button', { name: 'Menu' }).click()
  })

  await page.getByRole('link', { name: 'Trainings' }).click()

  await expect(page.getByRole('main')).toContainText('Some information about trainings.')
  await expect(page.getByRole('link', { name: 'Trainings' })).toHaveAttribute('aria-current', 'page')
})

test('might not load the text in time', async ({ fetch, page }) => {
  fetch.getOnce(
    { url: 'https://content.prereview.org/ghost/api/content/pages/64639b5007fb34a92c7f8518', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>Some information about trainings.</p>' }] } },
    { delay: Duration.toMillis('2.5 seconds') },
  )

  await page.goto('/trainings')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})
