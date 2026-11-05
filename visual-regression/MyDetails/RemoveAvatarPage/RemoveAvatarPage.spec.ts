import { DefaultLocale } from '../../../src/locales/index.ts'
import { RemoveAvatarPage } from '../../../src/WebApp/MyDetails/RemoveAvatarPage/RemoveAvatarPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(RemoveAvatarPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
