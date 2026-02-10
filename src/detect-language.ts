import { Array, Effect, flow, Option, pipe } from 'effect'
import iso6391, { type LanguageCode } from 'iso-639-1'
import { detect, detectAll } from 'tinyld/heavy'
import { type Html, PlainText, plainText } from './html.ts'

export function detectLanguage(text: Html | PlainText | string): Effect.Effect<Option.Option<LanguageCode>> {
  return pipe(
    detectAll(text instanceof PlainText ? text.toString() : plainText(text).toString()),
    Array.findFirst(({ lang }) => Option.liftPredicate(lang, iso6391.validate)),
    Effect.succeed,
  )
}

export function detectLanguageFrom<L extends LanguageCode>(
  ...languages: ReadonlyArray<L>
): (text: Html | PlainText | string) => Effect.Effect<Option.Option<L>> {
  return flow(
    text =>
      detect(text instanceof PlainText ? text.toString() : plainText(text).toString(), { only: [...languages] }) as L,
    Option.liftPredicate(detected => Array.contains(languages, detected)),
    Effect.succeed,
  )
}
