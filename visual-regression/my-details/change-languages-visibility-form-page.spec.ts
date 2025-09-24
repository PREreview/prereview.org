import { DefaultLocale } from '../../src/locales/index.ts'
import { createFormPage } from '../../src/my-details-page/change-languages-visibility-form-page.ts'
import { NonEmptyString } from '../../src/types/NonEmptyString.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage({
    languages: { value: NonEmptyString('Ut lobortis turpis et dolor tincidunt suscipit.'), visibility: 'public' },
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
