import { partners } from '../src/partners.js'
import { expect, test } from './base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(partners)

  await expect(content).toHaveScreenshot()
})
