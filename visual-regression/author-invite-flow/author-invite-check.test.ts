import * as Personas from '../../src/Personas/index.ts'
import { checkPage } from '../../src/WebApp/author-invite-flow/check-page/check-page.ts'
import { failureMessage } from '../../src/WebApp/author-invite-flow/check-page/failure-message.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { NonEmptyString } from '../../src/types/NonEmptyString.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Pseudonym } from '../../src/types/Pseudonym.ts'
import { Uuid } from '../../src/types/Uuid.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = checkPage({
    inviteId: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'),
    persona: new Personas.PublicPersona({
      name: NonEmptyString('Josiah Carberry'),
      orcidId: OrcidId('0000-0002-1825-0097'),
    }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when using a pseudonym', async ({ showPage }) => {
  const response = checkPage({
    inviteId: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'),
    persona: new Personas.PseudonymPersona({
      pseudonym: Pseudonym('Orange Panda'),
    }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test("content looks right when the change can't be made", async ({ showPage }) => {
  const content = await showPage(failureMessage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
