import type { MutableRedirectUri } from 'oauth2-mock-server'
import { areLoggedIn, canConnectSlack, canLogIn, expect, isASlackUser, test } from './base'

test.extend(canLogIn).extend(areLoggedIn)('can view my details', async ({ javaScriptEnabled, page }) => {
  await page.getByRole('link', { name: 'My details' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My details')
  await expect(page.getByRole('link', { name: 'My details' })).toHaveAttribute('aria-current', 'page')
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
})

test.extend(canLogIn).extend(areLoggedIn).extend(canConnectSlack).extend(isASlackUser)(
  'can connect my Slack Community account',
  async ({ page }) => {
    await page.getByRole('link', { name: 'My details' }).click()
    await page.getByRole('link', { name: 'Connect Slack account' }).click()

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Start now' }).click()

    await expect(page.getByRole('main')).toContainText('Slack Community name jcarberry')
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canConnectSlack)(
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

  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  await page.getByRole('link', { name: 'Enter career stage' }).click()
  await page.getByLabel('Early').check()

  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Career stage Early Only visible to PREreview')

  await page.getByRole('link', { name: 'Change career stage' }).click()

  await expect(page.getByLabel('Early')).toBeChecked()

  await page.getByRole('link', { name: 'Back' }).click()

  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  await page.getByRole('link', { name: 'Set career-stage visibility' }).click()

  await expect(page.getByLabel('Only PREreview')).toBeChecked()

  await page.getByLabel('Everyone').check()

  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page.getByRole('main')).toContainText('Career stage Early Shown on your public profile')
})

test.extend(canLogIn).extend(areLoggedIn).extend(canConnectSlack).extend(isASlackUser)(
  "can say if I'm open for requests",
  async ({ page }) => {
    await page.getByRole('link', { name: 'My details' }).click()
    await page.getByRole('link', { name: 'Connect Slack account' }).click()
    await page.getByRole('button', { name: 'Start now' }).click()

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('link', { name: 'Enter open for review requests' }).click()
    await page.getByLabel('Yes').check()

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page.getByRole('main')).toContainText('Open for review requests Yes Only visible to PREreview')

    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot()

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
  },
)

test.extend(canLogIn).extend(areLoggedIn)('can set my research interests', async ({ page }) => {
  await page.getByRole('link', { name: 'My details' }).click()

  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

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

  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

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

test.extend(canLogIn).extend(areLoggedIn)('can skip to the form', async ({ javaScriptEnabled, page }) => {
  await page.goto('/my-details/change-career-stage')
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()

  await page.getByLabel('Mid').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await page.goto('/my-details/change-career-stage-visibility')
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()

  await page.goto('/my-details/change-research-interests')
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()

  await page
    .getByLabel('What are your research interests?')
    .fill('Nunc vestibulum sapien eu magna elementum consectetur.')
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await page.goto('/my-details/change-research-interests-visibility')
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()

  await page.goto('/my-details/change-open-for-requests')
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()

  await page.getByLabel('Yes').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await page.goto('/my-details/change-open-for-requests-visibility')
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to form' })).toBeFocused()
  await expect(page).toHaveScreenshot()

  await page.keyboard.press('Enter')

  if (javaScriptEnabled) {
    await expect(page.getByRole('main')).toBeFocused()
  }
  await expect(page).toHaveScreenshot()
})

test.extend(canLogIn)('can log in from the home page', async ({ javaScriptEnabled, page }, testInfo) => {
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

  testInfo.fail(!javaScriptEnabled)

  await expect(page.getByRole('alert', { name: 'Success' })).toBeHidden()
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
