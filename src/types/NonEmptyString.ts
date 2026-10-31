import { type Brand, Result, Option, pipe, Schema } from 'effect'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import { EffectToFpts } from '../RefactoringUtilities/index.ts'

export type NonEmptyString = string & Brand.Brand<'NonEmptyString'>

export const NonEmptyStringC = C.fromDecoder(
  pipe(
    D.string,
    D.parse(s => EffectToFpts.either(Result.fromOption(fromString(s), () => D.error(s, 'NonEmptyString')))),
  ),
)

export const NonEmptyStringSchema = pipe(
  Schema.String,
  Schema.refine(isNonEmptyString, { message: 'string is empty' }),
  Schema.brand('NonEmptyString'),
)

export function isNonEmptyString(value: string): value is NonEmptyString {
  return value.trim().length > 0
}

export const NonEmptyString = (nonEmptyString: string) => NonEmptyStringSchema.make(nonEmptyString)

export const fromString: (string: string) => Option.Option<NonEmptyString> = Option.liftThrowable(NonEmptyString)
