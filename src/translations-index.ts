import * as O from 'fp-ts/Option'
import * as R from 'fp-ts/Record'
import { pipe } from 'fp-ts/function'
import { type Html, rawHtml } from './html'
import * as en from './translations/en'
import * as es from './translations/es'

export const translations = {
  en,
  es,
}

export type SupportedLang = keyof typeof translations

type TranslatedStringKey = keyof typeof en

export const translate =
  <K extends TranslatedStringKey, A extends Parameters<(typeof en)[K]>>(lang: SupportedLang) =>
  (key: K, args: A = []): Html =>
    pipe(
      translations[lang],
      R.lookup(key),
      O.match(
        () => en[key](...args),
        f => f(...args),
      ),
      rawHtml,
    )

export type Translate = ReturnType<typeof translate>
