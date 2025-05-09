import { canChooseLocale, expect, test } from './base.js'

test.extend(canChooseLocale)(
  'can choose a locale through picker and path',
  async ({ fetch, javaScriptEnabled, page }, testInfo) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Open preprint reviews.')

    await page.getByRole('link', { name: 'português (Brasil)' }).click()

    testInfo.fail(!javaScriptEnabled)

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Avaliações abertas de preprints.')

    fetch.get(
      { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb14/', query: { key: 'key' } },
      { body: { pages: [{ html: '<p>Some information about us.</p>' }] } },
    )

    await page.getByRole('link', { name: 'Sobre nós' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Sobre nós')

    await page.goto('/en-us')

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Open preprint reviews.')

    await page.getByRole('link', { name: 'About' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('About')

    await page.goto('/pt-br')

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Avaliações abertas de preprints.')

    await page.getByRole('link', { name: 'Sobre nós' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Sobre nós')

    await page.getByRole('link', { name: 'English (US)' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('About')
  },
)
