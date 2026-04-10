import { html, plainText } from '../../html.ts'
import * as Routes from '../../routes.ts'
import { PageResponse } from '../Response/index.ts'

export const NoReviewRequestsPage = () => {
  return PageResponse({
    title: plainText`My review requests`,
    main: html`
      <h1>My review requests</h1>

      <div class="inset">
        <p>You haven’t requested a review yet.</p>

        <p>When you do, it’ll appear here.</p>
      </div>

      <a href="${Routes.RequestAReview}" class="button">Request a review</a>
    `,
    canonical: Routes.MyReviewRequests,
    current: 'my-review-requests',
  })
}
