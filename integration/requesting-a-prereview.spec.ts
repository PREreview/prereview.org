import { Status } from 'hyper-ts'
import { areLoggedIn, canLogIn, canRequestReviews, expect, test } from './base'

test.extend(canLogIn).extend(areLoggedIn).extend(canRequestReviews)(
  'can request a PREreview',
  async ({ fetch, page }) => {
    await page.goto('/preprints/doi-10.1101-2024.02.07.578830/request-a-prereview')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Request a PREreview')

    await page.getByRole('button', { name: 'Start now' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your request')
    await expect(page.getByRole('main')).toContainText('Published name Josiah Carberry')

    fetch.postOnce('https://coar-notify-sandbox.prereview.org/inbox', { status: Status.Created })

    await page.getByRole('button', { name: 'Request PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Request published')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canRequestReviews)(
  'are returned to the next step if you have already started requesting a PREreview',
  async ({ page }, testInfo) => {
    await page.goto('/preprints/doi-10.1101-2024.02.07.578830/request-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.waitForLoadState()
    await page.goto('/preprints/doi-10.1101-2024.02.07.578830/request-a-prereview')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Request a PREreview')
    testInfo.fail()
    await expect(page.getByRole('main')).toContainText('carry on')

    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your request')
  },
)
