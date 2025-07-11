import { DefaultLocale } from '../../src/locales/index.js'
import { createFormPage } from '../../src/my-details-page/change-languages-visibility-form-page.js'
import { NonEmptyString } from '../../src/types/NonEmptyString.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage({
    languages: { value: NonEmptyString('Ut lobortis turpis et dolor tincidunt suscipit.'), visibility: 'public' },
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
