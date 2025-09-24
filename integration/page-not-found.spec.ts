import { expect, test } from './base.ts'

test('when the page does not exist', async ({ page }) => {
  await page.goto('/this-should-not-find-anything', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found')
})
