import { format } from 'fp-ts-routing'
import { html, plainText } from '../../html'
import { StreamlinePageResponse } from '../../response'
import { requestReviewMatch, requestReviewStartMatch } from '../../routes'

export const requestReviewPage = StreamlinePageResponse({
  title: plainText`Request a PREreview`,
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
