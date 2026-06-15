import type * as DatasetReviews from '../../../DatasetReviews/index.ts'
import { html, plainText } from '../../../html.ts'
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
          ${t('yourDoi')()} <br />
          <strong class="doi" dir="auto" translate="no">${datasetReview.doi}</strong>
        </div>
      </div>

      <h2>${t('whatHappensNext')()}</h2>

      ${typeof datasetReview.otherAuthors === 'boolean'
        ? datasetReview.otherAuthors
          ? html` <p>We’ve sent emails to the other authors, inviting them to appear.</p> `
          : ''
        : html`
            <p>
              ${t('inviteOthers')({
                emailAddress: html`<a href="mailto:help@prereview.org" target="_blank" rel="noopener noreferrer"
                  ><bdi translate="no">help@prereview.org</bdi
                  ><span class="visually-hidden"> ${t('opensNewTabSuffix')()}</span></a
                >`,
              })}
            </p>
          `}
      ${datasetReview.persona === 'public'
        ? html`
            <h2>${t('shareYourReview')()}</h2>

            <p>${t('shareYourReviewText')()}</p>
          `
        : ''}

      <h2>${t('letUsKnowHowItWent')()}</h2>

      <p>
        ${t('scheduleInterview')({
          link: text =>
            html`<a
              href="https://calendar.google.com/calendar/u/0/selfsched?sstoken=UUw4R0F6MVo1ZWhyfGRlZmF1bHR8ZGM2YTU1OTNhYzNhY2RiN2YzNTBlYTdmZTBmMzNmNDA"
              target="_blank"
              rel="noopener noreferrer"
              >${text}<span class="visually-hidden"> ${t('opensNewTabSuffix')()}</span></a
            >`,
        })}
      </p>

      <p>
        ${t('feedbackForm')({
          link: text =>
            html`<a
              href="https://docs.google.com/forms/d/e/1FAIpQLSfynZ25_toGP6pnTrEyKE-Fv-7z7pK2h9AlNksKI9_DVJMnng/viewform"
              target="_blank"
              rel="noopener noreferrer"
              >${text}<span class="visually-hidden"> ${t('opensNewTabSuffix')()}</span></a
            >`,
        })}
      </p>

      <a href="${Routes.DatasetReview.href({ datasetReviewId: datasetReview.id })}" class="button"
        >${t('seeYourReview')()}</a
      >
    `,
    canonical: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId: datasetReview.id }),
  })
}
