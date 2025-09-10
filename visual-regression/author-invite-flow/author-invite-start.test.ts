import * as TE from 'fp-ts/lib/TaskEither.js'
import { Orcid } from 'orcid-id-ts'
import { Uuid } from 'uuid-ts'
import { authorInviteStart } from '../../src/author-invite-flow/index.js'
import { html } from '../../src/html.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { EmailAddress } from '../../src/types/EmailAddress.js'
import { NonEmptyString } from '../../src/types/NonEmptyString.js'
import { Pseudonym } from '../../src/types/Pseudonym.js'
import { expect, test } from '../base.js'

test('content looks right when already started', async ({ showPage }) => {
  const response = await authorInviteStart({
    id: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'),
    locale: DefaultLocale,
    user: {
      name: NonEmptyString('Josiah Carberry'),
      orcid: Orcid('0000-0002-1825-0097'),
      pseudonym: Pseudonym('Orange Panda'),
    },
  })({
    getAuthorInvite: () =>
      TE.right({
        status: 'assigned',
        emailAddress: EmailAddress('jcarberry@example.com'),
        orcid: Orcid('0000-0002-1825-0097'),
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
