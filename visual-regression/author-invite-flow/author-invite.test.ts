import { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import * as TE from 'fp-ts/TaskEither'
import type { Orcid } from 'orcid-id-ts'
import type { Uuid } from 'uuid-ts'
import { authorInvite } from '../../src/author-invite-flow'
import { html } from '../../src/html'
import type { Pseudonym } from '../../src/types/pseudonym'
import { expect, test } from '../base'

import PlainDate = Temporal.PlainDate

test('content looks right', async ({ showPage }) => {
  const response = await authorInvite({ id: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid })({
    getAuthorInvite: () => TE.right({ status: 'open', review: 1234 }),
    getPrereview: () =>
      TE.right({
        authors: [
          { name: 'Jingfang Hao', orcid: '0000-0003-4436-3420' as Orcid },
          { name: 'Pierrick Bru', orcid: '0000-0001-5854-0905' as Orcid },
          { name: 'Alizée Malnoë', orcid: '0000-0002-8777-3174' as Orcid },
          { name: 'Aurélie Crepin', orcid: '0000-0002-4754-6823' as Orcid },
          { name: 'Jack Forsman', orcid: '0000-0002-5111-8901' as Orcid },
          { name: 'Domenica Farci', orcid: '0000-0002-3691-2699' as Orcid },
        ],
        doi: '10.5072/zenodo.1061864' as Doi,
        license: 'CC-BY-4.0',
        preprint: {
          id: {
            type: 'biorxiv',
            value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
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
    id: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid,
    user: {
      name: 'Josiah Carberry',
      orcid: '0000-0002-1825-0097' as Orcid,
      pseudonym: 'Orange Panda' as Pseudonym,
    },
  })({
    getAuthorInvite: () => TE.right({ status: 'open', review: 1234 }),
    getPrereview: () =>
      TE.right({
        authors: [
          { name: 'Jingfang Hao', orcid: '0000-0003-4436-3420' as Orcid },
          { name: 'Pierrick Bru', orcid: '0000-0001-5854-0905' as Orcid },
          { name: 'Alizée Malnoë', orcid: '0000-0002-8777-3174' as Orcid },
          { name: 'Aurélie Crepin', orcid: '0000-0002-4754-6823' as Orcid },
          { name: 'Jack Forsman', orcid: '0000-0002-5111-8901' as Orcid },
          { name: 'Domenica Farci', orcid: '0000-0002-3691-2699' as Orcid },
        ],
        doi: '10.5072/zenodo.1061864' as Doi,
        license: 'CC-BY-4.0',
        preprint: {
          id: {
            type: 'biorxiv',
            value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
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
