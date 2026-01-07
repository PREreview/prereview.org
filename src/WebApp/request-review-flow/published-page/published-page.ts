import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import { StreamlinePageResponse } from '../../../Response/index.ts'
import type { ReviewRequestPreprintId } from '../../../review-request.ts'
import { requestReviewPublishedMatch, reviewRequestsMatch } from '../../../routes.ts'

const listOfRequestsLink = (text: string) => `<a href="${format(reviewRequestsMatch.formatter, {})}">${text}</a>`
const communitySlackLink = (text: string) => `<a href="https://bit.ly/PREreview-Slack">${text}</a>`

export const publishedPage = (locale: SupportedLocale, preprint: ReviewRequestPreprintId) => {
  const t = translate(locale, 'request-review-flow')

  return StreamlinePageResponse({
    title: pipe(t('requestPublished')(), plainText),
    main: html`
      <div class="panel">
        <h1>${t('requestPublished')()}</h1>
      </div>

      <h2>${t('whatHappensNext')()}</h2>

      <p>
        ${rawHtml(
          t('whereYouCanSeeYourRequest')({
            listOfRequestsLink,
            communitySlackLink,
          }),
        )}
      </p>
    `,
    canonical: format(requestReviewPublishedMatch.formatter, { id: preprint }),
  })
}
