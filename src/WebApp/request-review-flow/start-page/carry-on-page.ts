import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { html, plainText } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import type { ReviewRequestPreprintId } from '../../../review-request.ts'
import { preprintReviewsMatch, requestReviewCheckMatch, requestReviewStartMatch } from '../../../routes.ts'
import { PageResponse } from '../../Response/index.ts'

export const carryOnPage = (locale: SupportedLocale, preprint: ReviewRequestPreprintId) => {
  const t = translate(locale, 'request-review-flow')

  return PageResponse({
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
        >${translate(locale, 'forms', 'continueButton')()}</a
      >
    `,
    canonical: format(requestReviewStartMatch.formatter, { id: preprint }),
  })
}
