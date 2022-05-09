import { expect, test } from '@playwright/test'

test('can find and view a preprint', async ({ page }) => {
  await page.goto('/')
  await page.click(
    'text=Read reviews of “The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii”',
  )

  const reviews = page.locator('main')

  await expect(reviews).toContainText('1 PREreview')
})
