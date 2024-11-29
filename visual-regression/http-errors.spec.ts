import { noPermissionPage } from '../src/http-error.js'
import { expect, test } from './base.js'

test('no-permission page content looks right', async ({ showPage }) => {
  const content = await showPage(noPermissionPage)

  await expect(content).toHaveScreenshot()
})
