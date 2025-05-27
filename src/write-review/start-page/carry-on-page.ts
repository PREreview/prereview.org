import { format } from 'fp-ts-routing'
import rtlDetect from 'rtl-detect'
import { html, plainText, rawHtml } from '../../html.js'
import { translate, type SupportedLocale } from '../../locales/index.js'
import type { PreprintTitle } from '../../preprint.js'
import { PageResponse } from '../../response.js'
import { preprintReviewsMatch, writeReviewStartMatch } from '../../routes.js'
import { nextFormMatch, type Form } from '../form.js'

const cite = (lang: PreprintTitle['language']) => (text: string) =>
  `<cite lang="${lang}" dir="${rtlDetect.getLangDir(lang)}">${text}</cite>`

export const carryOnPage = (preprint: PreprintTitle, form: Form, locale: SupportedLocale) => {
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

      <a href="${format(nextFormMatch(form).formatter, { id: preprint.id })}" role="button" draggable="false"
        >${t('forms', 'continueButton')()}</a
      >
    `,
    canonical: format(writeReviewStartMatch.formatter, { id: preprint.id }),
  })
}
