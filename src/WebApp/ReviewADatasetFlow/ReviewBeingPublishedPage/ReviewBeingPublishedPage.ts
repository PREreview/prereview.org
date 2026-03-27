import { html, plainText } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'

export const ReviewBeingPublishedPage = ({
  datasetReviewId,
  locale,
}: {
  datasetReviewId: Uuid.Uuid
  locale: SupportedLocale
}) => {
  const t = translate(locale, 'review-a-dataset-flow')

  return StreamlinePageResponse({
    title: plainText(t('publishingPrereview')()),
    main: html`
      <h1>${t('publishingPrereview')()}</h1>

      <poll-redirect>
        <div>
          <p>$t('publishPrereviewText')()</p>

          <a href="${Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId })}" class="button"
            >${t('forms', 'reloadButton')()}</a
          >
        </div>

        <div hidden class="loading">
          <p>${t('publishPrereviewText')()}</p>
        </div>

        <div hidden>
          <a href="${Routes.ReviewADatasetReviewPublished.href({ datasetReviewId })}" class="button"
            >${t('forms', 'continueButton')()}</a
          >
        </div>
      </poll-redirect>
    `,
    canonical: Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId }),
    js: ['poll-redirect.js'],
  })
}
