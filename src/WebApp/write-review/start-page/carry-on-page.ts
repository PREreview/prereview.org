import { format } from 'fp-ts-routing'
import rtlDetect from 'rtl-detect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import type { PreprintTitle } from '../../../Preprints/index.ts'
import { preprintReviewsMatch, writeReviewStartMatch } from '../../../routes.ts'
import { PageResponse } from '../../Response/index.ts'
import { nextFormMatch, type Form } from '../form.ts'

const cite = (lang: PreprintTitle['language']) => (text: string) =>
  `<cite lang="${lang}" dir="${rtlDetect.getLangDir(lang)}">${text}</cite>`

export const carryOnPage = (preprint: PreprintTitle, form: Form, locale: SupportedLocale, askAiReviewEarly = false) => {
  const t = translate(locale)
  return PageResponse({
    title: plainText`${t('write-review', 'writeAPrereview')()}`,
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="back"
        ><span>${t('write-review', 'backToPreprint')()}</span></a
      >
    `,
    main: html`
      <h1>${t('write-review', 'writeAPrereview')()}</h1>

      <p>
        ${rawHtml(
          t(
            'write-review',
            'asYouHaveAlreadyStarted',
          )({ preprintTitle: preprint.title.toString(), cite: cite(preprint.language) }),
        )}
      </p>

      <a
        href="${format(nextFormMatch(form, askAiReviewEarly).formatter, { id: preprint.id })}"
        role="button"
        draggable="false"
        >${t('forms', 'continueButton')()}</a
      >
    `,
    canonical: format(writeReviewStartMatch.formatter, { id: preprint.id }),
  })
}
