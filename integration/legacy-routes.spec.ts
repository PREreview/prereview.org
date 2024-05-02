import { expect, test } from './base'

test('when the page has been temporarily removed', async ({ page }) => {
  await page.goto('/prereviewers')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’ve removed this page for now')
})

test('when the page has been permanently removed', async ({ page }) => {
  await page.goto('/dashboard')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’ve taken this page down')
})
