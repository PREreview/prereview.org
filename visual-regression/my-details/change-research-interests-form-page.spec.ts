import * as O from 'fp-ts/Option'
import { createFormPage } from '../../src/my-details-page/change-research-interests-form-page'
import type { NonEmptyString } from '../../src/types/string'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage(
    O.some({
      value:
        'Ut faucibus congue leo, quis rhoncus nulla venenatis vel. In iaculis commodo sodales. Mauris ut convallis nisl. Sed sit amet ex quis mi placerat elementum.' as NonEmptyString,
      visibility: 'public',
    }),
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = createFormPage(O.none)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
