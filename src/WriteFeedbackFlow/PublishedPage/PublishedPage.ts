import type * as Doi from 'doi-ts'
import { format } from 'fp-ts-routing'
import { html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'

export const PublishedPage = ({
  feedbackId,
  doi,
  locale,
  prereviewId,
}: {
  feedbackId: Uuid.Uuid
  doi: Doi.Doi
  locale: SupportedLocale
  prereviewId: number
}) =>
  StreamlinePageResponse({
    title: plainText(translate(locale, 'write-feedback-flow', 'publishedTitle')()),
    main: html`
      <div class="panel">
        <h1>${translate(locale, 'write-feedback-flow', 'publishedTitle')()}</h1>

        <div>
          ${rawHtml(
            translate(
              locale,
              'write-feedback-flow',
              'publishedYourDoi',
            )({ doi: html`<div><strong class="doi" translate="no">${doi}</strong></div>`.toString() }),
          )}
        </div>
      </div>

      <h2>${translate(locale, 'write-feedback-flow', 'publishedHappensNextHeading')()}</h2>

      <p>${translate(locale, 'write-feedback-flow', 'publishedSeeShortlyMessage')()}</p>

      <a href="${format(Routes.reviewMatch.formatter, { id: prereviewId })}" class="button"
        >${translate(locale, 'write-feedback-flow', 'backToPrereview')()}</a
      >
    `,
    canonical: Routes.WriteFeedbackPublished.href({ feedbackId }),
  })
