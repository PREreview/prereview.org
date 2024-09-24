import { format } from 'fp-ts-routing'
import { html, plainText } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'

export const EnterFeedbackPage = ({
  feedbackId,
  locale,
  prereviewId,
}: {
  feedbackId: Uuid.Uuid
  locale: SupportedLocale
  prereviewId: number
}) =>
  StreamlinePageResponse({
    title: plainText`Write your feedback`,
    nav: html`
      <a href="${format(Routes.reviewMatch.formatter, { id: prereviewId })}" class="back"
        >${translate(locale, 'write-feedback-flow', 'backToPrereview')()}</a
      >
    `,
    main: html`
      <form method="post" action="${Routes.WriteFeedbackEnterFeedback.href({ feedbackId })}" novalidate>
        <div>
          <h1><label id="feedback-label" for="feedback">Write your feedback</label></h1>

          <html-editor>
            <textarea id="feedback" name="feedback" rows="20"></textarea>
          </html-editor>
        </div>

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: Routes.WriteFeedbackEnterFeedback.href({ feedbackId }),
    js: ['html-editor.js', 'editor-toolbar.js'],
  })
