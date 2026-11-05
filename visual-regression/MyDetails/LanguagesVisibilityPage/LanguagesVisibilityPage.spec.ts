import { DefaultLocale } from '../../../src/locales/index.ts'
import { NonEmptyString } from '../../../src/types/NonEmptyString.ts'
import { LanguagesVisibilityPage } from '../../../src/WebApp/MyDetails/LanguagesVisibilityPage/LanguagesVisibilityPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = LanguagesVisibilityPage({
    languages: { value: NonEmptyString('Ut lobortis turpis et dolor tincidunt suscipit.'), visibility: 'public' },
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
