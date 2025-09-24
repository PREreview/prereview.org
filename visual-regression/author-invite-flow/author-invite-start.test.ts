import * as TE from 'fp-ts/lib/TaskEither.js'
import { Uuid } from 'uuid-ts'
import { authorInviteStart } from '../../src/author-invite-flow/index.ts'
import { html } from '../../src/html.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { NonEmptyString } from '../../src/types/NonEmptyString.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Pseudonym } from '../../src/types/Pseudonym.ts'
import { expect, test } from '../base.ts'

test('content looks right when already started', async ({ showPage }) => {
  const response = await authorInviteStart({
    id: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'),
    locale: DefaultLocale,
    user: {
      name: NonEmptyString('Josiah Carberry'),
      orcid: OrcidId('0000-0002-1825-0097'),
      pseudonym: Pseudonym('Orange Panda'),
    },
  })({
    getAuthorInvite: () =>
      TE.right({
        status: 'assigned',
        emailAddress: EmailAddress('jcarberry@example.com'),
        orcid: OrcidId('0000-0002-1825-0097'),
        review: 1234,
      }),
    getPrereview: () =>
      TE.right({
        preprint: {
          title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
          language: 'en',
        },
      }),
    saveAuthorInvite: () => TE.left('unavailable'),
  })()

  if (response._tag !== 'PageResponse') {
    throw new Error('incorrect page response')
  }

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
