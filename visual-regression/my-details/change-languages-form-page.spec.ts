import { Option } from 'effect'
import { DefaultLocale } from '../../src/locales/index.js'
import { createFormPage } from '../../src/my-details-page/change-languages-form-page.js'
import { NonEmptyString } from '../../src/types/NonEmptyString.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage(
    Option.some({ value: NonEmptyString('Ut lobortis turpis et dolor tincidunt suscipit.'), visibility: 'public' }),
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
