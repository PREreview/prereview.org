import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import { Uuid } from 'uuid-ts'
import { declinePage } from '../../src/author-invite-flow/decline-page/decline-page.ts'
import { inviteDeclinedPage } from '../../src/author-invite-flow/decline-page/invite-declined-page.ts'
import { html } from '../../src/html.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { BiorxivPreprintId } from '../../src/Preprints/index.ts'
import { Prereview } from '../../src/Prereviews/index.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { expect, test } from '../base.ts'

test('content looks right before declining', async ({ showPage }) => {
  const response = declinePage({
    locale: DefaultLocale,
    inviteId: Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'),
    review: new Prereview({
      authors: {
        named: [
          { name: 'Jingfang Hao', orcid: OrcidId('0000-0003-4436-3420') },
          { name: 'Pierrick Bru', orcid: OrcidId('0000-0001-5854-0905') },
          { name: 'Alizée Malnoë', orcid: OrcidId('0000-0002-8777-3174') },
          { name: 'Aurélie Crepin', orcid: OrcidId('0000-0002-4754-6823') },
          { name: 'Jack Forsman', orcid: OrcidId('0000-0002-5111-8901') },
          { name: 'Domenica Farci', orcid: OrcidId('0000-0002-3691-2699') },
        ],
        anonymous: 2,
      },
      doi: Doi('10.5072/zenodo.1061864'),
      id: 1061861,
      license: 'CC-BY-4.0',
      live: false,
      preprint: {
        id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
        title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
        language: 'en',
        url: new URL('https://biorxiv.org/lookup/doi/10.1101/2022.01.13.476201'),
      },
      published: Temporal.PlainDate.from('2022-07-05'),
      requested: false,
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
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when declined', async ({ showPage }) => {
  const response = inviteDeclinedPage(DefaultLocale, Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0'))

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
