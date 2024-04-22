import { Status } from 'hyper-ts'
import { areLoggedIn, canLogIn, canRequestReviews, expect, test } from './base'

test.extend(canLogIn).extend(areLoggedIn).extend(canRequestReviews)(
  'can request a PREreview',
  async ({ fetch, page }) => {
    await page.goto('/request-a-prereview')
    await page.getByLabel('Which preprint would you like reviewed?').fill('10.1101/12345678')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.goto('/preprints/doi-10.1101-12345678')

    await page.getByRole('link', { name: 'Request a PREreview' }).click()

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
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-12345678/request-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.waitForLoadState()
    await page.goto('/preprints/doi-10.1101-12345678')
    await page.getByRole('link', { name: 'Request a PREreview' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Request a PREreview')
    await expect(page.getByRole('main')).toContainText('carry on')

    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your request')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canRequestReviews)(
  'can go back through the form',
  async ({ page }) => {
    await page.goto('/preprints/doi-10.1101-12345678/request-a-prereview')
    await page.getByRole('button', { name: 'Start now' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your request')

    await page.goBack()

    await expect(page.getByRole('button', { name: 'Start now' })).toBeVisible()
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canRequestReviews)('requires a valid preprint', async ({ page }) => {
  await page.goto('/request-a-prereview')
  await page.getByLabel('Which preprint would you like reviewed?').fill('not-a-preprint')
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByLabel('Which preprint would you like reviewed?')).toHaveAttribute('aria-invalid', 'true')

  await page.getByRole('link', { name: 'Enter the preprint DOI or URL' }).click()

  await expect(page.getByLabel('Which preprint would you like reviewed?')).toBeFocused()
})

test.extend(canLogIn).extend(areLoggedIn).extend(canRequestReviews)(
  'when the DOI is not supported',
  async ({ page }) => {
    await page.goto('/request-a-prereview')
    await page.getByLabel('Which preprint would you like reviewed?').fill('10.5555/12345678')
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we don’t support this DOI')
  },
)

test.extend(canLogIn).extend(areLoggedIn).extend(canRequestReviews)(
  'when the URL is not supported',
  async ({ page }) => {
    await page.goto('/request-a-prereview')
    await page
      .getByLabel('Which preprint would you like reviewed?')
      .fill('https://chemrxiv.org/engage/chemrxiv/article-details/6424647b91074bccd07d1aa5')
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we don’t support this URL')
  },
)
