import { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import type { Orcid } from 'orcid-id-ts'
import type { Uuid } from 'uuid-ts'
import { declinePage } from '../../src/author-invite-flow/decline-page/decline-page.js'
import { inviteDeclinedPage } from '../../src/author-invite-flow/decline-page/invite-declined-page.js'
import { html } from '../../src/html.js'
import { expect, test } from '../base.js'

import PlainDate = Temporal.PlainDate

test('content looks right before declining', async ({ showPage }) => {
  const response = declinePage({
    inviteId: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid,
    review: {
      authors: {
        named: [
          { name: 'Jingfang Hao', orcid: '0000-0003-4436-3420' as Orcid },
          { name: 'Pierrick Bru', orcid: '0000-0001-5854-0905' as Orcid },
          { name: 'Alizée Malnoë', orcid: '0000-0002-8777-3174' as Orcid },
          { name: 'Aurélie Crepin', orcid: '0000-0002-4754-6823' as Orcid },
          { name: 'Jack Forsman', orcid: '0000-0002-5111-8901' as Orcid },
          { name: 'Domenica Farci', orcid: '0000-0002-3691-2699' as Orcid },
        ],
        anonymous: 2,
      },
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
        The manuscript “The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>” by Liu et
        al. aims to elucidate how LHCBM1 is involved in non-photochemical quenching (NPQ) in
        <i>Chlamydomonas reinhardtii</i>. The Chlamydomonas mutant lacking LHCBM1 (<i>npq5</i>) displays a low NPQ
        phenotype. The authors found that the antenna size and LHCSR3 accumulation are not responsible for the lower NPQ
        phenotype in <i>npq5</i>. They also artificially acidified the lumenal pH to protonate LHCSR3 for NPQ induction
        and found that <i>npq5 </i>NPQ is still low. They propose that absence of LHCBM1 could alter the association of
        LHCSR3 with the PSII supercomplex or that LHCBM1 interacts with LHCSR3 which would enhance its quenching
        capacity. This work enriches the knowledge about the impact of lack of LHCBM1 on antenna size, PSII function,
        LHCSR1 and 3 proteins accumulation and NPQ capacity during a 48-h high light treatment.
      </p>`,
    },
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when declined', async ({ showPage }) => {
  const response = inviteDeclinedPage('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
