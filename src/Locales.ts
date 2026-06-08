import { html } from './html.ts'

export const languageAttributesFor = (locale: string) =>
  html`lang="${locale}" dir="${new Intl.Locale(locale).getTextInfo().direction}"`
