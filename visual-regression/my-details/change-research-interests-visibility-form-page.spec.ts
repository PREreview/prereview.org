import { DefaultLocale } from '../../src/locales/index.ts'
import { createFormPage } from '../../src/my-details-page/change-research-interests-visibility-form-page.ts'
import { NonEmptyString } from '../../src/types/NonEmptyString.ts'
import { expect, test } from '../base.ts'

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
