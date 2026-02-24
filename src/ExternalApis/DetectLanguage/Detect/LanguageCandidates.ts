import { Schema } from 'effect'

export const LanguageCandidates = Schema.Array(
  Schema.Struct({
    language: Schema.NonEmptyTrimmedString,
    score: Schema.Number,
  }),
)
