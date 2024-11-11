import { format } from 'fp-ts-routing'
import rtlDetect from 'rtl-detect'
import { html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import type { Prereview } from '../../Prereview.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'

export const CarryOnPage = ({
  commentId,
  nextPage,
  prereview,
  locale,
}: {
  commentId: Uuid.Uuid
  nextPage: Routes.Route<{ commentId: Uuid.Uuid }>
  prereview: Prereview
  locale: SupportedLocale
}) =>
  StreamlinePageResponse({
    title: plainText(translate(locale, 'write-comment-flow', 'writeCommentTitle')()),
    nav: html`
      <a href="${format(Routes.reviewMatch.formatter, { id: prereview.id })}" class="back"
        >${translate(locale, 'write-comment-flow', 'backToPrereview')()}</a
      >
    `,
    main: html`
      <h1>${translate(locale, 'write-comment-flow', 'writeCommentTitle')()}</h1>

      <p>
        ${rawHtml(
          translate(
            locale,
            'write-comment-flow',
            'carryOnMessage',
          )({
            preprint: html`<cite
              lang="${prereview.preprint.language}"
              dir="${rtlDetect.getLangDir(prereview.preprint.language)}"
              >${prereview.preprint.title}</cite
            >`.toString(),
          }),
        )}
      </p>

      <a href="${nextPage.href({ commentId })}" role="button" draggable="false"
        >${translate(locale, 'write-comment-flow', 'continueButton')()}</a
      >
    `,
    canonical: Routes.WriteCommentStartNow.href({ id: prereview.id }),
  })
