import { expect, test } from './base.ts'

test('can choose a locale through picker and path', async ({ fetch, page }) => {
  const menu = page.getByRole('button', { name: 'Menu' }).or(page.getByRole('link', { name: 'Menu' }))

  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Open preprint reviews.')

  await page.getByRole('link', { name: 'português (Brasil)' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Avaliações abertas de preprints.')

  fetch
    .get(
      { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb14/', query: { key: 'key' } },
      { body: { pages: [{ html: '<p>Some information about us.</p>' }] } },
    )
    .get(
      { url: 'https://content.prereview.org/ghost/api/content/pages/68753c7207fb34a92c7fb259/', query: { key: 'key' } },
      { body: { pages: [{ html: '<p>Algumas informações sobre nós.</p>' }] } },
    )

  await menu.click()
  await page.getByRole('link', { name: 'Sobre nós', exact: true }).click()

  await expect(page.getByRole('main')).toContainText('Algumas informações sobre nós.')

  await page.goto('/en-us', { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Open preprint reviews.')

  await menu.click()
  await page.getByRole('link', { name: 'About', exact: true }).click()

  await expect(page.getByRole('main')).toContainText('Some information about us.')

  await page.goto('/pt-br', { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Avaliações abertas de preprints.')

  await menu.click()
  await page.getByRole('link', { name: 'Sobre nós', exact: true }).click()

  await expect(page.getByRole('main')).toContainText('Algumas informações sobre nós.')

  await page.getByRole('link', { name: 'English (US)' }).click()

  await expect(page.getByRole('main')).toContainText('Some information about us.')
})

test.extend({ locale: 'pt-BR' })('with a Brazilian-Portuguese browser', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Avaliações abertas de preprints.')

  await page.getByRole('link', { name: 'English (US)' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Open preprint reviews.')
})

test.extend({ locale: 'pt-PT' })('with a European-Portuguese browser', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Avaliações abertas de preprints.')
  await expect(page.getByRole('link', { name: 'português (Brasil)' })).toHaveAttribute('aria-current', 'true')

  await page.getByRole('link', { name: 'English (US)' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Open preprint reviews.')
})

test.extend({ locale: 'is' })('with an Icelandic browser', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Open preprint reviews.')
  await expect(page.getByRole('link', { name: 'English (US)' })).toHaveAttribute('aria-current', 'true')

  await page.getByRole('link', { name: 'português (Brasil)' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Avaliações abertas de preprints.')
})
