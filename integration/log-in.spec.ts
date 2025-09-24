import type { MutableRedirectUri } from 'oauth2-mock-server'
import path from 'path'
import * as StatusCodes from '../src/StatusCodes.ts'
import {
  areLoggedIn,
  canLogIn,
  canLogInAsDemoUser,
  expect,
  hasAVerifiedEmailAddress,
  isANewUser,
  isASlackUser,
  test,
  userIsBlocked,
} from './base.ts'

test.extend(canLogIn).extend(areLoggedIn)('can view my details', async ({ javaScriptEnabled, page }) => {
  const menu = page.getByRole('button', { name: 'Menu' }).or(page.getByRole('link', { name: 'Menu' }))

  await menu.click()
  await page.getByRole('link', { name: 'My details' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My details')
  if (javaScriptEnabled) {
    await menu.click()
    await expect(page.getByRole('link', { name: 'My details' })).toHaveAttribute('aria-current', 'page')
  }
})

test.extend(canLogIn).extend(areLoggedIn).extend(isANewUser)(
  'are prompted to view my details once',
  async ({ page }) => {
    const menu = page.getByRole('button', { name: 'Menu' }).or(page.getByRole('link', { name: 'Menu' }))

    await menu.click()

    await expect(page.getByRole('link', { name: 'My details' })).toContainText('New notification')

    await page.getByRole('link', { name: 'My details' }).click()

    await expect(page.getByRole('main')).toContainText('Welcome to PREreview!')

    await menu.click()

    await expect(page.getByRole('link', { name: 'My details' })).not.toContainText('New notification')

    await page.getByRole('link', { name: 'My details' }).click()

    await expect(page.getByRole('main')).not.toContainText('Welcome to PREreview!')

    await page.goto('/', { waitUntil: 'commit' })
    await menu.click()

    await expect(page.getByRole('link', { name: 'My details' })).not.toContainText('New notification')
  },
)

test.extend(canLogIn).extend(areLoggedIn)('can give my email address', async ({ emails, javaScriptEnabled, page }) => {
  const menu = page.getByRole('button', { name: 'Menu' }).or(page.getByRole('link', { name: 'Menu' }))

  await menu.click()
  await page.getByRole('link', { name: 'My details' }).click()
  await page.getByRole('link', { name: 'Enter email address' }).click()
  await page.getByLabel('What is your email address?').fill('jcarberry@example.com')

  await page.getByRole('button', { name: 'Save and continue' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'Important' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'Important' })).toBeInViewport()
  }
  await expect(page.getByRole('main')).toContainText('Email address jcarberry@example.com Unverified')

  await page.reload()

  await expect(page.getByRole('alert', { name: 'Important' })).toBeHidden()

  await page.setContent(String(emails[0]?.html))

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

test.extend(canLogIn).extend(areLoggedIn)('can connect my ORCID record', async ({ fetch, javaScriptEnabled, page }) => {
  const menu = page.getByRole('button', { name: 'Menu' }).or(page.getByRole('link', { name: 'Menu' }))

  await menu.click()
  await page.getByRole('link', { name: 'My details' }).click()
  await page.getByRole('link', { name: 'Connect ORCID record' }).click()
  await page.getByRole('button', { name: 'Start now' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'Success' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'Success' })).toBeInViewport()
  }
  await expect(page.getByRole('main')).toContainText('ORCID record Connected')

  await page.reload()

  await expect(page.getByRole('alert', { name: 'Success' })).toBeHidden()

  fetch.postOnce('http://orcid.test/revoke', { status: StatusCodes.OK })

  await page.getByRole('link', { name: 'Disconnect ORCID record' }).click()
  await page.getByRole('button', { name: 'Disconnect record' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'Success' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'Success' })).toBeInViewport()
  }
  await expect(page.getByRole('link', { name: 'Connect ORCID record' })).toBeVisible()

  await page.reload()

  await expect(page.getByRole('alert', { name: 'Success' })).toBeHidden()
})

