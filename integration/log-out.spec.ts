import { areLoggedIn, canLogIn, expect, test } from './base'

test.extend(canLogIn).extend(areLoggedIn)('can log out', async ({ javaScriptEnabled, page }, testInfo) => {
  const logOut = page.getByRole('link', { name: 'Log out' })

  await page.goto('/')

  await expect(logOut).toBeInViewport()

  await logOut.click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'Success' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'Success' })).toBeInViewport()
  }
  await expect(logOut).toBeHidden()
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot()

  await page.reload()

  testInfo.fail(!javaScriptEnabled)

  await expect(page.getByRole('alert', { name: 'Success' })).toBeHidden()
})
