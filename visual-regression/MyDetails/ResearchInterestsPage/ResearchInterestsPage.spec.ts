import { Option } from 'effect'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { NonEmptyString } from '../../../src/types/NonEmptyString.ts'
import { ResearchInterestsPage } from '../../../src/WebApp/MyDetails/ResearchInterestsPage/ResearchInterestsPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = ResearchInterestsPage(
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
  const response = ResearchInterestsPage(Option.none(), DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
