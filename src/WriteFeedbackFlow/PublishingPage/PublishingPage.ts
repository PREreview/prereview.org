import { html, plainText } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'

export const PublishingPage = ({ feedbackId, locale }: { feedbackId: Uuid.Uuid; locale: SupportedLocale }) =>
  StreamlinePageResponse({
    title: plainText(translate(locale, 'write-feedback-flow', 'publishingTitle')()),
    head: html`<meta http-equiv="refresh" content="2" />`,
    main: html`
      <h1>${translate(locale, 'write-feedback-flow', 'publishingTitle')()}</h1>

      <p>${translate(locale, 'write-feedback-flow', 'publishingSeeShortlyMessage')()}</p>
    `,
    canonical: Routes.WriteFeedbackPublishing.href({ feedbackId }),
  })
