import {
  areLoggedIn,
  test as baseTest,
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

  await page.getByLabel('Yes', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await page.getByLabel('No', { exact: true }).check()
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
  await expect(page.getByRole('main')).toContainText('Does the dataset have enough metadata? Yes')
  await expect(page.getByRole('main')).toContainText(
    'Does this dataset include a way to list or track changes or versions? If so, does it seem accurate? No',
  )

  await page.getByRole('link', { name: 'Back to all reviews' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'PREreviews of Metadata collected from 500 articles in the field of ecology and evolution',
  )
  await expect(page.getByRole('article', { name: 'PREreview by A PREreviewer' })).toBeVisible()
})

test('can choose a locale before starting', async ({ page }, testInfo) => {
  await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })

  await page.getByRole('link', { name: 'português (Brasil)' }).click()

  testInfo.fail()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Avalie um conjunto de dados')
})

test.extend(canLogIn).extend(areLoggedIn)(
  'are returned to the next step if you have already started a PREreview',
  async ({ page }) => {
    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Yes').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.waitForLoadState()

    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Review a dataset')

    await expect(page.getByRole('main')).toContainText('carry on')

    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Does the dataset have enough metadata?')
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
  await page.getByLabel('Partly').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Partly').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  const review = page.getByRole('region', { name: 'Your review' })

  await expect(review).toContainText('Does this dataset follow FAIR and CARE principles? Partly')
  await expect(review).toContainText('Does the dataset have enough metadata? Partly')
  testInfo.fail()
  await expect(page.getByRole('main')).toContainText(
    'Does this dataset include a way to list or track changes or versions? If so, does it seem accurate? No',
  )

  await page.getByRole('link', { name: 'Change if the dataset follows FAIR and CARE principles' }).click()

  await page.getByLabel('I don’t know').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(review).toContainText('Does this dataset follow FAIR and CARE principles? I don’t know')

  await page.getByRole('link', { name: 'Change if the dataset has enough metadata' }).click()

  await page.getByLabel('I don’t know').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(review).toContainText('Does the dataset have enough metadata? I don’t know')

  await page
    .getByRole('link', { name: 'Change if the dataset includes a way to list or track changes or versions' })
    .click()

  await page.getByLabel('I don’t know').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(review).toContainText(
    'Does this dataset include a way to list or track changes or versions? If so, does it seem accurate? I don’t know',
  )
})

test.extend(canLogIn).extend(areLoggedIn)('can go back through the form', async ({ page }) => {
  await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('Yes').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('I don’t know').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your PREreview')

  await page.goBack()

  await expect(page.getByLabel('No', { exact: true })).toBeChecked()

  await page.goBack()

  await expect(page.getByLabel('I don’t know')).toBeChecked()

  await page.goBack()

  await expect(page.getByLabel('Yes')).toBeChecked()

  await page.goBack()

  await expect(page.getByRole('button', { name: 'Start now' })).toBeVisible()
})

test.extend(canLogIn).extend(areLoggedIn)('see existing values when going back a step', async ({ page }, testInfo) => {
  await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('Yes').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('I don’t know').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('No', { exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your PREreview')

  await page.getByRole('link', { name: 'Back' }).click()

  testInfo.fail()

  await expect(page.getByLabel('No', { exact: true })).toBeChecked()

  await page.getByRole('link', { name: 'Back' }).click()

  await expect(page.getByLabel('I don’t know')).toBeChecked()

  await page.getByRole('link', { name: 'Back' }).click()

  await expect(page.getByLabel('Yes')).toBeChecked()
  await expect(page.getByRole('link', { name: 'Back' })).not.toBeVisible()
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
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.goto(`${page.url()}/../has-enough-metadata`, { waitUntil: 'commit' })

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

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if the dataset has tracked changes',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/datasets/doi-10.5061-dryad.wstqjq2n3/review-this-dataset', { waitUntil: 'commit' })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.goto(`${page.url()}/../has-tracked-changes`, { waitUntil: 'commit' })

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(
      page.getByRole('group', {
        name: 'Does this dataset include a way to list or track changes or versions? If so, does it seem accurate?',
      }),
    ).toHaveAttribute('aria-invalid', 'true')

    await page
      .getByRole('link', { name: 'Select if the dataset has a way to list or track changes or versions' })
      .click()

    await expect(page.getByLabel('Yes')).toBeFocused()
  },
)
