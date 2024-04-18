import type { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import { html, plainText } from '../../html'
import { StreamlinePageResponse } from '../../response'
import { preprintReviewsMatch, requestReviewCheckMatch, requestReviewStartMatch } from '../../routes'

export const carryOnPage = StreamlinePageResponse({
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

    <p>As you’ve already started, we’ll take you to the next step so you can carry&nbsp;on.</p>

    <a href="${format(requestReviewCheckMatch.formatter, {})}" role="button" draggable="false">Continue</a>
  `,
  canonical: format(requestReviewStartMatch.formatter, {}),
})
