import type * as DatasetReviews from '../../../DatasetReviews/index.ts'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'

export const ReviewPublishedPage = ({
  datasetReview,
  locale,
}: {
  datasetReview: DatasetReviews.PublishedReviewDetails
  locale: SupportedLocale
}) => {
  const t = translate(locale, 'review-a-dataset-flow')

  return StreamlinePageResponse({
    title: plainText(t('prereviewPublished')()),
    main: html`
      <div class="panel">
        <h1>${t('prereviewPublished')()}</h1>

        <div>
          ${t('yourDoi')()}
          <div><strong class="doi" translate="no">${datasetReview.doi}</strong></div>
        </div>
      </div>

      <h2>${t('whatHappensNext')()}</h2>

      <p>
        ${rawHtml(
          t('inviteOthers')({
            emailAddress: html`<a href="mailto:help@prereview.org" target="_blank" rel="noopener noreferrer"
              >help@prereview.org<span class="visually-hidden"> ${t('opensNewTabSuffix')()}</span></a
            >`.toString(),
          }),
        )}
      </p>

      ${datasetReview.persona === 'public'
        ? html`
            <h2>${t('shareYourReview')()}</h2>

            <p>${t('shareYourReviewText')()}</p>
          `
        : ''}

      <h2>${t('letUsKnowHowItWent')()}</h2>

      <p>
        ${rawHtml(
          t('scheduleInterview')({
            link: text =>
              html`<a
                href="https://calendar.google.com/calendar/u/0/selfsched?sstoken=UUw4R0F6MVo1ZWhyfGRlZmF1bHR8ZGM2YTU1OTNhYzNhY2RiN2YzNTBlYTdmZTBmMzNmNDA"
                target="_blank"
                rel="noopener noreferrer"
                >${text}<span class="visually-hidden"> ${t('opensNewTabSuffix')()}</span></a
              >`.toString(),
          }),
        )}
      </p>

      <p>
        ${rawHtml(
          t('feedbackForm')({
            link: text =>
              html`<a
                href="https://docs.google.com/forms/d/e/1FAIpQLSfynZ25_toGP6pnTrEyKE-Fv-7z7pK2h9AlNksKI9_DVJMnng/viewform"
                target="_blank"
                rel="noopener noreferrer"
                >${text}<span class="visually-hidden"> ${t('opensNewTabSuffix')()}</span></a
              >`.toString(),
          }),
        )}
      </p>

      <a href="${Routes.DatasetReview.href({ datasetReviewId: datasetReview.id })}" class="button"
        >${t('seeYourReview')()}</a
      >
    `,
    canonical: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId: datasetReview.id }),
  })
}
