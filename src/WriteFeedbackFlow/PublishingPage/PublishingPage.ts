import { html, plainText } from '../../html.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'

export const PublishingPage = ({ feedbackId }: { feedbackId: Uuid.Uuid }) =>
  StreamlinePageResponse({
    title: plainText`We’re publishing your feedback`,
    main: html`
      <h1>We’re publishing your feedback</h1>

      <p>You’ll be able to see your feedback shortly.</p>
    `,
    canonical: Routes.WriteFeedbackPublishing.href({ feedbackId }),
  })
