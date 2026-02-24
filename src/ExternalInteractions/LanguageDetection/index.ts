import { Context, Effect, Layer } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { Html, PlainText } from '../../html.ts'
import * as Cld from './Cld.ts'
import type { UnableToDetectLanguage } from './Errors.ts'

export * from './Errors.ts'

export class LanguageDetection extends Context.Tag('LanguageDetection')<
  LanguageDetection,
  {
    detectLanguage: (
      text: Html | PlainText | string,
      hint?: LanguageCode,
    ) => Effect.Effect<LanguageCode, UnableToDetectLanguage>
    detectLanguageFrom: <L extends LanguageCode>(
      languages: ReadonlyArray<L>,
      text: Html | PlainText | string,
      hint?: LanguageCode,
    ) => Effect.Effect<L, UnableToDetectLanguage>
  }
>() {}

export const { detectLanguage } = Effect.serviceFunctions(LanguageDetection)

export const detectLanguageFrom = Effect.fnUntraced(function* <L extends LanguageCode>(
  languages: ReadonlyArray<L>,
  text: Html | PlainText | string,
  hint?: LanguageCode,
) {
  const languageDetection = yield* LanguageDetection

  return yield* languageDetection.detectLanguageFrom(languages, text, hint)
})

export const layerCld = Layer.succeed(LanguageDetection, {
  detectLanguage: Cld.detectLanguage,
  detectLanguageFrom: (languages, text, hint) => Cld.detectLanguageFrom(...languages)(text, hint),
})
