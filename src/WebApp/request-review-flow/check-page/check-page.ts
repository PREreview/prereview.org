import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { match } from 'ts-pattern'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import type { PreprintId } from '../../../Preprints/index.ts'
import * as Routes from '../../../routes.ts'
import { profileMatch, requestReviewCheckMatch } from '../../../routes.ts'
import { ProfileId, type Uuid } from '../../../types/index.ts'
import type { OrcidId } from '../../../types/OrcidId.ts'
import { isPseudonym } from '../../../types/Pseudonym.ts'
import type { User } from '../../../user.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'

const visuallyHidden = (s: string) => `<span class="visually-hidden">${s}</span>`

export function checkPage({
  preprint,
  reviewRequest,
  user,
  locale,
}: {
  preprint: PreprintId
  reviewRequest: { personaChoice: 'public' | 'pseudonym'; reviewRequestId: Uuid.Uuid }
  user: User
  locale: SupportedLocale
}) {
  const t = translate(locale, 'request-review-flow')
  return StreamlinePageResponse({
    title: pipe(t('checkYourRequest')(), plainText),
    nav: html`<a href="${Routes.RequestAReviewChooseYourPersona.href({ preprintId: preprint })}" class="back"
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
                    match(reviewRequest.personaChoice)
                      .with('public', () => user)
                      .with('pseudonym', () => ({ name: user.pseudonym }))
                      .exhaustive(),
                  )}
                </dd>
                <dd>
                  <a href="${Routes.RequestAReviewChooseYourPersona.href({ preprintId: preprint })}"
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

function displayAuthor({ name, orcid }: { name: string; orcid?: OrcidId }) {
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
