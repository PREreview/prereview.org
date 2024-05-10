import { partners } from '../src/partners'
import { expect, test } from './base'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(partners)

  await expect(content).toHaveScreenshot()
})
