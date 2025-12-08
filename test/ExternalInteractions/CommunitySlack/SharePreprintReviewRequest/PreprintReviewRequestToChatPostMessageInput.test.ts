import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Effect } from 'effect'
import type { Slack } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalInteractions/CommunitySlack/SharePreprintReviewRequest/PreprintReviewRequestToChatPostMessageInput.ts'
import { html, rawHtml } from '../../../../src/html.ts'
import * as Preprints from '../../../../src/Preprints/index.ts'
import { PublicUrl } from '../../../../src/public-url.ts'
import { Doi, NonEmptyString, OrcidId, Temporal } from '../../../../src/types/index.ts'
import * as EffectTest from '../../../EffectTest.ts'

test.each([
  [
    'with abstract',
    {
      author: NonEmptyString.NonEmptyString('Josiah Carberry'),
      preprint: Preprints.Preprint({
        authors: [
          { name: 'Xin Liu' },
          { name: 'Wojciech Nawrocki', orcid: OrcidId.OrcidId('0000-0001-5124-3000') },
          { name: 'Roberta Croce', orcid: OrcidId.OrcidId('0000-0003-3469-834X') },
        ],
        id: new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/2022.01.13.476201') }),
        posted: Temporal.PlainDate.from('2022-01-14'),
        abstract: {
          text: html`<p>
            Non-photochemical quenching (NPQ) is the process that protects photosynthetic organisms from photodamage by
            dissipating the energy absorbed in excess as heat. In the model green alga <i>Chlamydomonas reinhardtii</i>,
            NPQ was abolished in the knock-out mutants of the pigment-protein complexes LHCSR3 and LHCBM1. However,
            while LHCSR3 was shown to be a pH sensor and switching to a quenched conformation at low pH, the role of
            LHCBM1 in NPQ has not been elucidated yet. In this work, we combine biochemical and physiological
            measurements to study short-term high light acclimation of <i>npq5</i>, the mutant lacking LHCBM1. We show
            that while in low light in the absence of this complex, the antenna size of PSII is smaller than in its
            presence, this effect is marginal in high light, implying that a reduction of the antenna is not responsible
            for the low NPQ. We also show that the mutant expresses LHCSR3 at the WT level in high light, indicating
            that the absence of this complex is also not the reason. Finally, NPQ remains low in the mutant even when
            the pH is artificially lowered to values that can switch LHCSR3 to the quenched conformation. It is
            concluded that both LHCSR3 and LHCBM1 need to be present for the induction of NPQ and that LHCBM1 is the
            interacting partner of LHCSR3. This interaction can either enhance the quenching capacity of LHCSR3 or
            connect this complex with the PSII supercomplex.
          </p>`,
          language: 'en',
        },
        title: {
          text: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
          language: 'en',
        },
        url: new URL('https://biorxiv.org/lookup/doi/10.1101/2022.01.13.476201'),
      }),
    } satisfies _.PreprintReviewRequest,
    [
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'Josiah Carberry', style: { bold: true } },
              { type: 'text', text: ' has requested a PREreview: ' },
              {
                type: 'link',
                url: new URL('http://example.com/preprints/doi-10.1101-2022.01.13.476201/write-a-prereview'),
              },
            ],
          },
        ],
      },
    ] satisfies Slack.ChatPostMessageInput['blocks'],
  ],
  [
    'without abstract',
    {
      author: NonEmptyString.NonEmptyString('Jean-Baptiste Botul'),
      preprint: Preprints.Preprint({
        authors: [{ name: 'Rowan Cockett', orcid: OrcidId.OrcidId('0000-0002-7859-8394') }],
        id: new Preprints.CurvenotePreprintId({ value: Doi.Doi('10.62329/fmdw8234') }),
        posted: Temporal.PlainDate.from({ year: 2024, month: 5, day: 11 }),
        title: {
          language: 'en',
          text: rawHtml('Embracing Reuse in Scientific Communication'),
        },
        url: new URL('https://doi.curvenote.com/10.62329/FMDW8234'),
      }),
    },
    [
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'Jean-Baptiste Botul', style: { bold: true } },
              { type: 'text', text: ' has requested a PREreview: ' },
              { type: 'link', url: new URL('http://example.com/preprints/doi-10.62329-fmdw8234/write-a-prereview') },
            ],
          },
        ],
      },
    ],
  ],
])('PreprintReviewRequestToChatPostMessageInput (%s)', (_name, datasetReview, expectedBlocks) =>
  Effect.gen(function* () {
    const actual = yield* _.PreprintReviewRequestToChatPostMessageInput(datasetReview)

    expect(actual).toStrictEqual({ blocks: expectedBlocks, unfurlLinks: true, unfurlMedia: false })
  }).pipe(Effect.provideService(PublicUrl, new URL('http://example.com')), EffectTest.run),
)
