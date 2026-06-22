import { Either } from 'effect'
import * as AddInvitationToAppearForm from '../../../src/WebApp/ReviewADatasetFlow/AddInvitationToAppearPage/AddInvitationToAppearForm.ts'
import * as _ from '../../../src/WebApp/ReviewADatasetFlow/AddInvitationToAppearPage/AddInvitationToAppearPage.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { EmailAddress } from '../../../src/types/EmailAddress.ts'
import { Name } from '../../../src/types/Name.ts'
import { NonEmptyString } from '../../../src/types/NonEmptyString.ts'
import { Uuid } from '../../../src/types/Uuid.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.AddInvitationToAppearPage({
    datasetReviewId,
    form: new AddInvitationToAppearForm.EmptyForm(),
    locale: DefaultLocale,
    otherAuthors: false,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there are other authors', async ({ showPage }) => {
  const response = _.AddInvitationToAppearPage({
    datasetReviewId,
    form: new AddInvitationToAppearForm.EmptyForm(),
    locale: DefaultLocale,
    otherAuthors: true,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when completed', async ({ showPage }) => {
  const response = _.AddInvitationToAppearPage({
    datasetReviewId,
    form: new AddInvitationToAppearForm.CompletedForm({
      name: Name('Josiah Carberry'),
      emailAddress: EmailAddress('jcarberry@example.com'),
    }),
    locale: DefaultLocale,
    otherAuthors: false,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when missing', async ({ showPage }) => {
  const response = _.AddInvitationToAppearPage({
    datasetReviewId,
    form: new AddInvitationToAppearForm.InvalidForm({
      name: Either.left(new AddInvitationToAppearForm.Missing()),
      emailAddress: Either.left(new AddInvitationToAppearForm.Missing()),
    }),
    locale: DefaultLocale,
    otherAuthors: false,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when invalid', async ({ showPage }) => {
  const response = _.AddInvitationToAppearPage({
    datasetReviewId,
    form: new AddInvitationToAppearForm.InvalidForm({
      name: Either.right(Name('Josiah Carberry')),
      emailAddress: Either.left(
        new AddInvitationToAppearForm.Invalid({ actual: NonEmptyString('not an email address') }),
      ),
    }),
    locale: DefaultLocale,
    otherAuthors: false,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
