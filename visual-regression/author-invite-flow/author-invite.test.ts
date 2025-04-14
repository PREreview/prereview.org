import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Orcid } from 'orcid-id-ts'
import { Uuid } from 'uuid-ts'
import { authorInvite } from '../../src/author-invite-flow/index.js'
import { html } from '../../src/html.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { EmailAddress } from '../../src/types/email-address.js'
import type { Pseudonym } from '../../src/types/pseudonym.js'
import { expect, test } from '../base.js'

import PlainDate = Temporal.PlainDate

test('content looks right', async ({ showPage }) => {
  const response = await authorInvite({ id: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'), locale: DefaultLocale })({
    getAuthorInvite: () =>
      TE.right({ status: 'open', emailAddress: EmailAddress('jcarberry@example.com'), review: 1234 }),
    getPrereview: () =>
      TE.right({
        authors: {
          named: [
            { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
            { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
            { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
            { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
            { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
            { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
          ],
          anonymous: 2,
        },
        doi: Doi('10.5072/zenodo.1061864'),
        license: 'CC-BY-4.0',
        preprint: {
          id: {
            type: 'biorxiv',
            value: Doi('10.1101/2022.01.13.476201'),
          },
          title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
          language: 'en',
        },
        published: PlainDate.from('2022-07-05'),
        structured: false,
        text: html`<p>
          The manuscript “The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>” by Liu
          et al. aims to elucidate how LHCBM1 is involved in non-photochemical quenching (NPQ) in
          <i>Chlamydomonas reinhardtii</i>. The Chlamydomonas mutant lacking LHCBM1 (<i>npq5</i>) displays a low NPQ
          phenotype. The authors found that the antenna size and LHCSR3 accumulation are not responsible for the lower
          NPQ phenotype in <i>npq5</i>. They also artificially acidified the lumenal pH to protonate LHCSR3 for NPQ
          induction and found that <i>npq5 </i>NPQ is still low. They propose that absence of LHCBM1 could alter the
          association of LHCSR3 with the PSII supercomplex or that LHCBM1 interacts with LHCSR3 which would enhance its
          quenching capacity. This work enriches the knowledge about the impact of lack of LHCBM1 on antenna size, PSII
          function, LHCSR1 and 3 proteins accumulation and NPQ capacity during a 48-h high light treatment.
        </p>`,
      }),
  })()

  if (response._tag !== 'StreamlinePageResponse') {
    throw new Error('incorrect page response')
  }

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when logged in', async ({ showPage }) => {
  const response = await authorInvite({
    id: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'),
    locale: DefaultLocale,
    user: {
      name: 'Josiah Carberry',
      orcid: Orcid('0000-0002-1825-0097'),
      pseudonym: 'Orange Panda' as Pseudonym,
    },
  })({
    getAuthorInvite: () =>
      TE.right({ status: 'open', emailAddress: EmailAddress('jcarberry@example.com'), review: 1234 }),
    getPrereview: () =>
      TE.right({
        authors: {
          named: [
            { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
            { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
            { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
            { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
            { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
            { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
          ],
          anonymous: 0,
        },
        doi: Doi('10.5072/zenodo.1061864'),
        license: 'CC-BY-4.0',
        preprint: {
          id: {
            type: 'biorxiv',
            value: Doi('10.1101/2022.01.13.476201'),
          },
          title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
          language: 'en',
        },
        published: PlainDate.from('2022-07-05'),
        structured: false,
        text: html`<p>
          The manuscript “The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>” by Liu
          et al. aims to elucidate how LHCBM1 is involved in non-photochemical quenching (NPQ) in
          <i>Chlamydomonas reinhardtii</i>. The Chlamydomonas mutant lacking LHCBM1 (<i>npq5</i>) displays a low NPQ
          phenotype. The authors found that the antenna size and LHCSR3 accumulation are not responsible for the lower
          NPQ phenotype in <i>npq5</i>. They also artificially acidified the lumenal pH to protonate LHCSR3 for NPQ
          induction and found that <i>npq5 </i>NPQ is still low. They propose that absence of LHCBM1 could alter the
          association of LHCSR3 with the PSII supercomplex or that LHCBM1 interacts with LHCSR3 which would enhance its
          quenching capacity. This work enriches the knowledge about the impact of lack of LHCBM1 on antenna size, PSII
          function, LHCSR1 and 3 proteins accumulation and NPQ capacity during a 48-h high light treatment.
        </p>`,
      }),
  })()

  if (response._tag !== 'StreamlinePageResponse') {
    throw new Error('incorrect page response')
  }

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
