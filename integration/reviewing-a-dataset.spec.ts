import {
  areLoggedIn,
  test as baseTest,
  canChooseLocale,
  canLogIn,
  canReviewDatasets,
  expect,
  useCockroachDB,
  willPublishADatasetReview,
} from './base.js'

const test = baseTest.extend(useCockroachDB).extend(canReviewDatasets)

test.extend(canLogIn).extend(willPublishADatasetReview)('can review a dataset', async ({ javaScriptEnabled, page }) => {
  await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })

  await expect(page.getByRole('main')).toContainText('We will ask you to log in')

  await page.getByRole('button', { name: 'Start now' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Does this dataset follow FAIR and CARE principles?')

  await page.getByLabel('Partly', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your PREreview')

  await page.getByRole('button', { name: 'Publish PREreview' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('We’re publishing your PREreview')

  if (javaScriptEnabled) {
    await expect(page.getByRole('link', { name: 'Continue' })).toBeVisible()

    await page.getByRole('link', { name: 'Continue' }).click()
  } else {
    await expect(async () => {
      await page.getByRole('link', { name: 'Reload page' }).click()

      await expect(page.getByRole('link', { name: 'Reload page' })).not.toBeVisible()
    }).toPass()
  }

  await expect(page.getByRole('heading', { level: 1 })).toContainText('PREreview published')
  await expect(page.getByRole('main')).toContainText('Your DOI 10.5072/zenodo.1055806')

  await page.getByRole('link', { name: 'See your review' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Structured PREreview of “Metadata collected from 500 articles in the field of ecology and evolution”',
  )
  await expect(page.getByRole('main')).toContainText('Does this dataset follow FAIR and CARE principles? Partly')

  await page.getByRole('link', { name: 'Back to all reviews' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'PREreviews of Metadata collected from 500 articles in the field of ecology and evolution',
  )
  await expect(page.getByRole('article', { name: 'PREreview by A PREreviewer' })).toBeVisible()
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
    await page.getByLabel('Yes').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.waitForLoadState()

    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Review a dataset')

    await expect(page.getByRole('main')).toContainText('carry on')

    await page.getByRole('button', { name: 'Continue' }).click()

    testInfo.fail()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your PREreview')
  },
)

test.extend(canLogIn).extend(areLoggedIn)("aren't told about ORCID when already logged in", async ({ page }) => {
  await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })

  await expect(page.getByRole('main')).not.toContainText('ORCID')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Review a dataset')

  await page.getByRole('button', { name: 'Start now' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Does this dataset follow FAIR and CARE principles?')
})

test.extend(canLogIn).extend(areLoggedIn)('can change your answers before publishing', async ({ page }, testInfo) => {
  await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('Partly').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  const review = page.getByRole('region', { name: 'Your review' })

  await expect(review).toContainText('Does this dataset follow FAIR and CARE principles? Partly')

  testInfo.fail()
  await expect(page.getByRole('link', { name: 'Change if the dataset follows FAIR and CARE principles' })).toBeVisible()

  await page.getByRole('link', { name: 'Change if the dataset follows FAIR and CARE principles' }).click()

  await page.getByLabel('I don’t know').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(review).toContainText('Does this dataset follow FAIR and CARE principles? I don’t know')
})

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if the dataset follows FAIR and CARE principles',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(
      page.getByRole('group', { name: 'Does this dataset follow FAIR and CARE principles?' }),
    ).toHaveAttribute('aria-invalid', 'true')

    await page.getByRole('link', { name: 'Select if the dataset follows FAIR and CARE principles' }).click()

    await expect(page.getByLabel('Yes')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if the dataset has enough metadata',
  async ({ javaScriptEnabled, page }, testInfo) => {
    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.goto(`${page.url()}/../has-enough-metadata`, { waitUntil: 'commit' })

    testInfo.fail()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Does the dataset have enough metadata?')

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByRole('group', { name: 'Does the dataset have enough metadata?' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await page.getByRole('link', { name: 'Select if the dataset has enough metadata' }).click()

    await expect(page.getByLabel('Yes')).toBeFocused()
  },
)
