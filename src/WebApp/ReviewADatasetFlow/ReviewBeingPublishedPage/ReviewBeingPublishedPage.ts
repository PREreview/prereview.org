import { html, plainText } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/index.ts'
import { PartialHtmlResponse, StreamlinePageResponse } from '../../Response/index.ts'

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

      <poll-partial interval="1000">
        <div>
          <p>${t('publishPrereviewText')()}</p>

          <a
            href="${Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId })}"
            class="button"
            data-poll-partial-hide-when-polling="true"
            >${t('forms', 'reloadButton')()}</a
          >
        </div>
      </poll-partial>
    `,
    canonical: Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId }),
    js: ['poll-partial.js'],
  })
}

export const ReviewBeingPublishedPartial = ({ locale }: { locale: SupportedLocale }) => {
  const t = translate(locale, 'review-a-dataset-flow')

  return PartialHtmlResponse({
    html: html`
      <poll-partial interval="1000">
        <div class="loading">
          <p>${t('publishPrereviewText')()}</p>
        </div>
      </poll-partial>
    `,
  })
}

export const ReviewPublishedPartial = ({
  datasetReviewId,
  locale,
}: {
  datasetReviewId: Uuid.Uuid
  locale: SupportedLocale
}) =>
  PartialHtmlResponse({
    html: html`
      <div>
        <a href="${Routes.ReviewADatasetReviewPublished.href({ datasetReviewId })}" class="button"
          >${translate(locale, 'forms', 'continueButton')()}</a
        >
      </div>
    `,
  })
