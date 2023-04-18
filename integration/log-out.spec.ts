import { areLoggedIn, canLogIn, expect, test } from './base'

test.extend(canLogIn).extend(areLoggedIn)('can log out', async ({ page }) => {
  const logOut = page.getByRole('link', { name: 'Log out' })

  await page.goto('/')

  await expect(logOut).toBeInViewport()

  await logOut.click()

  await expect(page).toHaveURL('/')
  await expect(logOut).toBeHidden()
})
