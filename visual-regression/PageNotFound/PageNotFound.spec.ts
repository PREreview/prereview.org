import { createPageNotFound } from '../../src/PageNotFound/PageNotFound.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(createPageNotFound())

  await expect(content).toHaveScreenshot()
})
