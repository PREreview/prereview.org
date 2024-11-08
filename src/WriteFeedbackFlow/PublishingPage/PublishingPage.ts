import { html, plainText } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'

export const PublishingPage = ({ feedbackId, locale }: { feedbackId: Uuid.Uuid; locale: SupportedLocale }) =>
  StreamlinePageResponse({
    title: plainText(translate(locale, 'write-comment-flow', 'publishingTitle')()),
    main: html`
      <h1>${translate(locale, 'write-comment-flow', 'publishingTitle')()}</h1>

      <poll-redirect>
        <div>
          <p>${translate(locale, 'write-comment-flow', 'publishingSeeShortlyMessage')()}</p>

          <a href="${Routes.WriteFeedbackPublishing.href({ feedbackId })}" class="button"
            >${translate(locale, 'write-comment-flow', 'reloadPageButton')()}</a
          >
        </div>

        <div hidden class="loading">
          <p>${translate(locale, 'write-comment-flow', 'publishingSeeShortlyMessage')()}</p>
        </div>

        <div hidden>
          <a href="${Routes.WriteFeedbackPublished.href({ feedbackId })}" class="button"
            >${translate(locale, 'write-comment-flow', 'continueButton')()}</a
          >
        </div>
      </poll-redirect>
    `,
    canonical: Routes.WriteFeedbackPublishing.href({ feedbackId }),
    js: ['poll-redirect.js'],
  })
