import { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import type { Orcid } from 'orcid-id-ts'
import { html } from '../../src/html'
import type { Preprint } from '../../src/preprint'
import type { Pseudonym } from '../../src/types/pseudonym'
import type { User } from '../../src/user'
import { startPage } from '../../src/write-review/write-a-prereview-page/write-a-prereview-page'
import { expect, test } from '../base'

import PlainDate = Temporal.PlainDate

test('content looks right', async ({ showPage }) => {
  const response = startPage(preprint)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when logged in', async ({ showPage }) => {
  const response = startPage(preprint, user)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const preprint = {
  authors: [
    { name: 'Xin Liu' },
    { name: 'Wojciech Nawrocki', orcid: '0000-0001-5124-3000' as Orcid },
    { name: 'Roberta Croce', orcid: '0000-0003-3469-834X' as Orcid },
  ],
  id: { type: 'biorxiv', value: '10.1101/2022.01.13.476201' as Doi<'1101'> },
  posted: PlainDate.from('2022-01-14'),
  abstract: {
    text: html`<p>
      Non-photochemical quenching (NPQ) is the process that protects photosynthetic organisms from photodamage by
      dissipating the energy absorbed in excess as heat. In the model green alga <i>Chlamydomonas reinhardtii</i>, NPQ
      was abolished in the knock-out mutants of the pigment-protein complexes LHCSR3 and LHCBM1. However, while LHCSR3
      was shown to be a pH sensor and switching to a quenched conformation at low pH, the role of LHCBM1 in NPQ has not
      been elucidated yet. In this work, we combine biochemical and physiological measurements to study short-term high
      light acclimation of <i>npq5</i>, the mutant lacking LHCBM1. We show that while in low light in the absence of
      this complex, the antenna size of PSII is smaller than in its presence, this effect is marginal in high light,
      implying that a reduction of the antenna is not responsible for the low NPQ. We also show that the mutant
      expresses LHCSR3 at the WT level in high light, indicating that the absence of this complex is also not the
      reason. Finally, NPQ remains low in the mutant even when the pH is artificially lowered to values that can switch
      LHCSR3 to the quenched conformation. It is concluded that both LHCSR3 and LHCBM1 need to be present for the
      induction of NPQ and that LHCBM1 is the interacting partner of LHCSR3. This interaction can either enhance the
      quenching capacity of LHCSR3 or connect this complex with the PSII supercomplex.
    </p>`,
    language: 'en',
  },
  title: {
    text: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
    language: 'en',
  },
  url: new URL('https://biorxiv.org/lookup/doi/10.1101/2022.01.13.476201'),
} satisfies Preprint

const user = {
  name: 'Josiah Carberry',
  orcid: '0000-0002-1825-0097' as Orcid,
  pseudonym: 'Orange Panda' as Pseudonym,
} satisfies User
