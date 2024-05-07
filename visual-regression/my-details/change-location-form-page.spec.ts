import * as O from 'fp-ts/Option'
import { createFormPage } from '../../src/my-details-page/change-languages-form-page'
import type { NonEmptyString } from '../../src/types/string'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage(
    O.some({ value: 'Nulla porttitor eros dapibus quam convallis ultricies' as NonEmptyString, visibility: 'public' }),
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = createFormPage(O.none)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
