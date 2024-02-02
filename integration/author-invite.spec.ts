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
