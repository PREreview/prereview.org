import { createHavingProblemsPage } from '../../src/HavingProblemsPage/HavingProblemsPage.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(createHavingProblemsPage())

  await expect(content).toHaveScreenshot()
})
