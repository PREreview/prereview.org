import { format } from 'fp-ts-routing'
import { html, plainText } from '../../../html.ts'
import { languageAttributesFor } from '../../../Locales.ts'
import { type SupportedLocale, translate } from '../../../locales/index.ts'
import type { Prereview } from '../../../Prereviews/index.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/index.ts'
import { PageResponse } from '../../Response/index.ts'

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
  PageResponse({
    title: plainText(translate(locale, 'write-comment-flow', 'writeCommentTitle')()),
    nav: html`
      <a href="${format(Routes.reviewMatch.formatter, { id: prereview.id })}" class="back"
        >${translate(locale, 'write-comment-flow', 'backToPrereview')()}</a
      >
    `,
    main: html`
      <h1>${translate(locale, 'write-comment-flow', 'writeCommentTitle')()}</h1>

      <p>
        ${translate(
          locale,
          'write-comment-flow',
          'carryOnMessage',
        )({
          preprint: html`<cite ${languageAttributesFor(prereview.preprint.language)}
            >${prereview.preprint.title}</cite
          >`,
        })}
      </p>

      <a href="${nextPage.href({ commentId })}" role="button" draggable="false"
        >${translate(locale, 'forms', 'continueButton')()}</a
      >
    `,
    canonical: Routes.WriteCommentStartNow.href({ id: prereview.id }),
  })
