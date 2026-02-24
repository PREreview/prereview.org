import { Context, Effect, Layer, type Option } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { Html, PlainText } from '../../html.ts'
import * as Cld from './Cld.ts'

export class LanguageDetection extends Context.Tag('LanguageDetection')<
  LanguageDetection,
  {
    detectLanguage: (text: Html | PlainText | string, hint?: LanguageCode) => Effect.Effect<Option.Option<LanguageCode>>
    detectLanguageFrom: <L extends LanguageCode>(
      ...languages: ReadonlyArray<L>
    ) => (text: Html | PlainText | string, hint?: LanguageCode) => Effect.Effect<Option.Option<L>>
  }
>() {}

export const { detectLanguage } = Effect.serviceFunctions(LanguageDetection)

export const detectLanguageFrom = <L extends LanguageCode>(...languages: ReadonlyArray<L>) =>
  Effect.fnUntraced(function* (text: Html | PlainText | string, hint?: LanguageCode) {
    const languageDetection = yield* LanguageDetection

    return yield* languageDetection.detectLanguageFrom(...languages)(text, hint)
  })

export const layerCld = Layer.succeed(LanguageDetection, {
  detectLanguage: Cld.detectLanguage,
  detectLanguageFrom: Cld.detectLanguageFrom,
})
