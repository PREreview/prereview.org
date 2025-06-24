import { areLoggedIn, test as baseTest, canChooseLocale, canLogIn, canReviewDatasets, expect } from './base.js'

const test = baseTest.extend(canReviewDatasets)

test('can review a dataset', async ({ page }, testInfo) => {
  await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset')

  await page.getByRole('button', { name: 'Start now' }).click()

  testInfo.fail()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Does this dataset follow FAIR and CARE principles?')
})

test.extend(canChooseLocale)('can choose a locale before starting', async ({ page }, testInfo) => {
  await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset')

  await page.getByRole('link', { name: 'português (Brasil)' }).click()

  testInfo.fail()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Avalie um conjunto de dados')
})

test.extend(canLogIn).extend(areLoggedIn)(
  'are returned to the next step if you have already started a PREreview',
  async ({ page }, testInfo) => {
    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.waitForLoadState()

    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Review a dataset')

    testInfo.fail()

    await expect(page.getByRole('main')).toContainText('carry on')

    await page.getByRole('button', { name: 'Continue' }).click()
  },
)
