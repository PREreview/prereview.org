import { expect, test } from './base.ts'

test('when the page has been temporarily removed', async ({ page }) => {
  await page.goto('/prereviewers', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’ve removed this page for now')
})

test('when the page has been permanently removed', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’ve taken this page down')
})
