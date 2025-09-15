import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import rtlDetect from 'rtl-detect'
import { html, plainText, rawHtml } from '../../html.js'
import { translate, type SupportedLocale } from '../../locales/index.js'
import type { PreprintTitle } from '../../Preprints/index.js'
import { PageResponse } from '../../response.js'
import { preprintReviewsMatch, requestReviewMatch, requestReviewStartMatch } from '../../routes.js'
import type { User } from '../../user.js'

const orcidLinkAsDefinition = (text: string) => `<a href="https://orcid.org/"><dfn>${text}</dfn></a>`

export const requestReviewPage = ({
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
      <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="back"
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

      <a href="${format(requestReviewStartMatch.formatter, { id: preprint.id })}" role="button" draggable="false"
        >${translate(locale, 'forms', 'startButton')()}</a
      >
    `,
    canonical: format(requestReviewMatch.formatter, { id: preprint.id }),
    allowRobots: false,
  })
}
