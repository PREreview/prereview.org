import { Option } from 'effect'
import { createFormPage } from '../../src/my-details-page/change-languages-form-page.js'
import type { NonEmptyString } from '../../src/types/string.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage(
    Option.some({
      value: 'Nulla porttitor eros dapibus quam convallis ultricies' as NonEmptyString,
      visibility: 'public',
    }),
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = createFormPage(Option.none())

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
