import { areLoggedIn, canLogIn, canRequestReviews, expect, test } from './base'

test.extend(canLogIn).extend(areLoggedIn).extend(canRequestReviews)('can request a PREreview', async ({ page }) => {
  await page.goto('/preprints/doi-10.1101-2024.02.07.578830/request-a-prereview')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Request a PREreview')

  await page.getByRole('button', { name: 'Start now' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your request')
  await expect(page.getByRole('main')).toContainText('Published name Josiah Carberry')

  await page.getByRole('button', { name: 'Request PREreview' }).click()
})