test.extend(canLogIn).extend(areLoggedIn)(
  'have to grant access to your ORCID record',
  async ({ oauthServer, page }) => {
    await page.goto('/connect-orcid', { waitUntil: 'commit' })
    oauthServer.service.once('beforeAuthorizeRedirect', ({ url }: MutableRedirectUri) => {
      url.searchParams.delete('code')
      url.searchParams.set('error', 'access_denied')
    })
    await page.getByRole('button', { name: 'Start now' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we can’t connect your record')
  },
)

test.extend(canLogIn).extend(areLoggedIn)('can upload an avatar', async ({ fetch, javaScriptEnabled, page }) => {
  const menu = page.getByRole('button', { name: 'Menu' }).or(page.getByRole('link', { name: 'Menu' }))

  await menu.click()
  await page.getByRole('link', { name: 'My details' }).click()
  await page.getByRole('link', { name: 'Upload avatar' }).click()
  await page.getByLabel('Upload an avatar').setInputFiles(path.join(import.meta.dirname, 'fixtures', '600x400.png'))

  fetch.postOnce('https://api.cloudinary.com/v1_1/prereview/image/upload', { body: { public_id: 'an-avatar' } })
  await page.route('https://res.cloudinary.com/**/*', route =>
    route.fulfill({ path: path.join(import.meta.dirname, 'fixtures', '300x300.png') }),
  )
  await page.getByRole('button', { name: 'Save and continue' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'Success' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'Success' })).toBeInViewport()
  }
  await expect(page.getByRole('main')).toContainText('Avatar')

  await page.reload()

  await expect(page.getByRole('alert', { name: 'Success' })).toBeHidden()

  await page.getByRole('link', { name: 'Change avatar' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Upload an avatar')

  await page.getByRole('link', { name: 'Back' }).click()
  await page.getByRole('link', { name: 'Remove avatar' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Remove your avatar')

  fetch.postOnce('https://api.cloudinary.com/v1_1/prereview/image/destroy', { body: { result: 'ok' } })

  await page.getByRole('button', { name: 'Remove avatar' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'Success' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'Success' })).toBeInViewport()
  }
  await expect(page.getByRole('link', { name: 'Upload avatar' })).toBeVisible()

  await page.reload()

  await expect(page.getByRole('alert', { name: 'Success' })).toBeHidden()
})

test.extend(canLogIn).extend(areLoggedIn).extend(isASlackUser)(
  'can connect my Slack Community account',
  async ({ javaScriptEnabled, page }) => {
    const menu = page.getByRole('button', { name: 'Menu' }).or(page.getByRole('link', { name: 'Menu' }))

    await menu.click()
    await page.getByRole('link', { name: 'My details' }).click()
    await page.getByRole('link', { name: 'Connect Slack account' }).click()
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
  async ({ oauthServer, page }) => {
    await page.goto('/connect-slack', { waitUntil: 'commit' })
    oauthServer.service.once('beforeAuthorizeRedirect', ({ url }: MutableRedirectUri) => {
      url.searchParams.delete('code')
      url.searchParams.set('error', 'access_denied')
    })
    await page.getByRole('button', { name: 'Start now' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we can’t connect your account')
  },
)

test.extend(canLogIn).extend(areLoggedIn)('can set my career stage', async ({ page }) => {
  const menu = page.getByRole('button', { name: 'Menu' }).or(page.getByRole('link', { name: 'Menu' }))

  await menu.click()
  await page.getByRole('link', { name: 'My details' }).click()
  await page.getByRole('link', { name: 'Enter career stage' }).click()
  await page.getByLabel('Early').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Career stage Early Only visible to PREreview')

  await page.getByRole('link', { name: 'Change career stage' }).click()

  await expect(page.getByLabel('Early')).toBeChecked()

  await page.getByRole('link', { name: 'Back' }).click()
  await page.getByRole('link', { name: 'Set career-stage visibility' }).click()

  await expect(page.getByLabel('Only PREreview')).toBeChecked()

  await page.getByLabel('Everyone').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Career stage Early Shown on your public profile')
})

test.extend(canLogIn).extend(areLoggedIn).extend(isASlackUser)("can say if I'm open for requests", async ({ page }) => {
  const menu = page.getByRole('button', { name: 'Menu' }).or(page.getByRole('link', { name: 'Menu' }))

  await menu.click()
  await page.getByRole('link', { name: 'My details' }).click()
  await page.getByRole('link', { name: 'Connect Slack account' }).click()
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByRole('link', { name: 'Enter preference for review requests' }).click()
  await page.getByLabel('Yes').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Open for review requests Yes Only visible to PREreview')

  await page.getByRole('link', { name: 'Set preference-for-review-requests visibility' }).click()

  await expect(page.getByLabel('Only PREreview')).toBeChecked()

  await page.getByLabel('Everyone').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Open for review requests Yes Shown on your public profile')

  await page.getByRole('link', { name: 'Change preference for review requests' }).click()
  await page.getByLabel('No').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Open for review requests No')
})

test.extend(canLogIn).extend(areLoggedIn)('can set my research interests', async ({ page }) => {
  const menu = page.getByRole('button', { name: 'Menu' }).or(page.getByRole('link', { name: 'Menu' }))

  await menu.click()
  await page.getByRole('link', { name: 'My details' }).click()
  await page.getByRole('link', { name: 'Enter research interests' }).click()
  await page
    .getByLabel('What are your research interests?')
    .fill('Nunc vestibulum sapien eu magna elementum consectetur.')
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
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText(
    'Research interests Nunc vestibulum sapien eu magna elementum consectetur. Shown on your public profile',
  )
})

test.extend(canLogIn).extend(areLoggedIn)('can set my location', async ({ page }) => {
  const menu = page.getByRole('button', { name: 'Menu' }).or(page.getByRole('link', { name: 'Menu' }))

  await menu.click()
  await page.getByRole('link', { name: 'My details' }).click()

  await page.getByRole('link', { name: 'Enter location' }).click()
  await page.getByLabel('Where are you based?').fill('Vivamus in convallis urna.')
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Location Vivamus in convallis urna. Only visible to PREreview')

  await page.getByRole('link', { name: 'Change location' }).click()

  await expect(page.getByLabel('Where are you based?')).toHaveValue('Vivamus in convallis urna.')

  await page.getByRole('link', { name: 'Back' }).click()
  await page.getByRole('link', { name: 'Set location visibility' }).click()

  await expect(page.getByLabel('Only PREreview')).toBeChecked()

  await page.getByLabel('Everyone').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Location Vivamus in convallis urna. Shown on your public profile')
})

test.extend(canLogIn).extend(areLoggedIn)('can set my languages', async ({ page }) => {
  const menu = page.getByRole('button', { name: 'Menu' }).or(page.getByRole('link', { name: 'Menu' }))

  await menu.click()
  await page.getByRole('link', { name: 'My details' }).click()

  await page.getByRole('link', { name: 'Enter languages' }).click()
  await page.getByLabel('What languages can you review in?').fill('English and Spanish')
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Languages English and Spanish Only visible to PREreview')

  await page.getByRole('link', { name: 'Change languages' }).click()

  await expect(page.getByLabel('What languages can you review in?')).toHaveValue('English and Spanish')

  await page.getByRole('link', { name: 'Back' }).click()
  await page.getByRole('link', { name: 'Set languages visibility' }).click()

  await expect(page.getByLabel('Only PREreview')).toBeChecked()

  await page.getByLabel('Everyone').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Languages English and Spanish Shown on your public profile')
})

test.extend(canLogIn)('can log in from the home page', async ({ javaScriptEnabled, page }) => {
  const menu = page.getByRole('button', { name: 'Menu' }).or(page.getByRole('link', { name: 'Menu' }))
  const logIn = page.getByRole('link', { name: 'Log in' })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await menu.click()

  await expect(logIn).toBeInViewport()

  await logIn.click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'Success' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'Success' })).toBeInViewport()
  }
  await menu.click()
  await expect(logIn).toBeHidden()

  await page.reload()

  await expect(page.getByRole('alert', { name: 'Success' })).toBeHidden()
})

test.extend(canLogIn).extend(userIsBlocked)("can't log in when blocked", async ({ javaScriptEnabled, page }) => {
  const menu = page.getByRole('button', { name: 'Menu' }).or(page.getByRole('link', { name: 'Menu' }))

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await menu.click()
  await page.getByRole('link', { name: 'Log in' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'Access denied' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'Access denied' })).toBeInViewport()
  }
  await menu.click()
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible()

  await page.reload()

  await expect(page.getByRole('alert', { name: 'Access denied' })).toBeHidden()
})

