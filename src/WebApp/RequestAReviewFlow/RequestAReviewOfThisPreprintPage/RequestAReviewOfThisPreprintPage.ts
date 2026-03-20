import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import rtlDetect from 'rtl-detect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import type { PreprintTitle } from '../../../Preprints/index.ts'
import * as Routes from '../../../routes.ts'
import type { User } from '../../../user.ts'
import { PageResponse } from '../../Response/index.ts'

const orcidLinkAsDefinition = (text: string) => `<a href="https://orcid.org/"><dfn>${text}</dfn></a>`

export const RequestAReviewOfThisPreprintPage = ({
  preprint,
  user,
  locale,
}: {
  preprint: PreprintTitle
  locale: SupportedLocale
  user?: User
}) => {
  const t = translate(locale, 'request-review-flow')
  const preprintTitle = `<cite dir="${rtlDetect.getLangDir(preprint.language)}" lang="${preprint.language}">${preprint.title.toString()}</cite>`

  return PageResponse({
    title: pipe(t('requestAPrereview')(), plainText),
    nav: html`
      <a href="${format(Routes.preprintReviewsMatch.formatter, { id: preprint.id })}" class="back"
        ><span>${t('backToPreprint')()}</span></a
      >
    `,
    main: html`
      <h1>${t('requestAPrereview')()}</h1>

      <p>${rawHtml(t('youCanRequestAPrereview')({ preprintTitle }))}</p>

      ${user
        ? ''
        : html`
            <h2>${t('beforeYouStart')()}</h2>

            <p>${t('weWillAskYouToLogInWithYourOrcid')()}</p>

            <details>
              <summary><span>${t('whatIsAnOrcid')()}</span></summary>

              <div>
                <p>${rawHtml(t('orcidExplainer')({ orcidLinkAsDefinition }))}</p>
              </div>
            </details>
          `}

      <a href="${format(Routes.requestReviewStartMatch.formatter, { id: preprint.id })}" role="button" draggable="false"
        >${translate(locale, 'forms', 'startButton')()}</a
      >
    `,
    canonical: Routes.RequestAReviewOfThisPreprint.href({ preprintId: preprint.id }),
    allowRobots: false,
  })
}
