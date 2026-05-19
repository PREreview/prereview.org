import { expect, showSpotlight, test } from './base.ts'

test.extend(showSpotlight)('can dismiss the spotlight banner', async ({ javaScriptEnabled, page }, testInfo) => {
  await page.goto('/', { waitUntil: 'commit' })

  await expect(page.getByRole('main')).toContainText('Matchmaking experiment')

  testInfo.fail(!javaScriptEnabled)
  await expect(page.getByRole('button', { name: 'Dismiss' })).toBeVisible()

  await page.getByRole('button', { name: 'Dismiss' }).click()

  await expect(page.getByRole('main')).not.toContainText('Matchmaking experiment')

  await page.reload()

  await expect(page.getByRole('main')).not.toContainText('Matchmaking experiment')
})
