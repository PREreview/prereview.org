import { type Html, html } from '../../html.ts'
import { type SupportedLocale, translate } from '../../locales/index.ts'

export const prereviewOfSuffix =
  (locale: SupportedLocale, preprintTitle: Html) =>
  (s: Html | string): Html =>
    html`${s} – ${translate(locale)('write-review', 'prereviewOf')({ preprintTitle: preprintTitle.toString() })}`

export const backNav = (locale: SupportedLocale, href: string) =>
  html`<a href="${href}" class="back"><span>${translate(locale, 'forms', 'backLink')()}</span></a>`