test.extend(canLogIn).extend(areLoggedIn).extend(hasAVerifiedEmailAddress)(
  'cannot remove an email address',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/my-details/change-email-address', { waitUntil: 'commit' })
    await page.getByLabel('What is your email address?').clear()
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

test.extend(canLogIn).extend(areLoggedIn)('have to give a valid email address', async ({ javaScriptEnabled, page }) => {
  await page.goto('/my-details/change-email-address', { waitUntil: 'commit' })
  await page.getByLabel('What is your email address?').fill('not an email address')

  await page.getByRole('button', { name: 'Save and continue' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
  }
  await expect(page.getByLabel('What is your email address?')).toHaveAttribute('aria-invalid', 'true')

  await page.getByRole('link', { name: 'Enter an email address in the correct format, like name@example.com' }).click()

  await expect(page.getByLabel('What is your email address?')).toBeFocused()
})

test.extend(canLogIn).extend(areLoggedIn)('have to upload an avatar', async ({ javaScriptEnabled, page }) => {
  await page.goto('/my-details/change-avatar', { waitUntil: 'commit' })

  await page.getByRole('button', { name: 'Save and continue' }).click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
  }
  await expect(page.getByLabel('Upload an avatar')).toHaveAttribute('aria-invalid', 'true')

  await page.getByRole('link', { name: 'Select an image' }).click()

  await expect(page.getByLabel('Upload an avatar')).toBeFocused()
})

test.extend(canLogIn).extend(areLoggedIn)(
  'have to upload an avatar of a reasonable size',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/my-details/change-avatar', { waitUntil: 'commit' })
    await page
      .getByLabel('Upload an avatar')
      .setInputFiles({ name: 'some-file', mimeType: 'application/octet-stream', buffer: Buffer.alloc(5_242_880) })

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByLabel('Upload an avatar')).toHaveAttribute('aria-invalid', 'true')

    await page.getByRole('link', { name: 'The selected file must be smaller than 5 MB' }).click()

    await expect(page.getByLabel('Upload an avatar')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to upload an image as an avatar',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/my-details/change-avatar', { waitUntil: 'commit' })
    await page.getByLabel('Upload an avatar').setInputFiles(import.meta.filename)

    await page.getByRole('button', { name: 'Save and continue' }).click()

    if (javaScriptEnabled) {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeFocused()
    } else {
      await expect(page.getByRole('alert', { name: 'There is a problem' })).toBeInViewport()
    }
    await expect(page.getByLabel('Upload an avatar')).toHaveAttribute('aria-invalid', 'true')

    await page.getByRole('link', { name: 'The selected file must be a AVIF, HEIC, JPG, PNG or WebP' }).click()

    await expect(page.getByLabel('Upload an avatar')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say if you are open for requests',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/my-details/change-open-for-requests', { waitUntil: 'commit' })

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

    await page.getByRole('link', { name: 'Select yes if you are happy to take requests for a PREreview' }).click()

    await expect(page.getByLabel('Yes')).toBeFocused()
  },
)

