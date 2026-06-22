import { Either } from 'effect'
import * as RemoveInvitationToAppearForm from '../../../src/WebApp/ReviewADatasetFlow/RemoveInvitationToAppearPage/RemoveInvitationToAppearForm.ts'
import * as _ from '../../../src/WebApp/ReviewADatasetFlow/RemoveInvitationToAppearPage/RemoveInvitationToAppearPage.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { Name } from '../../../src/types/Name.ts'
import { Uuid } from '../../../src/types/Uuid.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.RemoveInvitationToAppearPage({
    authorName,
    datasetReviewId,
    invitationId,
    form: new RemoveInvitationToAppearForm.EmptyForm(),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when completed', async ({ showPage }) => {
  const response = _.RemoveInvitationToAppearPage({
    authorName,
    datasetReviewId,
    invitationId,
    form: new RemoveInvitationToAppearForm.CompletedForm({
      removeAuthor: 'yes',
    }),
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when missing', async ({ showPage }) => {
  const response = _.RemoveInvitationToAppearPage({
    authorName,
    datasetReviewId,
    invitationId,
    form: new RemoveInvitationToAppearForm.InvalidForm({
      removeAuthor: Either.left(new RemoveInvitationToAppearForm.Missing()),
    }),
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const authorName = Name('Josiah Carberry')

const datasetReviewId = Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')

const invitationId = Uuid('34d790ae-5680-4e81-9e8f-ed4aacbe4a5c')

const locale = DefaultLocale
