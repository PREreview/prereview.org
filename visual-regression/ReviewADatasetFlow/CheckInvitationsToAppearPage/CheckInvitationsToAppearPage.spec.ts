import * as _ from '../../../src/WebApp/ReviewADatasetFlow/CheckInvitationsToAppearPage/CheckInvitationsToAppearPage.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { EmailAddress } from '../../../src/types/EmailAddress.ts'
import { NonEmptyString } from '../../../src/types/NonEmptyString.ts'
import { Uuid } from '../../../src/types/Uuid.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.CheckInvitationsToAppearPage({
    datasetReviewId,
    authors: [
      {
        name: NonEmptyString('Josiah Carberry'),
        emailAddress: EmailAddress('jcarberry@example.com'),
        invitationId: Uuid('6aea82c4-99b7-4818-b5f6-9a4998ea9350'),
      },
    ],
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right with multiple authors', async ({ showPage }) => {
  const response = _.CheckInvitationsToAppearPage({
    datasetReviewId,
    authors: [
      {
        name: NonEmptyString('Josiah Carberry'),
        emailAddress: EmailAddress('jcarberry@example.com'),
        invitationId: Uuid('6aea82c4-99b7-4818-b5f6-9a4998ea9350'),
      },
      {
        name: NonEmptyString('Jean-Baptiste Botul'),
        emailAddress: EmailAddress('jbbotul@example.com'),
        invitationId: Uuid('4182e25e-2c1b-402b-b1d5-b5d5df506fcf'),
      },
      {
        name: NonEmptyString('Arne Saknussemm'),
        emailAddress: EmailAddress('asaknussemm@example.com'),
        invitationId: Uuid('688735b1-4ef3-45f5-9c99-98bafbe848fc'),
      },
      {
        name: NonEmptyString('Otto Lidenbrock'),
        emailAddress: EmailAddress('olidenbrock@example.com'),
        invitationId: Uuid('cf3362b2-8885-48df-9540-4bbd09778949'),
      },
    ],
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')

const locale = DefaultLocale
