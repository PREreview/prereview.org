import { Option } from 'effect'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { NonEmptyString } from '../../../src/types/NonEmptyString.ts'
import { LanguagesPage } from '../../../src/WebApp/MyDetails/LanguagesPage/LanguagesPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = LanguagesPage(
    Option.some({ value: NonEmptyString('Ut lobortis turpis et dolor tincidunt suscipit.'), visibility: 'public' }),
    DefaultLocale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = LanguagesPage(Option.none(), DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
