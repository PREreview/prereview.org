import { expect, test } from './test'

test('can find and view a review', async ({ page }) => {
  await page.goto('/preprints/doi-10.1101-2022.01.13.476201')
  await page.click('text=Read the review by Jingfang Hao et al')

  const review = page.locator('main')

  await expect(review).toContainText('This work enriches the knowledge')
})
