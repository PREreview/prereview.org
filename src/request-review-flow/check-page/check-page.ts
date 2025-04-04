import { format } from 'fp-ts-routing'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import { html, plainText } from '../../html.js'
import type { SupportedLocale } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import type { IncompleteReviewRequest, ReviewRequestPreprintId } from '../../review-request.js'
import { profileMatch, requestReviewCheckMatch, requestReviewPersonaMatch } from '../../routes.js'
import { ProfileId } from '../../types/index.js'
import { isPseudonym } from '../../types/pseudonym.js'
import type { User } from '../../user.js'

export function checkPage({
  preprint,
  reviewRequest,
  user,
}: {
  preprint: ReviewRequestPreprintId
  reviewRequest: Required<IncompleteReviewRequest>
  user: User
  locale: SupportedLocale
}) {
  return StreamlinePageResponse({
    title: plainText`Check your request`,
    nav: html`<a href="${format(requestReviewPersonaMatch.formatter, { id: preprint })}" class="back"
      ><span>Back</span></a
    >`,
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
                <dt><span>Published name</span></dt>
                <dd>
                  ${displayAuthor(
                    match(reviewRequest.persona)
                      .with('public', () => user)
                      .with('pseudonym', () => ({ name: user.pseudonym }))
                      .exhaustive(),
                  )}
                </dd>
                <dd>
                  <a href="${format(requestReviewPersonaMatch.formatter, { id: preprint })}"
                    >Change <span class="visually-hidden">name</span></a
                  >
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
    return html`<a href="${format(profileMatch.formatter, { profile: ProfileId.forOrcid(orcid) })}" class="orcid"
      >${name}</a
    >`
  }

  if (isPseudonym(name)) {
    return html`<a href="${format(profileMatch.formatter, { profile: ProfileId.forPseudonym(name) })}">${name}</a>`
  }

  return name
}
