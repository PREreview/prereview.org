import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { html, plainText } from '../../html.js'
import { translate, type SupportedLocale } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import type { ReviewRequestPreprintId } from '../../review-request.js'
import { preprintReviewsMatch, requestReviewCheckMatch, requestReviewStartMatch } from '../../routes.js'

export const carryOnPage = (locale: SupportedLocale, preprint: ReviewRequestPreprintId) => {
  const t = translate(locale, 'request-review-flow')

  return StreamlinePageResponse({
    title: pipe(t('requestAPrereview')(), plainText),
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: preprint })}" class="back"
        ><span>${t('backToPreprint')()}</span></a
      >
    `,
    main: html`
      <h1>${t('requestAPrereview')()}</h1>

      <p>${t('asYouHaveAlreadyStarted')()}</p>

      <a href="${format(requestReviewCheckMatch.formatter, { id: preprint })}" role="button" draggable="false"
        >${t('continueWord')()}</a
      >
    `,
    canonical: format(requestReviewStartMatch.formatter, { id: preprint }),
  })
}
