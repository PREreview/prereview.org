import type { FetchMockSandbox } from 'fetch-mock'
import * as E from 'fp-ts/Either'
import * as J from 'fp-ts/Json'
import { pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import type { MutableRedirectUri } from 'oauth2-mock-server'
import path from 'path'
import {
  areLoggedIn,
  canConnectOrcidProfile,
  canLogIn,
  canUploadAvatar,
  expect,
  hasAVerifiedEmailAddress,
  isANewUser,
  isASlackUser,
  test,
  userIsBlocked,
} from './base'

test.extend(canLogIn).extend(areLoggedIn)('can view my details', async ({ page }) => {
  await page.getByRole('link', { name: 'My details' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My details')
  await expect(page.getByRole('link', { name: 'My details' })).toHaveAttribute('aria-current', 'page')
})

test.extend(canLogIn).extend(areLoggedIn).extend(isANewUser)(
  'are prompted to view my details once',
  async ({ page }) => {
    await expect(page.getByRole('link', { name: 'My details' })).toContainText('New notification')

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('link', { name: 'My details' }).click()

    await expect(page.getByRole('main')).toContainText('Welcome to PREreview!')
    await expect(page.getByRole('link', { name: 'My details' })).not.toContainText('New notification')

    await page.reload()

    await expect(page.getByRole('main')).not.toContainText('Welcome to PREreview!')

    await page.goto('/')

    await expect(page.getByRole('link', { name: 'My details' })).not.toContainText('New notification')
  },
)

test.extend(canLogIn).extend(areLoggedIn)('can give my email address', async ({ javaScriptEnabled, fetch, page }) => {
  await page.getByRole('link', { name: 'My details' }).click()
  await page.getByRole('link', { name: 'Enter email address' }).click()
  await page.getByLabel('What is your email address?').fill('jcarberry@example.com')

  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  fetch.postOnce('https://api.mailjet.com/v3.1/send', { body: { Messages: [{ Status: 'success' }] } })

  await page.getByRole('button', { name: 'Save and continue' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'Important' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'Important' })).toBeInViewport()
  }
  await expect(page.getByRole('main')).toContainText('Email address jcarberry@example.com Unverified')

  await page.reload()

  await expect(page.getByRole('alert', { name: 'Important' })).toBeHidden()

  await page.setContent(getLastMailjetEmailBody(fetch))

  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  const opener = page.waitForEvent('popup')
  await page.getByRole('link', { name: 'Verify email address' }).click()
  page = await opener

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'Success' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'Success' })).toBeInViewport()
  }
  await expect(page.getByRole('main')).not.toContainText('Unverified')

  await page.reload()

  await expect(page.getByRole('alert', { name: 'Success' })).toBeHidden()

  await page.getByRole('link', { name: 'Change email address' }).click()

  await expect(page.getByLabel('What is your email address?')).toHaveValue('jcarberry@example.com')
})

