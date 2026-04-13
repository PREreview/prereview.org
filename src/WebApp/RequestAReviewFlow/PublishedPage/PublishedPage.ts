import { pipe } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import type { PreprintId } from '../../../Preprints/index.ts'
import * as Routes from '../../../routes.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'

const listOfRequestsLink = (text: string) => `<a href="${Routes.ReviewRequests.href({ page: 1 })}">${text}</a>`
const communitySlackLink = (text: string) => `<a href="https://bit.ly/PREreview-Slack">${text}</a>`

export const PublishedPage = (locale: SupportedLocale, preprint: PreprintId) => {
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
    canonical: Routes.RequestAReviewPublished.href({ preprintId: preprint }),
  })
}
