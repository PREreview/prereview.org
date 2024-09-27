import { format } from 'fp-ts-routing'
import rtlDetect from 'rtl-detect'
import { html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import type { Prereview } from '../../Prereview.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'

export const CarryOnPage = ({
  feedbackId,
  prereview,
  locale,
}: {
  feedbackId: Uuid.Uuid
  prereview: Prereview
  locale: SupportedLocale
}) =>
  StreamlinePageResponse({
    title: plainText(translate(locale, 'write-feedback-flow', 'writeFeedbackTitle')()),
    nav: html`
      <a href="${format(Routes.reviewMatch.formatter, { id: prereview.id })}" class="back"
        >${translate(locale, 'write-feedback-flow', 'backToPrereview')()}</a
      >
    `,
    main: html`
      <h1>${translate(locale, 'write-feedback-flow', 'writeFeedbackTitle')()}</h1>

      <p>
        ${rawHtml(
          translate(
            locale,
            'write-feedback-flow',
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

      <a href="${Routes.WriteFeedbackEnterFeedback.href({ feedbackId })}" role="button" draggable="false"
        >${translate(locale, 'write-feedback-flow', 'continueButton')()}</a
      >
    `,
    canonical: Routes.WriteFeedbackStartNow.href({ id: prereview.id }),
  })
