import { pipe } from 'effect'
import { html, type Html } from './html.js'
import { type SupportedLocale, translate } from './locales/index.js'

export const errorPrefix = (locale: SupportedLocale, error: boolean) => (s: string) =>
  pipe(error ? translate(locale, 'forms', 'errorPrefix')() : '', prefix => `${prefix}: ${s}`)

export const errorSummary = (locale: SupportedLocale) => (errorItems: Html) => html`
  <error-summary aria-labelledby="error-summary-title" role="alert">
    <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
    <ul>
      ${errorItems}
    </ul>
  </error-summary>
`
export const saveAndContinueButton = (locale: SupportedLocale) =>
  html`<button>${translate(locale, 'forms', 'saveContinueButton')()}</button>`
