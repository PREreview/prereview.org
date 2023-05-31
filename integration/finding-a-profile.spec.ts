import { Status } from 'hyper-ts'
import { expect, test } from './base'

test('can find and view a profile', async ({ fetch, javaScriptEnabled, page }) => {
  fetch.getOnce('https://pub.orcid.org/v3.0/0000-0002-6109-0367/personal-details', Status.OK)

  await page.goto('/profiles/0000-0002-6109-0367')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Daniela Saderi’s PREreviews')
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