test.extend(canLogIn).extend(areLoggedIn).extend(canConnectOrcidProfile)(
  'can connect my ORCID profile',
  async ({ fetch, javaScriptEnabled, page }) => {
    await page.getByRole('link', { name: 'My details' }).click()
    await page.getByRole('link', { name: 'Connect ORCID profile' }).click()
    await page.getByRole('button', { name: 'Start now' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'Success' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'Success' })).toBeInViewport()
    }
    await expect(page.getByRole('main')).toContainText('ORCID profile Connected')

    await page.reload()

    await expect(page.getByRole('alert', { name: 'Success' })).toBeHidden()

    fetch.postOnce('http://orcid.test/revoke', { status: Status.OK })

    await page.getByRole('link', { name: 'Disconnect ORCID profile' }).click()
    await page.getByRole('button', { name: 'Disconnect profile' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'Success' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'Success' })).toBeInViewport()
    }
    await expect(page.getByRole('link', { name: 'Connect ORCID profile' })).toBeVisible()

    await page.reload()

    await expect(page.getByRole('alert', { name: 'Success' })).toBeHidden()
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canConnectOrcidProfile)(
  'have to grant access to your ORCID profile',
  async ({ oauthServer, page }) => {
    await page.goto('/connect-orcid')
    oauthServer.service.once('beforeAuthorizeRedirect', ({ url }: MutableRedirectUri) => {
      url.searchParams.delete('code')
      url.searchParams.set('error', 'access_denied')
    })
    await page.getByRole('button', { name: 'Start now' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we can’t connect your profile')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canUploadAvatar)(
  'can upload an avatar',
  async ({ page }, testInfo) => {
    await page.getByRole('link', { name: 'My details' }).click()
    await page.goto('/my-details/change-avatar')
    await page.getByLabel('Upload an avatar').setInputFiles(path.join(__dirname, 'fixtures', '600x400.png'))
    await page.getByRole('button', { name: 'Save and continue' }).click()

    testInfo.fail()

    await expect(page.getByRole('main')).toContainText('Avatar')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(isASlackUser)(
  'can connect my Slack Community account',
  async ({ javaScriptEnabled, page }) => {
    await page.getByRole('link', { name: 'My details' }).click()
    await page.getByRole('link', { name: 'Connect Slack account' }).click()

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Start now' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'Success' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'Success' })).toBeInViewport()
    }
    await expect(page.getByRole('main')).toContainText('Slack Community name jcarberry')

    await page.reload()

    await expect(page.getByRole('alert', { name: 'Success' })).toBeHidden()

    await page.getByRole('link', { name: 'Disconnect Slack account' }).click()
    await page.getByRole('button', { name: 'Disconnect account' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'Success' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'Success' })).toBeInViewport()
    }
    await expect(page.getByRole('link', { name: 'Connect Slack account' })).toBeVisible()

    await page.reload()

    await expect(page.getByRole('alert', { name: 'Success' })).toBeHidden()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to grant access to your Slack Community account',
  async ({ javaScriptEnabled, oauthServer, page }) => {
    await page.goto('/connect-slack')
    oauthServer.service.once('beforeAuthorizeRedirect', ({ url }: MutableRedirectUri) => {
      url.searchParams.delete('code')
      url.searchParams.set('error', 'access_denied')
    })
    await page.getByRole('button', { name: 'Start now' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we can’t connect your account')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Tab')

    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
    await expect(page).toHaveScreenshot()

    await page.keyboard.press('Enter')

    if (javaScriptEnabled) {
      await expect(page.getByRole('main')).toBeFocused()
    }
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn)('can set my career stage', async ({ page }) => {
  await page.getByRole('link', { name: 'My details' }).click()
  await page.getByRole('link', { name: 'Enter career stage' }).click()
  await page.getByLabel('Early').check()

  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Career stage Early Only visible to PREreview')

  await page.getByRole('link', { name: 'Change career stage' }).click()

  await expect(page.getByLabel('Early')).toBeChecked()

  await page.getByRole('link', { name: 'Back' }).click()
  await page.getByRole('link', { name: 'Set career-stage visibility' }).click()

  await expect(page.getByLabel('Only PREreview')).toBeChecked()

  await page.getByLabel('Everyone').check()

  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Career stage Early Shown on your public profile')
})

test.extend(canLogIn).extend(areLoggedIn).extend(isASlackUser)("can say if I'm open for requests", async ({ page }) => {
  await page.getByRole('link', { name: 'My details' }).click()
  await page.getByRole('link', { name: 'Connect Slack account' }).click()
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByRole('link', { name: 'Enter open for review requests' }).click()
  await page.getByLabel('Yes').check()

  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Open for review requests Yes Only visible to PREreview')

  await page.getByRole('link', { name: 'Set open-for-review-requests visibility' }).click()

  await expect(page.getByLabel('Only PREreview')).toBeChecked()

  await page.getByLabel('Everyone').check()

  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Open for review requests Yes Shown on your public profile')

  await page.getByRole('link', { name: 'Change open for review requests' }).click()
  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Open for review requests No')
})

test.extend(canLogIn).extend(areLoggedIn)('can set my research interests', async ({ page }) => {
  await page.getByRole('link', { name: 'My details' }).click()
  await page.getByRole('link', { name: 'Enter research interests' }).click()
  await page
    .getByLabel('What are your research interests?')
    .fill('Nunc vestibulum sapien eu magna elementum consectetur.')

  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText(
    'Research interests Nunc vestibulum sapien eu magna elementum consectetur. Only visible to PREreview',
  )

  await page.getByRole('link', { name: 'Change research interests' }).click()

  await expect(page.getByLabel('What are your research interests?')).toHaveValue(
    'Nunc vestibulum sapien eu magna elementum consectetur.',
  )

  await page.getByRole('link', { name: 'Back' }).click()
  await page.getByRole('link', { name: 'Set research-interests visibility' }).click()

  await expect(page.getByLabel('Only PREreview')).toBeChecked()

  await page.getByLabel('Everyone').check()

  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText(
    'Research interests Nunc vestibulum sapien eu magna elementum consectetur. Shown on your public profile',
  )
})

test.extend(canLogIn).extend(areLoggedIn)('can set my location', async ({ page }) => {
  await page.getByRole('link', { name: 'My details' }).click()

  await page.getByRole('link', { name: 'Enter location' }).click()
  await page.getByLabel('Where are you based?').fill('Vivamus in convallis urna.')

  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Location Vivamus in convallis urna. Only visible to PREreview')

  await page.getByRole('link', { name: 'Change location' }).click()

  await expect(page.getByLabel('Where are you based?')).toHaveValue('Vivamus in convallis urna.')

  await page.getByRole('link', { name: 'Back' }).click()
  await page.getByRole('link', { name: 'Set location visibility' }).click()

  await expect(page.getByLabel('Only PREreview')).toBeChecked()

  await page.getByLabel('Everyone').check()

  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Location Vivamus in convallis urna. Shown on your public profile')
})

test.extend(canLogIn).extend(areLoggedIn)('can set my languages', async ({ page }) => {
  await page.getByRole('link', { name: 'My details' }).click()

  await page.getByRole('link', { name: 'Enter languages' }).click()
  await page.getByLabel('What languages can you review in?').fill('English and Spanish')

  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Languages English and Spanish Only visible to PREreview')

  await page.getByRole('link', { name: 'Change languages' }).click()

  await expect(page.getByLabel('What languages can you review in?')).toHaveValue('English and Spanish')

  await page.getByRole('link', { name: 'Back' }).click()
  await page.getByRole('link', { name: 'Set languages visibility' }).click()

  await expect(page.getByLabel('Only PREreview')).toBeChecked()

  await page.getByLabel('Everyone').check()

  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Languages English and Spanish Shown on your public profile')
})

test.extend(canLogIn)('can log in from the home page', async ({ javaScriptEnabled, page }) => {
  const logIn = page.getByRole('link', { name: 'Log in' })

  await page.goto('/')

  await expect(logIn).toBeInViewport()

  await logIn.click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'Success' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'Success' })).toBeInViewport()
  }
  await expect(logIn).toBeHidden()
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  await page.reload()

  await expect(page.getByRole('alert', { name: 'Success' })).toBeHidden()
})

test.extend(canLogIn).extend(userIsBlocked)("can't log in when blocked", async ({ javaScriptEnabled, page }) => {
  await page.goto('/')

  await page.getByRole('link', { name: 'Log in' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'Access denied' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'Access denied' })).toBeInViewport()
  }
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible()
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  await page.reload()

  await expect(page.getByRole('alert', { name: 'Access denied' })).toBeHidden()
})

