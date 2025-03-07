import * as TE from 'fp-ts/lib/TaskEither.js'
import { Orcid } from 'orcid-id-ts'
import { Uuid } from 'uuid-ts'
import { authorInviteStart } from '../../src/author-invite-flow/index.js'
import { html } from '../../src/html.js'
import { EmailAddress } from '../../src/types/email-address.js'
import type { Pseudonym } from '../../src/types/pseudonym.js'
import { expect, test } from '../base.js'

test('content looks right when already started', async ({ showPage }) => {
  const response = await authorInviteStart({
    id: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'),
    user: {
      name: 'Josiah Carberry',
      orcid: Orcid('0000-0002-1825-0097'),
      pseudonym: 'Orange Panda' as Pseudonym,
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

  if (response._tag !== 'StreamlinePageResponse') {
    throw new Error('incorrect page response')
  }

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
