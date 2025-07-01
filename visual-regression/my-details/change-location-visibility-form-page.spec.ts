import { DefaultLocale } from '../../src/locales/index.js'
import { createFormPage } from '../../src/my-details-page/change-location-visibility-form-page.js'
import { NonEmptyString } from '../../src/types/NonEmptyString.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage({
    locale: DefaultLocale,
    location: {
      value: NonEmptyString('Nulla porttitor eros dapibus quam convallis ultricies'),
      visibility: 'public',
    },
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
