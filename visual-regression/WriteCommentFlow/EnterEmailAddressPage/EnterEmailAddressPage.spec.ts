import { Either } from 'effect'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { EmailAddress, Uuid } from '../../../src/types/index.ts'
import * as EnterEmailAddressForm from '../../../src/WebApp/WriteCommentFlow/EnterEmailAddressPage/EnterEmailAddressForm.ts'
import * as _ from '../../../src/WebApp/WriteCommentFlow/EnterEmailAddressPage/EnterEmailAddressPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.EnterEmailAddressPage({
    commentId: Uuid.Uuid('7ad2f67d-dc01-48c5-b6ac-3490d494f67d'),
    form: new EnterEmailAddressForm.EmptyForm(),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an email address', async ({ showPage }) => {
  const response = _.EnterEmailAddressPage({
    commentId: Uuid.Uuid('7ad2f67d-dc01-48c5-b6ac-3490d494f67d'),
    form: new EnterEmailAddressForm.CompletedForm({
      emailAddress: EmailAddress.EmailAddress('jcarberry@example.com'),
    }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the email address is missing', async ({ showPage }) => {
  const response = _.EnterEmailAddressPage({
    commentId: Uuid.Uuid('7ad2f67d-dc01-48c5-b6ac-3490d494f67d'),
    form: new EnterEmailAddressForm.InvalidForm({ emailAddress: Either.left(new EnterEmailAddressForm.Missing()) }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the email address is invalid', async ({ showPage }) => {
  const response = _.EnterEmailAddressPage({
    commentId: Uuid.Uuid('7ad2f67d-dc01-48c5-b6ac-3490d494f67d'),
    form: new EnterEmailAddressForm.InvalidForm({
      emailAddress: Either.left(new EnterEmailAddressForm.Invalid({ value: 'not an email address' })),
    }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
