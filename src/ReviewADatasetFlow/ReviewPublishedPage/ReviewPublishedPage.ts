import type * as DatasetReviews from '../../DatasetReviews/index.ts'
import { html, plainText } from '../../html.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import * as Routes from '../../routes.ts'

export const ReviewPublishedPage = ({ datasetReview }: { datasetReview: DatasetReviews.PublishedReviewDetails }) => {
  return StreamlinePageResponse({
    title: plainText('PREreview published'),
    main: html`
      <div class="panel">
        <h1>PREreview published</h1>

        <div>
          Your DOI
          <div><strong class="doi" translate="no">${datasetReview.doi}</strong></div>
        </div>
      </div>

      <h2>What happens next</h2>

      <p>
        If you reviewed the dataset with others, please get in touch so we can invite them to appear on the review. Our
        email address is
        <a href="mailto:help@prereview.org" target="_blank" rel="noopener noreferrer"
          >help@prereview.org<span class="visually-hidden"> (opens in a new tab)</span></a
        >.
      </p>

      ${datasetReview.persona === 'public'
        ? html`
            <h2>Share your review</h2>

            <p>
              Please let the authors know that you published your review. They may have contact details on the dataset.
            </p>
          `
        : ''}

      <h2>Let us know how it went</h2>

      <p>
        <a
          href="https://calendar.google.com/calendar/u/0/selfsched?sstoken=UUw4R0F6MVo1ZWhyfGRlZmF1bHR8ZGM2YTU1OTNhYzNhY2RiN2YzNTBlYTdmZTBmMzNmNDA"
          target="_blank"
          rel="noopener noreferrer"
          >Schedule an interview<span class="visually-hidden"> (opens in a new tab)</span></a
        >
        with our product team to discuss your experience on PREreview. We gladly compensate interviewees in appreciation
        for their help!
      </p>

      <p>
        You can also share your feedback about PREreview.org with us by completing a
        <a
          href="https://docs.google.com/forms/d/e/1FAIpQLSfynZ25_toGP6pnTrEyKE-Fv-7z7pK2h9AlNksKI9_DVJMnng/viewform"
          target="_blank"
          rel="noopener noreferrer"
          >brief anonymous survey<span class="visually-hidden"> (opens in a new tab)</span></a
        >.
      </p>

      <a href="${Routes.DatasetReview.href({ datasetReviewId: datasetReview.id })}" class="button">See your review</a>
    `,
    canonical: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId: datasetReview.id }),
  })
}
