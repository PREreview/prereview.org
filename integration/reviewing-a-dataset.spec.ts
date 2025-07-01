import {
  areLoggedIn,
  test as baseTest,
  canChooseLocale,
  canLogIn,
  canReviewDatasets,
  expect,
  useCockroachDB,
} from './base.js'

const test = baseTest.extend(useCockroachDB).extend(canReviewDatasets)

test.extend(canLogIn)('can review a dataset', async ({ page }, testInfo) => {
  await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })

  await expect(page.getByRole('main')).toContainText('We will ask you to log in')

  await page.getByRole('button', { name: 'Start now' }).click()

  testInfo.fail()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Does this dataset follow FAIR and CARE principles?')
})

test.extend(canChooseLocale)('can choose a locale before starting', async ({ page }, testInfo) => {
  await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })

  await page.getByRole('link', { name: 'português (Brasil)' }).click()

  testInfo.fail()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Avalie um conjunto de dados')
})

test.extend(canLogIn).extend(areLoggedIn)(
  'are returned to the next step if you have already started a PREreview',
  async ({ page }, testInfo) => {
    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.waitForLoadState()

    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Review a dataset')

    await expect(page.getByRole('main')).toContainText('carry on')

    await page.getByRole('button', { name: 'Continue' }).click()

    testInfo.fail()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Does this dataset follow FAIR and CARE principles?',
    )
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  "aren't told about ORCID when already logged in",
  async ({ page }, testInfo) => {
    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })

    await expect(page.getByRole('main')).not.toContainText('ORCID')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Review a dataset')

    await page.getByRole('button', { name: 'Start now' }).click()

    testInfo.fail()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Does this dataset follow FAIR and CARE principles?',
    )
  },
)
