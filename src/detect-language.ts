import cld from 'cld'
import { Array, Effect, Option } from 'effect'
import iso6391, { type LanguageCode } from 'iso-639-1'
import { type Html, PlainText } from './html.ts'

export const detectLanguage = Effect.fn(function* (
  text: Html | PlainText | string,
): Effect.fn.Return<Option.Option<LanguageCode>> {
  const result = yield* Effect.option(
    Effect.tryPromise(() =>
      cld.detect(text.toString(), {
        bestEffort: true,
        isHTML: !(text instanceof PlainText),
      }),
    ),
  )

  return Option.andThen(result, result =>
    Array.findFirst(result.languages, detected => Option.liftPredicate(detected.code, iso6391.validate)),
  )
})

export function detectLanguageFrom<L extends LanguageCode>(
  ...languages: ReadonlyArray<L>
): (text: Html | PlainText | string) => Effect.Effect<Option.Option<L>> {
  return Effect.fn(function* (text: Html | PlainText | string): Effect.fn.Return<Option.Option<L>> {
    const result = yield* Effect.option(
      Effect.tryPromise(() =>
        cld.detect(text.toString(), {
          bestEffort: true,
          isHTML: !(text instanceof PlainText),
        }),
      ),
    )

    return Option.andThen(result, result =>
      Array.findFirst(result.languages, detected =>
        Option.liftPredicate(detected.code as L, code => Array.contains(languages, code)),
      ),
    )
  })
}
