import { Context, Effect, flow, Layer, Scope } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { DetectLanguage as DetectLanguageApi } from '../../ExternalApis/index.ts'
import type { Html, PlainText } from '../../html.ts'
import * as Cld from './Cld.ts'
import * as DetectLanguage from './DetectLanguage.ts'
import type { UnableToDetectLanguage } from './Errors.ts'

export * from './Errors.ts'

export class LanguageDetection extends Context.Tag('LanguageDetection')<
  LanguageDetection,
  {
    detectLanguage: (
      text: Html | PlainText | string,
      hint?: LanguageCode,
    ) => Effect.Effect<LanguageCode, UnableToDetectLanguage>
    detectLanguageFrom: (
      languages: ReadonlyArray<LanguageCode>,
      text: Html | PlainText | string,
      hint?: LanguageCode,
    ) => Effect.Effect<LanguageCode, UnableToDetectLanguage>
  }
>() {}

export const { detectLanguage, detectLanguageFrom } = Effect.serviceFunctions(LanguageDetection)

export const layerDetectLanguage = Layer.effect(
  LanguageDetection,
  Effect.gen(function* () {
    const context = yield* Effect.andThen(Effect.context<DetectLanguageApi.DetectLanguage>(), Context.omit(Scope.Scope))

    return {
      detectLanguage: flow(DetectLanguage.detectLanguage, Effect.provide(context)),
      detectLanguageFrom: flow(DetectLanguage.detectLanguageFrom, Effect.provide(context)),
    }
  }),
)

export const layerCld = Layer.succeed(LanguageDetection, {
  detectLanguage: Cld.detectLanguage,
  detectLanguageFrom: (languages, text, hint) => Cld.detectLanguageFrom(...languages)(text, hint),
})
