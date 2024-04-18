import type { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import { html, plainText } from '../../html'
import { StreamlinePageResponse } from '../../response'
import { preprintReviewsMatch, requestReviewMatch, requestReviewStartMatch } from '../../routes'

export const requestReviewPage = StreamlinePageResponse({
  title: plainText`Request a PREreview`,
  nav: html`
    <a
      href="${format(preprintReviewsMatch.formatter, {
        id: { type: 'biorxiv', value: '10.1101/2024.02.07.578830' as Doi<'1101'> },
      })}"
      class="back"
      >Back to preprint</a
    >
  `,
  main: html`
    <h1>Request a PREreview</h1>

    <p>
      You can request a PREreview of
      <cite lang="en" dir="ltr"
        >Cytoplasmic protein-free mRNA induces stress granules by two G3BP1/2-dependent mechanisms</cite
      >. A PREreview is a review of a preprint and can vary from a few sentences to a lengthy report, similar to a
      journal-organized peer-review report.
    </p>

    <a href="${format(requestReviewStartMatch.formatter, {})}" role="button" draggable="false">Start now</a>
  `,
  canonical: format(requestReviewMatch.formatter, {}),
  allowRobots: false,
})
