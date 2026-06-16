import {
  areLoggedIn,
  canLogIn,
  expect,
  invitedMyselfToBeADatasetReviewAuthor,
  invitedToBeADatasetReviewAuthor,
  test,
} from './base.ts'

test.extend(canLogIn).extend(invitedToBeADatasetReviewAuthor)('can accept an invite', async ({ page }) => {
  const opener = page.waitForEvent('popup')
  await page.getByRole('link', { name: 'Be listed as an author' }).click()
  page = await opener

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

test.extend(invitedToBeADatasetReviewAuthor)('can choose a locale before starting', async ({ page }) => {
  const opener = page.waitForEvent('popup')
  await page.getByRole('link', { name: 'Be listed as an author' }).click()
  page = await opener

  await page.getByRole('link', { name: 'português (Brasil)' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Aparecer como autor')
})

test.extend(canLogIn).extend(areLoggedIn).extend(invitedToBeADatasetReviewAuthor)(
  'can accept an invite using a pseudonym',
  async ({ page }) => {
    const opener = page.waitForEvent('popup')
    await page.getByRole('link', { name: 'Be listed as an author' }).click()
    page = await opener

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
  async ({ page: emailPage }) => {
    const opener1 = emailPage.waitForEvent('popup')
    await emailPage.getByRole('link', { name: 'Be listed as an author' }).click()
    const page1 = await opener1

    await page1.getByRole('button', { name: 'Start now' }).click()
    await page1.getByLabel('Josiah Carberry').check()
    await page1.getByRole('button', { name: 'Save and continue' }).click()

    const opener2 = emailPage.waitForEvent('popup')
    await emailPage.getByRole('link', { name: 'Be listed as an author' }).click()
    const page2 = await opener2

    await expect(page2.getByRole('main')).toContainText('Authored by Red Wolf and 2 other authors')

    await page2.getByRole('button', { name: 'Start now' }).click()

    await expect(page2.getByRole('heading', { level: 1 })).toHaveText('Check your details')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(invitedMyselfToBeADatasetReviewAuthor)(
  "don't appear twice if you invited yourself",
  async ({ page }) => {
    const opener = page.waitForEvent('popup')
    await page.getByRole('link', { name: 'Be listed as an author' }).click()
    page = await opener

    await expect(page.getByRole('main')).toContainText('Authored by Josiah Carberry and 2 other authors')

    await page.getByRole('button', { name: 'Start now' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Name added')

    await page.getByRole('link', { name: 'see the PREreview' }).click()

    await expect(page.getByRole('main')).toContainText('Authored by Josiah Carberry and 1 other author')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(invitedToBeADatasetReviewAuthor)(
  "don't appear twice if you accept multiple invites",
  async ({ page: emailPage, emails }) => {
    const opener1 = emailPage.waitForEvent('popup')
    await emailPage.getByRole('link', { name: 'Be listed as an author' }).click()
    const page1 = await opener1

    await expect(page1.getByRole('main')).toContainText('Authored by Red Wolf and 2 other authors')

    await page1.getByRole('button', { name: 'Start now' }).click()

    await emailPage.setContent(String(emails[1]?.html))
    const opener2 = emailPage.waitForEvent('popup')
    await emailPage.getByRole('link', { name: 'Be listed as an author' }).click()
    const page2 = await opener2

    await expect(page2.getByRole('main')).toContainText('Authored by Red Wolf and 2 other authors')

    await page2.getByRole('button', { name: 'Start now' }).click()
    await page2.getByLabel('Josiah Carberry').check()
    await page2.getByRole('button', { name: 'Save and continue' }).click()
    await page2.getByRole('button', { name: 'Update PREreview' }).click()
    await page2.getByRole('link', { name: 'see the PREreview' }).click()

    await expect(page2.getByRole('main')).toContainText('Authored by Red Wolf and Josiah Carberry')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(invitedToBeADatasetReviewAuthor)(
  'can change the name after previewing',
  async ({ page }) => {
    const opener = page.waitForEvent('popup')
    await page.getByRole('link', { name: 'Be listed as an author' }).click()
    page = await opener

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
