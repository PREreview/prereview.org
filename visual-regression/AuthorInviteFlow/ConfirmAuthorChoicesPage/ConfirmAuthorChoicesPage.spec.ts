import * as Prereviewers from '../../../src/Prereviewers/index.ts'
import * as _ from '../../../src/WebApp/AuthorInviteFlow/ConfirmAuthorChoicesPage/ConfirmAuthorChoicesPage.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { Name } from '../../../src/types/Name.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { Pseudonym } from '../../../src/types/Pseudonym.ts'
import { Uuid } from '../../../src/types/Uuid.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.renderConfirmAuthorChoicesPage({
    reviewId,
    persona: publicPersona,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when using a pseudonym', async ({ showPage }) => {
  const response = _.renderConfirmAuthorChoicesPage({
    reviewId,
    persona: pseudonymPersona,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const reviewId = Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0')

const publicPersona = new Prereviewers.PublicPersona({
  orcidId: OrcidId('0000-0002-1825-0097'),
  name: Name('Josiah Carberry'),
})

const pseudonymPersona = new Prereviewers.PseudonymPersona({
  pseudonym: Pseudonym('Orange Panda'),
})

const locale = DefaultLocale
