import { test as baseTest, canChooseLocale, canReviewDatasets, expect } from './base.js'

const test = baseTest.extend(canReviewDatasets)

test('can review a dataset', async ({ page }, testInfo) => {
  await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset')

  testInfo.skip()

  await page.getByRole('button', { name: 'Start now' }).click()
})

test.extend(canChooseLocale)('can choose a locale before starting', async ({ page }, testInfo) => {
  await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset')

  await page.getByRole('link', { name: 'português (Brasil)' }).click()

  testInfo.fail()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Avalie um conjunto de dados')
})
