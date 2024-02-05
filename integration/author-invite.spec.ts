import type { FetchMockSandbox } from 'fetch-mock'
import * as E from 'fp-ts/Either'
import * as J from 'fp-ts/Json'
import { pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import {
  canLogIn,
  expect,
  hasAVerifiedEmailAddress,
  hasAnUnverifiedEmailAddress,
  invitedToBeAnAuthor,
  test,
  willUpdateAReview,
} from './base'

test.extend(canLogIn).extend(hasAVerifiedEmailAddress).extend(invitedToBeAnAuthor).extend(willUpdateAReview)(
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

test.extend(canLogIn).extend(hasAVerifiedEmailAddress).extend(invitedToBeAnAuthor).extend(willUpdateAReview)(
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

test.extend(canLogIn).extend(hasAVerifiedEmailAddress).extend(invitedToBeAnAuthor)(
  'can change the name after previewing',
  async ({ page }) => {
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

test.extend(canLogIn).extend(invitedToBeAnAuthor)(
  'can use a different email address',
  async ({ fetch, javaScriptEnabled, page }) => {
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.goto('/author-invite/bec5727e-9992-4f3b-85be-6712df617b9d/enter-email-address')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contact details')

    await page.getByLabel('A different one').check()
    await page.getByLabel('What is your email address?').fill('notjcarberry@example.com')

    fetch.postOnce('https://api.mailjet.com/v3.1/send', { body: { Messages: [{ Status: 'success' }] } })

    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Verify your email address')

    await page.setContent(getLastMailjetEmailBody(fetch))
    await page.getByRole('link', { name: 'Verify email address' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'Success' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'Success' })).toBeInViewport()
    }
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your details')

    await page.reload()

    await expect(page.getByRole('alert', { name: 'Success' })).toBeHidden()
  },
)

test.extend(canLogIn).extend(hasAnUnverifiedEmailAddress).extend(invitedToBeAnAuthor)(
  'have to verify your email address',
  async ({ fetch, javaScriptEnabled, page }) => {
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Josiah Carberry').check()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.goto('/author-invite/bec5727e-9992-4f3b-85be-6712df617b9d/enter-email-address')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contact details')

    await expect(page.getByLabel('A different one')).toBeChecked()
    await expect(page.getByLabel('What is your email address?')).toHaveValue('jcarberry@example.com')

    fetch.postOnce('https://api.mailjet.com/v3.1/send', { body: { Messages: [{ Status: 'success' }] } })

    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Verify your email address')

    await page.setContent(getLastMailjetEmailBody(fetch))
    await page.getByRole('link', { name: 'Verify email address' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'Success' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'Success' })).toBeInViewport()
    }
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your details')

    await page.reload()

    await expect(page.getByRole('alert', { name: 'Success' })).toBeHidden()
  },
)

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

const getLastMailjetEmailBody = (fetch: FetchMockSandbox) => {
  return pipe(
    MailjetEmailD.decode(String(fetch.lastOptions('https://api.mailjet.com/v3.1/send')?.body)),
    E.match(
      () => {
        throw new Error('No email found')
      },
      email => email.HtmlPart,
    ),
  )
}

const JsonD = {
  decode: (s: string) =>
    pipe(
      J.parse(s),
      E.mapLeft(() => D.error(s, 'JSON')),
    ),
}

const MailjetEmailD = pipe(
  JsonD,
  D.compose(D.struct({ Messages: D.tuple(D.struct({ HtmlPart: D.string })) })),
  D.map(body => body.Messages[0]),
)
