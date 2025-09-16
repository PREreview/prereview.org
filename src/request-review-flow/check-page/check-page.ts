import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { match } from 'ts-pattern'
import { html, plainText, rawHtml } from '../../html.js'
import { translate, type SupportedLocale } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import type { IncompleteReviewRequest, ReviewRequestPreprintId } from '../../review-request.js'
import { profileMatch, requestReviewCheckMatch, requestReviewPersonaMatch } from '../../routes.js'
import { ProfileId } from '../../types/index.js'
import type { Orcid } from '../../types/Orcid.js'
import { isPseudonym } from '../../types/Pseudonym.js'
import type { User } from '../../user.js'

const visuallyHidden = (s: string) => `<span class="visually-hidden">${s}</span>`

export function checkPage({
  preprint,
  reviewRequest,
  user,
  locale,
}: {
  preprint: ReviewRequestPreprintId
  reviewRequest: Required<IncompleteReviewRequest>
  user: User
  locale: SupportedLocale
}) {
  const t = translate(locale, 'request-review-flow')
  return StreamlinePageResponse({
    title: pipe(t('checkYourRequest')(), plainText),
    nav: html`<a href="${format(requestReviewPersonaMatch.formatter, { id: preprint })}" class="back"
      ><span>${translate(locale, 'forms', 'backLink')()}</span></a
    >`,
    main: html`
      <single-use-form>
        <form method="post" action="${format(requestReviewCheckMatch.formatter, { id: preprint })}" novalidate>
          <h1>${t('checkYourRequest')()}</h1>

          <div class="summary-card">
            <div>
              <h2>${t('yourDetails')()}</h2>
            </div>

            <dl class="summary-list">
              <div>
                <dt><span>${t('publishedName')()}</span></dt>
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
                    >${rawHtml(t('changeName')({ visuallyHidden }))}</a
                  >
                </dd>
              </div>
            </dl>
          </div>

          <h2>${t('nowPublishYourRequest')()}</h2>

          <p>${t('weWillShareYourRequest')()}</p>

          <button>${t('requestPrereview')()}</button>
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
