import { DefaultLocale } from '../../../src/locales/index.js'
import { EmailAddress, type Uuid } from '../../../src/types/index.js'
import * as _ from '../../../src/WriteCommentFlow/NeedToVerifyEmailAddressPage/NeedToVerifyEmailAddressPage.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.NeedToVerifyEmailAddressPage({
    commentId: '7ad2f67d-dc01-48c5-b6ac-3490d494f67d' as Uuid.Uuid,
    emailAddress: EmailAddress.EmailAddress('jcarberry@example.com'),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
