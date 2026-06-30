import { DefaultLocale } from '../../../src/locales/index.ts'
import { BiorxivPreprintId } from '../../../src/Preprints/index.ts'
import { Doi } from '../../../src/types/Doi.ts'
import { EmailAddress } from '../../../src/types/EmailAddress.ts'
import * as _ from '../../../src/WebApp/RequestAReviewFlow/NeedToVerifyEmailAddressPage/NeedToVerifyEmailAddressPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.renderNeedToVerifyEmailAddressPage({
    preprintId,
    emailAddress,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const preprintId = new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') })

const emailAddress = EmailAddress('jcarberry@example.com')

const locale = DefaultLocale
