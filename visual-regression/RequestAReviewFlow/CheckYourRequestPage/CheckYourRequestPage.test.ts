import { Doi } from 'doi-ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import * as Personas from '../../../src/Personas/index.ts'
import { BiorxivPreprintId } from '../../../src/Preprints/index.ts'
import { Uuid } from '../../../src/types/index.ts'
import { NonEmptyString } from '../../../src/types/NonEmptyString.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { Pseudonym } from '../../../src/types/Pseudonym.ts'
import * as _ from '../../../src/WebApp/RequestAReviewFlow/CheckYourRequestPage/CheckYourRequestPage.ts'
import { expect, test } from '../../base.ts'

const preprint = new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') })

const locale = DefaultLocale

test('content looks right', async ({ showPage }) => {
  const response = _.CheckYourRequestPage({
    preprint,
    reviewRequest: {
      persona: new Personas.PublicPersona({
        name: NonEmptyString('Josiah Carberry'),
        orcidId: OrcidId('0000-0002-1825-0097'),
      }),
      reviewRequestId: Uuid.Uuid('1e4959fa-b753-4b00-aece-3851ad7b1488'),
    },
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right with a pseudonym', async ({ showPage }) => {
  const response = _.CheckYourRequestPage({
    preprint,
    reviewRequest: {
      persona: new Personas.PseudonymPersona({ pseudonym: Pseudonym('Orange Panda') }),
      reviewRequestId: Uuid.Uuid('1e4959fa-b753-4b00-aece-3851ad7b1488'),
    },
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
