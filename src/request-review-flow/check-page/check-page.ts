import { format } from 'fp-ts-routing'
import type { Orcid } from 'orcid-id-ts'
import { html, plainText } from '../../html'
import { StreamlinePageResponse } from '../../response'
import { profileMatch, requestReviewCheckMatch } from '../../routes'
import type { User } from '../../user'

export function checkPage({ user }: { user: User }) {
  return StreamlinePageResponse({
    title: plainText`Check your request`,
    main: html`
      <single-use-form>
        <form method="post" action="${format(requestReviewCheckMatch.formatter, {})}" novalidate>
          <h1>Check your request</h1>

          <div class="summary-card">
            <div>
              <h2>Your details</h2>
            </div>

            <dl class="summary-list">
              <div>
                <dt>Published name</dt>
                <dd>${displayAuthor(user)}</dd>
              </div>
            </dl>
          </div>

          <h2>Now publish your request</h2>

          <p>We’ll share your request with the PREreview community.</p>

          <button>Request PREreview</button>
        </form>
      </single-use-form>
    `,
    canonical: format(requestReviewCheckMatch.formatter, {}),
    skipToLabel: 'form',
    js: ['single-use-form.js'],
  })
}

function displayAuthor({ name, orcid }: { name: string; orcid: Orcid }) {
  return html`<a href="${format(profileMatch.formatter, { profile: { type: 'orcid', value: orcid } })}" class="orcid"
    >${name}</a
  >`
}
