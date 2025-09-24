import { Option } from 'effect'
import { DefaultLocale } from '../../src/locales/index.ts'
import { createFormPage } from '../../src/my-details-page/change-research-interests-form-page.ts'
import { NonEmptyString } from '../../src/types/NonEmptyString.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage(
    Option.some({
      value: NonEmptyString(
        'Ut faucibus congue leo, quis rhoncus nulla venenatis vel. In iaculis commodo sodales. Mauris ut convallis nisl. Sed sit amet ex quis mi placerat elementum.',
      ),
      visibility: 'public',
    }),
    DefaultLocale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = createFormPage(Option.none(), DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
