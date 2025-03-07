import { String } from 'effect'
import { type Html, html } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'

export const prereviewOfSuffix = (locale: SupportedLocale, preprintTitle: Html): ((s: string) => string) =>
  String.concat(` – ${translate(locale)('write-review', 'prereviewOf')({ preprintTitle: preprintTitle.toString() })}`)

export const backNav = (locale: SupportedLocale, href: string) =>
  html`<a href="${href}" class="back"><span>${translate(locale, 'write-review', 'backNav')()}</span></a>`
