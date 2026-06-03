import {
  areLoggedIn,
  canLogIn,
  expect,
  invitedMyselfToBeADatasetReviewAuthor,
  invitedToBeADatasetReviewAuthor,
  test,
} from './base.ts'

test.extend(canLogIn).extend(invitedToBeADatasetReviewAuthor)('can accept an invite', async ({ page }) => {
  await page.goto('/dataset-review-author-invite/ccc27378-d568-42a5-b8e6-a7830478165d/start-now', {
    waitUntil: 'commit',
  })

  await expect(page.getByRole('main')).toContainText('Authored by Red Wolf and 2 other authors')

  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your details')
  await expect(page.getByRole('main')).toContainText('Published name Josiah Carberry')

  await page.getByRole('button', { name: 'Update PREreview' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Name added')

  await page.getByRole('link', { name: 'see the PREreview' }).click()

  await expect(page.getByRole('main')).toContainText('Authored by Red Wolf, Josiah Carberry, and 1 other author')
})

test.extend(invitedToBeADatasetReviewAuthor)('can choose a locale before starting', async ({ page }, testInfo) => {
  await page.goto('/dataset-review-author-invite/ccc27378-d568-42a5-b8e6-a7830478165d/start-now', {
    waitUntil: 'commit',
  })

  await page.getByRole('link', { name: 'português (Brasil)' }).click()

  testInfo.fail()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Aparecer como autor')
})

test.extend(canLogIn).extend(areLoggedIn).extend(invitedToBeADatasetReviewAuthor)(
  'can accept an invite using a pseudonym',
  async ({ page }) => {
    await page.goto('/dataset-review-author-invite/ccc27378-d568-42a5-b8e6-a7830478165d/start-now', {
      waitUntil: 'commit',
    })

    await expect(page.getByRole('main')).toContainText('Authored by Red Wolf and 2 other authors')

    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Orange Panda').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your details')
    await expect(page.getByRole('main')).toContainText('Published name Orange Panda')

    await page.getByRole('button', { name: 'Update PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Name added')

    await page.getByRole('link', { name: 'see the PREreview' }).click()

    await expect(page.getByRole('main')).toContainText('Authored by Red Wolf, Orange Panda, and 1 other author')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(invitedToBeADatasetReviewAuthor)(
  'are returned to the next step if you have already started the flow',
  async ({ page }) => {
    await page.goto('/dataset-review-author-invite/ccc27378-d568-42a5-b8e6-a7830478165d/start-now', {
      waitUntil: 'commit',
    })

    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await page.goto('/dataset-review-author-invite/ccc27378-d568-42a5-b8e6-a7830478165d/start-now', {
      waitUntil: 'commit',
    })

    await expect(page.getByRole('main')).toContainText('Authored by Red Wolf and 2 other authors')

    await page.getByRole('button', { name: 'Start now' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your details')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(invitedMyselfToBeADatasetReviewAuthor)(
  "don't appear twice if you invited yourself",
  async ({ page }) => {
    await page.goto('/dataset-review-author-invite/ccc27378-d568-42a5-b8e6-a7830478165d/start-now', {
      waitUntil: 'commit',
    })

    await expect(page.getByRole('main')).toContainText('Authored by Josiah Carberry and 2 other authors')

    await page.getByRole('button', { name: 'Start now' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Name added')

    await page.getByRole('link', { name: 'see the PREreview' }).click()

    await expect(page.getByRole('main')).toContainText('Authored by Josiah Carberry and 1 other author')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(invitedToBeADatasetReviewAuthor)(
  "don't appear twice if you accept multiple invites",
  async ({ page }) => {
    await page.goto('/dataset-review-author-invite/ccc27378-d568-42a5-b8e6-a7830478165d/start-now', {
      waitUntil: 'commit',
    })

    await expect(page.getByRole('main')).toContainText('Authored by Red Wolf and 2 other authors')

    await page.getByRole('button', { name: 'Start now' }).click()

    await page.goto('/dataset-review-author-invite/ac3bff19-c369-4009-801d-c67d63518d52/start-now', {
      waitUntil: 'commit',
    })

    await expect(page.getByRole('main')).toContainText('Authored by Red Wolf and 2 other authors')

    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByRole('button', { name: 'Update PREreview' }).click()
    await page.getByRole('link', { name: 'see the PREreview' }).click()

    await expect(page.getByRole('main')).toContainText('Authored by Red Wolf and Josiah Carberry')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(invitedToBeADatasetReviewAuthor)(
  'can change the name after previewing',
  async ({ page }) => {
    await page.goto('/dataset-review-author-invite/ccc27378-d568-42a5-b8e6-a7830478165d/start-now', {
      waitUntil: 'commit',
    })
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText('Published name Josiah Carberry')

    await page.getByRole('link', { name: 'Change name' }).click()
    await page.getByLabel('Orange Panda').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText('Published name Orange Panda')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(invitedToBeADatasetReviewAuthor)(
  'have to choose a name',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/dataset-review-author-invite/ccc27378-d568-42a5-b8e6-a7830478165d/start-now', {
      waitUntil: 'commit',
    })
    await page.getByRole('button', { name: 'Start now' }).click()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByRole('group', { name: 'What name would you like to use?' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await page.getByRole('link', { name: 'Select the name that you would like to use' }).click()

    await expect(page.getByLabel('Josiah Carberry')).toBeFocused()
  },
)
