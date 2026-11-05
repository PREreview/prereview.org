import { DefaultLocale } from '../../../src/locales/index.ts'
import * as AvatarForm from '../../../src/WebApp/MyDetails/AvatarPage/AvatarForm.ts'
import { AvatarPage } from '../../../src/WebApp/MyDetails/AvatarPage/AvatarPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = AvatarPage({ form: new AvatarForm.EmptyForm(), locale: DefaultLocale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when missing', async ({ showPage }) => {
  const response = AvatarPage({
    form: new AvatarForm.InvalidForm({ avatar: new AvatarForm.Missing() }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when wrong type', async ({ showPage }) => {
  const response = AvatarPage({
    form: new AvatarForm.InvalidForm({ avatar: new AvatarForm.WrongType() }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when too big', async ({ showPage }) => {
  const response = AvatarPage({
    form: new AvatarForm.InvalidForm({ avatar: new AvatarForm.TooBig() }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
