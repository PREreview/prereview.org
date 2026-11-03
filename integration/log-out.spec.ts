import { areLoggedIn, canLogIn, expect, test } from './base.ts'

test.extend(canLogIn).extend(areLoggedIn)('can log out', async ({ javaScriptEnabled, page }) => {
  const menu = page.getByRole(javaScriptEnabled ? 'button' : 'link', { name: 'Menu' })
  const logOut = page.getByRole('link', { name: 'Log out' })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await menu.click()

  await expect(logOut).toBeInViewport()

  await logOut.click()

  if (javaScriptEnabled) {
    await expect(page.getByRole('alert', { name: 'Success' })).toBeFocused()
  } else {
    await expect(page.getByRole('alert', { name: 'Success' })).toBeInViewport()
  }
  await menu.click()
  await expect(logOut).toBeHidden()

  await page.reload()

  await expect(page.getByRole('alert', { name: 'Success' })).toBeHidden()
})
