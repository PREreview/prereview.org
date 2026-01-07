import { DefaultLocale } from '../../../src/locales/index.ts'
import { EmailAddress, Uuid } from '../../../src/types/index.ts'
import * as _ from '../../../src/WebApp/WriteCommentFlow/NeedToVerifyEmailAddressPage/NeedToVerifyEmailAddressPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.NeedToVerifyEmailAddressPage({
    commentId: Uuid.Uuid('7ad2f67d-dc01-48c5-b6ac-3490d494f67d'),
    emailAddress: EmailAddress.EmailAddress('jcarberry@example.com'),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
