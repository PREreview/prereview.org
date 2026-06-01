import { html, plainText } from '../../../html.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'

export const renderPublishedPage = ({ invitationId, reviewId }: { invitationId: Uuid.Uuid; reviewId: Uuid.Uuid }) => {
  return StreamlinePageResponse({
    title: plainText('Check your details'),
    main: html`
      <div class="panel">
        <h1>Name added</h1>
      </div>

      <h2>What happens next</h2>

      <p>You’ll be able to see your name on the PREreview shortly.</p>

      <p>
        You can close this window, or
        <a href="${Routes.DatasetReview.href({ datasetReviewId: reviewId })}">see the PREreview</a>.
      </p>
    `,
    canonical: Routes.AuthorInvitePublished.href({ invitationId }),
  })
}
