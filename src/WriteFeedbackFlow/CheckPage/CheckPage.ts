import { fixHeadingLevels, type Html, html, plainText } from '../../html.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'

export const CheckPage = ({ feedback, feedbackId }: { feedback: Html; feedbackId: Uuid.Uuid }) =>
  StreamlinePageResponse({
    title: plainText`Check your feedback`,
    nav: html` <a href="${Routes.WriteFeedbackEnterFeedback.href({ feedbackId })}" class="back">Back</a>`,
    main: html`
      <single-use-form>
        <form method="post" action="${Routes.WriteFeedbackCheck.href({ feedbackId })}" novalidate>
          <h1>Check your feedback</h1>

          <div class="summary-card">
            <div>
              <h2 id="feedback-label">Your feedback</h2>

              <a href="${Routes.WriteFeedbackEnterFeedback.href({ feedbackId })}"
                >Change <span class="visually-hidden">feedback</span></a
              >
            </div>

            <div aria-labelledby="feedback-label" role="region" tabindex="0">${fixHeadingLevels(2, feedback)}</div>
          </div>

          <h2>Now publish your feedback</h2>

          <p>
            We will assign your feedback a DOI (a permanent identifier) and make it publicly available under a
            <a href="https://creativecommons.org/licenses/by/4.0/">CC&nbsp;BY&nbsp;4.0 license</a>.
          </p>

          <button>Publish feedback</button>
        </form>
      </single-use-form>
    `,
    canonical: Routes.WriteFeedbackCheck.href({ feedbackId }),
    skipToLabel: 'form',
    js: ['single-use-form.js'],
  })