test.extend(canLogIn).extend(areLoggedIn).extend(hasAVerifiedEmailAddress)(
  'cannot remove an email address',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/my-details/change-email-address')
    await page.getByLabel('What is your email address?').clear()
    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByLabel('What is your email address?')).toHaveAttribute('aria-invalid', 'true')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('link', { name: 'Enter your email address' }).click()

    await expect(page.getByLabel('What is your email address?')).toBeFocused()
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn)('have to give a valid email address', async ({ javaScriptEnabled, page }) => {
  await page.goto('/my-details/change-email-address')
  await page.getByLabel('What is your email address?').fill('not an email address')

  await page.getByRole('button', { name: 'Save and continue' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
  }
  await expect(page.getByLabel('What is your email address?')).toHaveAttribute('aria-invalid', 'true')
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  await page.getByRole('link', { name: 'Enter an email address in the correct format, like name@example.com' }).click()

  await expect(page.getByLabel('What is your email address?')).toBeFocused()
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()
})

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if you are open for requests',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/my-details/change-open-for-requests')

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByRole('group', { name: 'Are you happy to take requests for a PREreview?' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('link', { name: 'Select yes if you are happy to take requests for a PREreview' }).click()

    await expect(page.getByLabel('Yes')).toBeFocused()
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say what your career stage is',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/my-details/change-career-stage')

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByRole('group', { name: 'What career stage are you at?' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('link', { name: 'Select which career stage you are at' }).click()

    await expect(page.getByLabel('Early')).toBeFocused()
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()
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
