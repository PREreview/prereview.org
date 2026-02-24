import { Array, Effect, Option, pipe } from 'effect'
import iso6391, { type LanguageCode } from 'iso-639-1'
import { DetectLanguage } from '../../ExternalApis/index.ts'
import { type Html, plainText, type PlainText } from '../../html.ts'
import { UnableToDetectLanguage } from './Errors.ts'

export const detectLanguage = (text: Html | PlainText | string) =>
  pipe(
    DetectLanguage.detect(plainText`${text}`.toString()),
    Effect.andThen(Array.findFirst(candidate => Option.liftPredicate(candidate.language, iso6391.validate))),
    Effect.catchAll(error => new UnableToDetectLanguage({ cause: error })),
    Effect.withSpan('LanguageDetection.detectLanguage'),
  )

export const detectLanguageFrom = <L extends LanguageCode>(
  languages: ReadonlyArray<L>,
  text: Html | PlainText | string,
) =>
  pipe(
    DetectLanguage.detect(plainText`${text}`.toString()),
    Effect.andThen(
      Array.findFirst(candidate =>
        Option.liftPredicate(candidate.language as L, code => Array.contains(languages, code)),
      ),
    ),
    Effect.catchAll(error => new UnableToDetectLanguage({ cause: error })),
    Effect.withSpan('LanguageDetection.detectLanguage'),
  )
