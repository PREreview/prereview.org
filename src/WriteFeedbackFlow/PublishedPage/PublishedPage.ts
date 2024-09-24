import type * as Doi from 'doi-ts'
import { format } from 'fp-ts-routing'
import { html, plainText } from '../../html.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'

export const PublishedPage = ({
  feedbackId,
  doi,
  prereviewId,
}: {
  feedbackId: Uuid.Uuid
  doi: Doi.Doi
  prereviewId: number
}) =>
  StreamlinePageResponse({
    title: plainText`Feedback published`,
    main: html`
      <div class="panel">
        <h1>Feedback published</h1>

        <div>
          Your DOI<br />
          <strong class="doi" translate="no">${doi}</strong>
        </div>
      </div>

      <h2>What happens next</h2>

      <p>You’ll be able to see your feedback shortly.</p>

      <a href="${format(Routes.reviewMatch.formatter, { id: prereviewId })}" class="button">Back to PREreview</a>
    `,
    canonical: Routes.WriteFeedbackPublished.href({ feedbackId }),
  })
