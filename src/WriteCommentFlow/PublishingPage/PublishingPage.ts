import { html, plainText } from '../../html.ts'
import { type SupportedLocale, translate } from '../../locales/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import * as Routes from '../../routes.ts'
import type { Uuid } from '../../types/index.ts'

export const PublishingPage = ({ commentId, locale }: { commentId: Uuid.Uuid; locale: SupportedLocale }) =>
  StreamlinePageResponse({
    title: plainText(translate(locale, 'write-comment-flow', 'publishingTitle')()),
    main: html`
      <h1>${translate(locale, 'write-comment-flow', 'publishingTitle')()}</h1>

      <poll-redirect>
        <div>
          <p>${translate(locale, 'write-comment-flow', 'publishingSeeShortlyMessage')()}</p>

          <a href="${Routes.WriteCommentPublishing.href({ commentId })}" class="button"
            >${translate(locale, 'write-comment-flow', 'reloadPageButton')()}</a
          >
        </div>

        <div hidden class="loading">
          <p>${translate(locale, 'write-comment-flow', 'publishingSeeShortlyMessage')()}</p>
        </div>

        <div hidden>
          <a href="${Routes.WriteCommentPublished.href({ commentId })}" class="button"
            >${translate(locale, 'forms', 'continueButton')()}</a
          >
        </div>
      </poll-redirect>
    `,
    canonical: Routes.WriteCommentPublishing.href({ commentId }),
    js: ['poll-redirect.js'],
  })
