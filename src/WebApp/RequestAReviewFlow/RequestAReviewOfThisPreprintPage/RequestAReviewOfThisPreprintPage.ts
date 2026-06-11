import { Boolean, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { html, plainText, type Html } from '../../../html.ts'
import { languageAttributesFor } from '../../../Locales.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import type { PreprintTitle } from '../../../Preprints/index.ts'
import * as Routes from '../../../routes.ts'
import { PageResponse } from '../../Response/index.ts'

const orcidLinkAsDefinition = (text: Html) => html`<a href="https://orcid.org/"><dfn>${text}</dfn></a>`

export const RequestAReviewOfThisPreprintPage = ({
  preprint,
  isLoggedIn,
  locale,
}: {
  preprint: PreprintTitle
  locale: SupportedLocale
  isLoggedIn: boolean
}) => {
  const t = translate(locale, 'request-review-flow')
  const preprintTitle = html`<cite ${languageAttributesFor(preprint.language)}>${preprint.title}</cite>`

  return PageResponse({
    title: pipe(t('requestAPrereview')(), plainText),
    nav: html`
      <a href="${format(Routes.preprintReviewsMatch.formatter, { id: preprint.id })}" class="back"
        ><span>${t('backToPreprint')()}</span></a
      >
    `,
    main: html`
      <h1>${t('requestAPrereview')()}</h1>

      <p>${t('youCanRequestAPrereview')({ preprintTitle })}</p>

      ${Boolean.match(isLoggedIn, {
        onTrue: () => '',
        onFalse: () => html`
          <h2>${t('beforeYouStart')()}</h2>

          <p>${t('weWillAskYouToLogInWithYourOrcid')()}</p>

          <details>
            <summary><span>${t('whatIsAnOrcid')()}</span></summary>

            <div>
              <p>${t('orcidExplainer')({ orcidLinkAsDefinition })}</p>
            </div>
          </details>
        `,
      })}

      <a href="${Routes.RequestAReviewStartNow.href({ preprintId: preprint.id })}" role="button" draggable="false"
        >${translate(locale, 'forms', 'startButton')()}</a
      >
    `,
    canonical: Routes.RequestAReviewOfThisPreprint.href({ preprintId: preprint.id }),
    allowRobots: false,
  })
}
