import { expect, test } from '@playwright/test'

test('might not find anything', async ({ page }) => {
  await page.goto('/')
  await page.fill('text="Preprint DOI"', 'this should not find anything')
  await page.click('text="Find reviews"')

  const h1 = page.locator('h1')

  await expect(h1).toHaveText('Not Found')
})

test('can find and view a preprint', async ({ page }) => {
  await page.goto('/')
  await page.fill('text="Preprint DOI"', '10.1101/2022.01.13.476201')
  await page.click('text="Find reviews"')

  const h1 = page.locator('h1')
  const reviews = page.locator('main')

  await expect(h1).toHaveText('The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii')
  await expect(reviews).toContainText('1 PREreview')
})
