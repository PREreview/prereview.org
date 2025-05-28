import { canChooseLocale, expect, test } from './base.js'

test.extend(canChooseLocale)('can choose a locale through picker and path', async ({ fetch, page }) => {
  const menu = page.getByRole('button', { name: 'Menu' }).or(page.getByRole('link', { name: 'Menu' }))

  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Open preprint reviews.')

  await page.getByRole('link', { name: 'português (Brasil)' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Avaliações abertas de preprints.')

  fetch.get(
    { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb14/', query: { key: 'key' } },
    { body: { pages: [{ html: '<p>Some information about us.</p>' }] } },
  )

  await menu.click()
  await page.getByRole('link', { name: 'Sobre nós' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sobre nós')

  await page.goto('/en-us')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Open preprint reviews.')

  await menu.click()
  await page.getByRole('link', { name: 'About' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText('About')

  await page.goto('/pt-br')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Avaliações abertas de preprints.')

  await menu.click()
  await page.getByRole('link', { name: 'Sobre nós' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sobre nós')

  await page.getByRole('link', { name: 'English (US)' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText('About')
})

test.extend(canChooseLocale).extend({ locale: 'pt-BR' })(
  'with a Brazilian-Portuguese browser',
  async ({ page }, testInfo) => {
    await page.goto('/')

    testInfo.fail()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Avaliações abertas de preprints.')

    await page.getByRole('link', { name: 'English (US)' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Open preprint reviews.')
  },
)

test.extend(canChooseLocale).extend({ locale: 'pt-PT' })(
  'with a European-Portuguese browser',
  async ({ page }, testInfo) => {
    await page.goto('/')

    testInfo.fail()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Avaliações abertas de preprints.')
    await expect(page.getByRole('link', { name: 'português (Brasil)' })).toHaveAttribute('aria-current', 'page')

    await page.getByRole('link', { name: 'English (US)' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Open preprint reviews.')
  },
)

test.extend(canChooseLocale).extend({ locale: 'is' })('with an Icelandic browser', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Open preprint reviews.')
  await expect(page.getByRole('link', { name: 'English (US)' })).toHaveAttribute('aria-current', 'true')

  await page.getByRole('link', { name: 'português (Brasil)' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Avaliações abertas de preprints.')
})
