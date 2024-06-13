import { areLoggedIn, canLogIn, expect, test } from './base.js'

test.extend(canLogIn).extend(areLoggedIn)('can log out', async ({ javaScriptEnabled, page }) => {
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

  await page.reload()

  await expect(page.getByRole('alert', { name: 'Success' })).toBeHidden()
})
