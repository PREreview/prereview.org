import { pipe, String } from 'effect'
import { type Html, html } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'

export const prereviewOfSuffix = (locale: SupportedLocale, preprintTitle: Html): ((s: string) => string) =>
  String.concat(` – ${translate(locale)('write-review', 'prereviewOf')({ preprintTitle: preprintTitle.toString() })}`)

export const errorPrefix = (locale: SupportedLocale, error: boolean) => (s: string) =>
  pipe(error ? translate(locale)('write-review', 'errorPrefix')() : '', prefix => `${prefix}${s}`)

export const backNav = (locale: SupportedLocale, href: string) =>
  html`<a href="${href}" class="back"><span>${translate(locale, 'write-review', 'backNav')()}</span></a>`

export const errorSummary = (locale: SupportedLocale) => (errorItems: Html) => html`
  <error-summary aria-labelledby="error-summary-title" role="alert">
    <h2 id="error-summary-title">${translate(locale, 'write-review', 'errorSummaryTitle')()}</h2>
    <ul>
      ${errorItems}
    </ul>
  </error-summary>
`

export const saveAndContinueButton = (locale: SupportedLocale) =>
  html`<button>${translate(locale, 'write-review', 'saveAndContinue')()}</button>`
