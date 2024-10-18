import { pipe } from 'effect'
import { type Html, html } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'

export const errorPrefix = (locale: SupportedLocale, error: boolean) => (s: string) =>
  pipe(error ? translate(locale)('write-review-shared', 'errorPrefix')() : '', prefix => `${prefix}${s}`)

export const backNav = (locale: SupportedLocale, href: string) =>
  html`<a href="${href}" class="back">${translate(locale)('write-review-shared', 'backNav')()}</a>`

export const errorSummary = (locale: SupportedLocale) => (errorItems: Html) => html`
  <error-summary aria-labelledby="error-summary-title" role="alert">
    <h2 id="error-summary-title">${translate(locale)('write-review-shared', 'errorSummaryTitle')()}</h2>
    <ul>
      ${errorItems}
    </ul>
  </error-summary>
`

export const saveAndContinueButton = (locale: SupportedLocale) =>
  html`<button>${translate(locale, 'add-author-form', 'saveAndContinue')()}</button>`
