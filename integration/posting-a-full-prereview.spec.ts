import { expect, test } from '@playwright/test'

test('can post a full PREreview', async ({ page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201')
  await page.click('text="Write a PREreview"')

  await page.fill('text=PREreview', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
  await page.click('text="Post PREreview"')

  const h1 = page.locator('h1')

  await expect(h1).toContainText('PREreview posted')

  await page.click('text="Back to preprint"')

  test.fixme(true, 'PREreview does not appear')

  const review = page.locator('main article').first()

  await expect(review).toContainText('Lorem ipsum dolor sit amet')
})
