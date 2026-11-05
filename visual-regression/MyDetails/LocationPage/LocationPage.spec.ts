import { Option } from 'effect'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { NonEmptyString } from '../../../src/types/NonEmptyString.ts'
import { LocationPage } from '../../../src/WebApp/MyDetails/LocationPage/LocationPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = LocationPage(
    Option.some({
      value: NonEmptyString('Nulla porttitor eros dapibus quam convallis ultricies'),
      visibility: 'public',
    }),
    DefaultLocale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = LocationPage(Option.none(), DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
