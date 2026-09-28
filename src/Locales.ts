import { html } from './html.ts'

export const languageAttributesFor = (locale: string) =>
  html`lang="${locale}" dir="${new Intl.Locale(locale).getTextInfo().direction}"`

export const getDirectionMarkFor = (locale: string) => {
  const intlLocale = new Intl.Locale(locale).maximize()

  if (intlLocale.script === 'Arab') {
    return '\u061c'
  }

  if (intlLocale.getTextInfo().direction === 'ltr') {
    return '\u200e'
  }

  return '\u200f'
}
