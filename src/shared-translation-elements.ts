import { Boolean } from 'effect'
import { html, type Html } from './html.ts'
import { type SupportedLocale, translate } from './locales/index.ts'

export const errorPrefix = (locale: SupportedLocale, error: boolean) => (s: string) =>
  Boolean.match(error, {
    onTrue: () => `${translate(locale, 'forms', 'errorPrefix')()}: ${s}`,
    onFalse: () => s,
  })

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
