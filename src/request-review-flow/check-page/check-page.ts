import { format } from 'fp-ts-routing'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import { html, plainText } from '../../html'
import { StreamlinePageResponse } from '../../response'
import type { IncompleteReviewRequest, ReviewRequestPreprintId } from '../../review-request'
import { preprintReviewsMatch, profileMatch, requestReviewCheckMatch } from '../../routes'
import { isPseudonym } from '../../types/pseudonym'
import type { User } from '../../user'

export function checkPage({
  preprint,
  reviewRequest,
  user,
}: {
  preprint: ReviewRequestPreprintId
  reviewRequest: Required<IncompleteReviewRequest>
  user: User
}) {
  return StreamlinePageResponse({
    title: plainText`Check your request`,
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: preprint })}" class="back">Back to preprint</a>
    `,
    main: html`
      <single-use-form>
        <form method="post" action="${format(requestReviewCheckMatch.formatter, { id: preprint })}" novalidate>
          <h1>Check your request</h1>

          <div class="summary-card">
            <div>
              <h2>Your details</h2>
            </div>

            <dl class="summary-list">
              <div>
                <dt>Published name</dt>
                <dd>
                  ${displayAuthor(
                    match(reviewRequest.persona)
                      .with('public', () => user)
                      .with('pseudonym', () => ({ name: user.pseudonym }))
                      .exhaustive(),
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <h2>Now publish your request</h2>

          <p>We’ll share your request with the PREreview community.</p>

          <button>Request PREreview</button>
        </form>
      </single-use-form>
    `,
    canonical: format(requestReviewCheckMatch.formatter, { id: preprint }),
    skipToLabel: 'form',
    js: ['single-use-form.js'],
  })
}

function displayAuthor({ name, orcid }: { name: string; orcid?: Orcid }) {
  if (orcid) {
    return html`<a href="${format(profileMatch.formatter, { profile: { type: 'orcid', value: orcid } })}" class="orcid"
      >${name}</a
    >`
  }

  if (isPseudonym(name)) {
    return html`<a href="${format(profileMatch.formatter, { profile: { type: 'pseudonym', value: name } })}"
      >${name}</a
    >`
  }

  return name
}
