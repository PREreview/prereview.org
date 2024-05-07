import { createFormPage } from '../../src/my-details-page/change-research-interests-visibility-form-page'
import type { NonEmptyString } from '../../src/types/string'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage({
    researchInterests: {
      value:
        'Ut faucibus congue leo, quis rhoncus nulla venenatis vel. In iaculis commodo sodales. Mauris ut convallis nisl. Sed sit amet ex quis mi placerat elementum.' as NonEmptyString,
      visibility: 'public',
    },
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
