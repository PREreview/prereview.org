import * as _ from '../../../src/WebApp/ReviewADatasetFlow/CheckInvitationsToAppearPage/CheckInvitationsToAppearPage.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { EmailAddress } from '../../../src/types/EmailAddress.ts'
import { NonEmptyString } from '../../../src/types/NonEmptyString.ts'
import { Uuid } from '../../../src/types/Uuid.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.CheckInvitationsToAppearPage({
    datasetReviewId,
    authors: [{ name: NonEmptyString('Josiah Carberry'), emailAddress: EmailAddress('jcarberry@example.com') }],
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right with multiple authors', async ({ showPage }) => {
  const response = _.CheckInvitationsToAppearPage({
    datasetReviewId,
    authors: [
      { name: NonEmptyString('Josiah Carberry'), emailAddress: EmailAddress('jcarberry@example.com') },
      { name: NonEmptyString('Jean-Baptiste Botul'), emailAddress: EmailAddress('jbbotul@example.com') },
      { name: NonEmptyString('Arne Saknussemm'), emailAddress: EmailAddress('asaknussemm@example.com') },
      { name: NonEmptyString('Otto Lidenbrock'), emailAddress: EmailAddress('olidenbrock@example.com') },
    ],
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')

const locale = DefaultLocale