test.extend(canLogIn).extend(areLoggedIn)(
  'have to say what your career stage is',
  async ({ javaScriptEnabled, page }) => {
    await page.goto('/my-details/change-career-stage', { waitUntil: 'commit' })

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

    await page.getByRole('link', { name: 'Select which career stage you are at' }).click()

    await expect(page.getByLabel('Early')).toBeFocused()
  },
)

test.extend(canLogInAsDemoUser)('can log in as a demo user', async ({ javaScriptEnabled, page }) => {
  const menu = page.getByRole('button', { name: 'Menu' }).or(page.getByRole('link', { name: 'Menu' }))
  const logIn = page.getByRole('link', { name: 'Log in as a demo user' })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await menu.click()
  await logIn.click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'Success' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'Success' })).toBeInViewport()
  }
  await expect(page.getByRole('alert', { name: 'Success' })).toContainText('demo user')

  await menu.click()
  await expect(logIn).toBeHidden()

  await page.reload()

  await expect(page.getByRole('alert', { name: 'Success' })).toBeHidden()

  await menu.click()
  await page.getByRole('link', { name: 'My details' }).click()

  await expect(page.getByRole('main')).toContainText('Name Josiah Carberry')
  await expect(page.getByRole('main')).toContainText('ORCID iD 0000-0002-1825-0097')
  await expect(page.getByRole('main')).toContainText('PREreview pseudonym Orange Panda')
})
