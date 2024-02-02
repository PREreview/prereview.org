import { canLogIn, expect, invitedToBeAnAuthor, test, willUpdateAReview } from './base'

test.extend(canLogIn).extend(invitedToBeAnAuthor).extend(willUpdateAReview)(
  'can accept an invite',
  async ({ page }) => {
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your details')
    await expect(page.getByRole('main')).toContainText('Published name Josiah Carberry')

    await page.getByRole('button', { name: 'Update PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Name added')
  },
)

test.extend(canLogIn).extend(invitedToBeAnAuthor).extend(willUpdateAReview)(
  'can accept an invite using a pseudonym',
  async ({ page }) => {
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Orange Panda').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your details')
    await expect(page.getByRole('main')).toContainText('Published name Orange Panda')

    await page.getByRole('button', { name: 'Update PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Name added')
  },
)

test.extend(canLogIn).extend(invitedToBeAnAuthor)('can change the name after previewing', async ({ page }) => {
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Published name Josiah Carberry')

  await page.getByRole('link', { name: 'Change name' }).click()
  await page.getByLabel('Orange Panda').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Published name Orange Panda')
})

test.extend(canLogIn).extend(invitedToBeAnAuthor)('have to choose a name', async ({ javaScriptEnabled, page }) => {
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
})

test.extend(canLogIn).extend(invitedToBeAnAuthor)('can use the invite email address', async ({ page }) => {
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.goto('/author-invite/bec5727e-9992-4f3b-85be-6712df617b9d/enter-email-address')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contact details')

  await page.getByLabel('jcarberry@example.com').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your details')
})

test.extend(canLogIn).extend(invitedToBeAnAuthor)('can use a different email address', async ({ page }) => {
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel('Josiah Carberry').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.goto('/author-invite/bec5727e-9992-4f3b-85be-6712df617b9d/enter-email-address')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contact details')

  await page.getByLabel('A different one').check()
  await page.getByLabel('What is your email address?').fill('notjcarberry@example.com')
  await page.getByRole('button', { name: 'Save and continue' }).click()
})

test.extend(canLogIn).extend(invitedToBeAnAuthor)(
  'have to enter an email address',
  async ({ javaScriptEnabled, page }) => {
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.goto('/author-invite/bec5727e-9992-4f3b-85be-6712df617b9d/enter-email-address')

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByRole('group', { name: 'What email address should we use?' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await page.getByRole('link', { name: 'Select the email address that you would like to use' }).click()

    await expect(page.getByLabel('jcarberry@example.com')).toBeFocused()

    await page.getByLabel('A different one').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByLabel('What is your email address?')).toHaveAttribute('aria-invalid', 'true')

    await page.getByRole('link', { name: 'Enter your email address' }).click()

    await expect(page.getByLabel('What is your email address?')).toBeFocused()
  },
)

test.extend(canLogIn).extend(invitedToBeAnAuthor)(
  'have to enter a valid email address',
  async ({ javaScriptEnabled, page }) => {
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.goto('/author-invite/bec5727e-9992-4f3b-85be-6712df617b9d/enter-email-address')
    await page.getByLabel('A different one').check()
    await page.getByLabel('What is your email address?').fill('not an email address')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByLabel('What is your email address?')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('What is your email address?')).toHaveValue('not an email address')

    await page
      .getByRole('link', { name: 'Enter an email address in the correct format, like name@example.com' })
      .click()

    await expect(page.getByLabel('What is your email address?')).toBeFocused()
  },
)
