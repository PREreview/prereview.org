import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Personas from '../../../Personas/index.ts'
import type { PreprintId } from '../../../Preprints/index.ts'
import * as Routes from '../../../routes.ts'
import { profileMatch } from '../../../routes.ts'
import { ProfileId, type Uuid } from '../../../types/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'

const visuallyHidden = (s: string) => `<span class="visually-hidden">${s}</span>`

export function CheckYourRequestPage({
  preprint,
  reviewRequest,
  locale,
}: {
  preprint: PreprintId
  reviewRequest: { persona: Personas.Persona; reviewRequestId: Uuid.Uuid }
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
        <form method="post" action="${Routes.RequestAReviewCheckYourRequest.href({ preprintId: preprint })}" novalidate>
          <h1>${t('checkYourRequest')()}</h1>

          <div class="summary-card">
            <div>
              <h2>${t('yourDetails')()}</h2>
            </div>

            <dl class="summary-list">
              <div>
                <dt><span>${t('publishedName')()}</span></dt>
                <dd>${displayAuthor(reviewRequest.persona)}</dd>
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
    canonical: Routes.RequestAReviewCheckYourRequest.href({ preprintId: preprint }),
    skipToLabel: 'form',
    js: ['single-use-form.js'],
  })
}

const displayAuthor = Personas.match({
  onPublic: ({ name, orcidId }) =>
    html`<a href="${format(profileMatch.formatter, { profile: ProfileId.forOrcid(orcidId) })}" class="orcid"
      >${name}</a
    >`,
  onPseudonym: ({ pseudonym }) =>
    html`<a href="${format(profileMatch.formatter, { profile: ProfileId.forPseudonym(pseudonym) })}">${pseudonym}</a>`,
})
