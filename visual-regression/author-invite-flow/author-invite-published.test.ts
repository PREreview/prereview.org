import { Doi } from 'doi-ts'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Uuid } from 'uuid-ts'
import { authorInvitePublished } from '../../src/author-invite-flow/index.ts'
import { html } from '../../src/html.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { NonEmptyString } from '../../src/types/NonEmptyString.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Pseudonym } from '../../src/types/Pseudonym.ts'
import { expect, test } from '../base.ts'

const locale = DefaultLocale

test('content looks right', async ({ showPage }) => {
  const response = await authorInvitePublished({
    id: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'),
    user: {
      name: NonEmptyString('Josiah Carberry'),
      orcid: OrcidId('0000-0002-1825-0097'),
      pseudonym: Pseudonym('Orange Panda'),
    },
    locale,
  })({
    getAuthorInvite: () => TE.right({ status: 'completed', orcid: OrcidId('0000-0002-1825-0097'), review: 1234 }),
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
