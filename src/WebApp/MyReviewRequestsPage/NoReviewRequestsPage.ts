import { html, plainText } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import * as Routes from '../../routes.ts'
import { PageResponse } from '../Response/index.ts'

export const NoReviewRequestsPage = ({ locale }: { locale: SupportedLocale }) => {
  const t = translate(locale, 'my-review-requests-page')

  return PageResponse({
    title: plainText(t('myReviewRequests')()),
    main: html`
      <h1>${t('myReviewRequests')()}</h1>

      <div class="inset">
        <p>${t('notPublished')()}</p>

        <p>${t('appearHere')()}</p>
      </div>

      <a href="${Routes.RequestAReview}" class="button">${t('requestAReview')()}</a>
    `,
    canonical: Routes.MyReviewRequests,
    current: 'my-review-requests',
  })
}
