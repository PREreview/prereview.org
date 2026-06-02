import * as Personas from '../../../src/Personas/index.ts'
import * as _ from '../../../src/WebApp/AuthorInviteFlow/ConfirmAuthorChoicesPage/ConfirmAuthorChoicesPage.ts'
import { NonEmptyString } from '../../../src/types/NonEmptyString.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { Pseudonym } from '../../../src/types/Pseudonym.ts'
import { Uuid } from '../../../src/types/Uuid.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.renderConfirmAuthorChoicesPage({
    reviewId,
    persona: publicPersona,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when using a pseudonym', async ({ showPage }) => {
  const response = _.renderConfirmAuthorChoicesPage({
    reviewId,
    persona: pseudonymPersona,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const reviewId = Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0')

const publicPersona = new Personas.PublicPersona({
  orcidId: OrcidId('0000-0002-1825-0097'),
  name: NonEmptyString('Josiah Carberry'),
})

const pseudonymPersona = new Personas.PseudonymPersona({
  pseudonym: Pseudonym('Orange Panda'),
})
