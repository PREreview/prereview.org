import { DefaultLocale } from '../../src/locales/index.js'
import { createFormPage } from '../../src/my-details-page/change-research-interests-visibility-form-page.js'
import { NonEmptyString } from '../../src/types/NonEmptyString.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage({
    locale: DefaultLocale,
    researchInterests: {
      value: NonEmptyString(
        'Ut faucibus congue leo, quis rhoncus nulla venenatis vel. In iaculis commodo sodales. Mauris ut convallis nisl. Sed sit amet ex quis mi placerat elementum.',
      ),
      visibility: 'public',
    },
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
