import { Either } from 'effect'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { BiorxivPreprintId } from '../../../src/Preprints/index.ts'
import { Doi } from '../../../src/types/Doi.ts'
import { EmailAddress } from '../../../src/types/index.ts'
import * as EnterEmailAddressForm from '../../../src/WebApp/RequestAReviewFlow/EnterEmailAddressPage/EnterEmailAddressForm.ts'
import * as _ from '../../../src/WebApp/RequestAReviewFlow/EnterEmailAddressPage/EnterEmailAddressPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.renderEnterEmailAddressPage({
    preprintId,
    form: new EnterEmailAddressForm.EmptyForm(),
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an email address', async ({ showPage }) => {
  const response = _.renderEnterEmailAddressPage({
    preprintId,
    form: new EnterEmailAddressForm.CompletedForm({ emailAddress: EmailAddress.EmailAddress('jcarberry@example.com') }),
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the email address is missing', async ({ showPage }) => {
  const response = _.renderEnterEmailAddressPage({
    preprintId,
    form: new EnterEmailAddressForm.InvalidForm({ emailAddress: Either.left(new EnterEmailAddressForm.Missing()) }),
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the email address is invalid', async ({ showPage }) => {
  const response = _.renderEnterEmailAddressPage({
    preprintId,
    form: new EnterEmailAddressForm.InvalidForm({
      emailAddress: Either.left(new EnterEmailAddressForm.Invalid({ value: 'not an email address' })),
    }),
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const preprintId = new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') })

const locale = DefaultLocale
