import { DefaultLocale } from '../../../src/locales/index.ts'
import { NonEmptyString } from '../../../src/types/NonEmptyString.ts'
import { LocationVisibilityPage } from '../../../src/WebApp/MyDetails/LocationVisibilityPage/LocationVisibilityPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = LocationVisibilityPage({
    locale: DefaultLocale,
    location: {
      value: NonEmptyString('Nulla porttitor eros dapibus quam convallis ultricies'),
      visibility: 'public',
    },
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
