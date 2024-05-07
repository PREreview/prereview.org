import { createFormPage } from '../../src/my-details-page/change-languages-visibility-form-page'
import type { NonEmptyString } from '../../src/types/string'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage({
    languages: { value: 'Ut lobortis turpis et dolor tincidunt suscipit.' as NonEmptyString, visibility: 'public' },
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
