import { Doi } from 'doi-ts'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Orcid } from 'orcid-id-ts'
import { Uuid } from 'uuid-ts'
import { authorInvitePublished } from '../../src/author-invite-flow/index.js'
import { html } from '../../src/html.js'
import { DefaultLocale } from '../../src/locales/index.js'
import type { Pseudonym } from '../../src/types/Pseudonym.js'
import { expect, test } from '../base.js'

const locale = DefaultLocale

test('content looks right', async ({ showPage }) => {
  const response = await authorInvitePublished({
    id: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'),
    user: {
      name: 'Josiah Carberry',
      orcid: Orcid('0000-0002-1825-0097'),
      pseudonym: 'Orange Panda' as Pseudonym,
    },
    locale,
  })({
    getAuthorInvite: () => TE.right({ status: 'completed', orcid: Orcid('0000-0002-1825-0097'), review: 1234 }),
    getPrereview: () =>
      TE.right({
        doi: Doi('10.5072/zenodo.1061864'),
        preprint: {
          title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
          language: 'en',
        },
      }),
  })()

  if (response._tag !== 'StreamlinePageResponse') {
    throw new Error('incorrect page response')
  }

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
